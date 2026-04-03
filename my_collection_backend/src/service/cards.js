import { Router } from "express";
import { pool } from "../utils/db.js";
import { fetchPsaLookupAndImages } from "../utils/psaClient.js";

const router = Router();

/**
 * @openapi
 * /api/cards:
 *   get:
 *     summary: 카드 목록 조회
 *     tags:
 *       - Cards
 *     responses:
 *       200:
 *         description: 카드 리스트를 반환합니다.
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, subject, year, set_name AS "setName", card_number AS "cardNumber",
              variety, category, grade, grader, cert_number AS "certNumber",
              image_url AS "imageUrl", current_price AS "currentPrice",
              certification_type AS "certificationType",
              is_hologram AS "isHologram",
              is_reverse_barcode AS "isReverseBarcode",
              psa_cert AS "psaCert",
              psa_population AS "psaPopulation",
              psa_images AS "psaImages"
       FROM cards
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/cards error", err);
    res.status(500).json({ error: "failed_to_fetch_cards" });
  }
});

/**
 * @openapi
 * /api/cards:
 *   post:
 *     summary: 새 카드 등록
 *     tags:
 *       - Cards
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               year:
 *                 type: string
 *               setName:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               variety:
 *                 type: string
 *               category:
 *                 type: string
 *               grade:
 *                 type: string
 *               grader:
 *                 type: string
 *               certNumber:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: 생성된 카드의 id를 반환합니다.
 */
router.post("/", async (req, res) => {
  const {
    subject,
    year,
    setName,
    cardNumber,
    variety,
    category,
    grade,
    grader,
    certNumber,
    imageUrl,
    certificationType,
    isHologram,
    isReverseBarcode,
    psaCert,
    psaPopulation,
    psaImages,
    dnaCert,
  } = req.body || {};

  if (!subject || !year || !setName || !cardNumber) {
    return res.status(400).json({ error: "missing_required_fields" });
  }

  const toJsonb = (v) =>
    v === undefined || v === null ? null : JSON.stringify(v);

  try {
    const normalizedPsaImages =
      Array.isArray(psaImages) ? psaImages : psaImages ? [psaImages] : null;
    const frontImageFromPsa =
      normalizedPsaImages?.find?.((x) => x && x.IsFrontImage)?.ImageURL || null;
    const finalImageUrl = imageUrl || frontImageFromPsa || null;

    const result = await pool.query(
      `INSERT INTO cards
       (subject, year, set_name, card_number, variety, category, grade, grader, cert_number, image_url,
        certification_type, is_hologram, is_reverse_barcode, psa_cert, psa_population, psa_images, dna_cert)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               $11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb)
       RETURNING id`,
      [
        subject,
        year,
        setName,
        cardNumber,
        variety || null,
        category || null,
        grade || null,
        grader || null,
        certNumber || null,
        finalImageUrl,
        certificationType || null,
        isHologram || null,
        isReverseBarcode || null,
        toJsonb(psaCert || null),
        toJsonb(psaPopulation || null),
        toJsonb(normalizedPsaImages),
        toJsonb(dnaCert || null),
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("POST /api/cards error", err);
    res.status(500).json({ error: "failed_to_create_card" });
  }
});

/**
 * @openapi
 * /api/cards/auto:
 *   post:
 *     summary: Cert 번호로 자동 등록(PSA)
 *     tags:
 *       - Cards
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               certNumber:
 *                 type: string
 *                 example: "119219658"
 *               certificationType:
 *                 type: string
 *                 example: "PSA"
 *     responses:
 *       201:
 *         description: 생성된 카드의 id를 반환
 */
router.post("/auto", async (req, res) => {
  const body = req.body || {};
  const certNumber = body.certNumber ?? body.CertNumber;
  const certificationType =
    body.certificationType ?? body.CertificationType ?? "PSA";
  const psaToken = process.env.PSA_TOKEN ?? null;

  if (!certNumber) {
    return res.status(400).json({ error: "missing_certNumber" });
  }
  if (!psaToken) {
    return res.status(500).json({ error: "psa_token_not_configured" });
  }
  if (String(certificationType).toUpperCase() !== "PSA") {
    return res.status(400).json({ error: "only_psa_supported" });
  }

  try {
    const { psaLookup, psaImages } =
      await fetchPsaLookupAndImages(certNumber, psaToken);

    const psaCert = psaLookup.PSACert || {};
    const psaPopulation = psaLookup.PSAPopulation || null;

    const normalizedPsaImages = Array.isArray(psaImages)
      ? psaImages
      : psaImages
      ? [psaImages]
      : null;
    const frontImageFromPsa =
      normalizedPsaImages?.find?.((x) => x && x.IsFrontImage)?.ImageURL || null;

    const toJsonb = (v) =>
      v === undefined || v === null ? null : JSON.stringify(v);

    const result = await pool.query(
      `INSERT INTO cards
       (subject, year, set_name, card_number, variety, category, grade, grader, cert_number, image_url,
        certification_type, is_hologram, is_reverse_barcode, psa_cert, psa_population, psa_images, dna_cert)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               $11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb)
       RETURNING id`,
      [
        psaCert.Subject || "UNKNOWN",
        psaCert.Year || "0000",
        psaCert.SetName || "UNKNOWN",
        psaCert.CardNumber || "UNKNOWN",
        psaCert.Variety || null,
        psaCert.Category || null,
        psaCert.GradeDescription || psaCert.Grade || null,
        "PSA",
        String(certNumber),
        frontImageFromPsa,
        psaLookup.CertificationType || "PSA",
        psaLookup.IsHologram ?? null,
        psaLookup.IsReverseBarcode ?? null,
        toJsonb(psaCert || null),
        toJsonb(psaPopulation),
        toJsonb(normalizedPsaImages),
        toJsonb(psaLookup.DNACert ?? null),
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("POST /api/cards/auto error", err);
    res.status(500).json({
      error: "failed_to_create_card_auto",
      message: err.message,
    });
  }
});

/**
 * @openapi
 * /api/cards/{id}:
 *   delete:
 *     summary: 카드 삭제
 *     tags:
 *       - Cards
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 삭제할 카드의 ID
 *     responses:
 *       204:
 *         description: 카드가 삭제되었습니다.
 *       404:
 *         description: 카드를 찾을 수 없습니다.
 *       500:
 *         description: 카드 삭제에 실패했습니다.
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "missing_id" });
  }
  try {
    const result = await pool.query(
      "DELETE FROM cards WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "card_not_found" });
    }
    res.status(204).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /api/cards/:id error", err);
    res.status(500).json({ error: "failed_to_delete_card" });
  }
});

export default router;
