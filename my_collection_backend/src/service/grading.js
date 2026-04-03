import { Router } from "express";


const router = Router();

/**
 * @openapi
 * /api/grading/lookup:
 *   post:
 *     summary: Cert 번호로 PSA(등) 그레이딩 정보 조회 (스텁)
 *     tags:
 *       - Grading
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               certificationType:
 *                 type: string
 *                 example: psa
 *               certNumber:
 *                 type: string
 *                 example: "76348771"
 *     responses:
 *       200:
 *         description: PSA Cert/Population 정보를 포함한 샘플 응답을 반환
 */
// POST /api/grading/lookup
// body: { certificationType: 'psa', certNumber: '76348771' }
router.post("/lookup", async (req, res) => {
  const { certificationType, certNumber } = req.body || {};

  if (!certificationType || !certNumber) {
    return res.status(400).json({ error: "missing_certification_params" });
  }

  // TODO: PSA 공식 API 호출하여 certNumber에 해당하는 그레이딩 정보 조회
  const cn = String(certNumber);
  const payload = {
    CertificationType: "PSA",
    IsHologram: "false",
    IsReverseBarcode: "false",
    PSACert: {
      CertNumber: cn,
      Year: "2023",
      Category: "BASEBALL CARDS",
      SetName: "BOWMAN DRAFT",
      CardNumber: "BDC-EX",
      Subject: "SAMPLE",
      Variety: "",
      Grade: "10",
      QualifierCode: "",
      GradeDescription: "GEM MT 10",
    },
    PSAPopulation: {
      TotalPopulation: "0",
      PopulationHigher: "0",
      TotalPopulationWithQualifier: "0",
      T206PopulationAllBacks: "",
      T206PopulationHigherAllBacks: "",
    },
    DNACert: null,
  };
  res.json(payload);
});

export default router;

