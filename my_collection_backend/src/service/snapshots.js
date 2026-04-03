import { Router } from "express";
import { pool } from "../utils/db.js";
import { runCollection } from "../utils/scheduler.js";

const router = Router();

/**
 * @openapi
 * /api/snapshots/latest:
 *   get:
 *     summary: 전체 카드의 최신 시세 스냅샷 조회
 *     tags:
 *       - Snapshots
 *     responses:
 *       200:
 *         description: 카드별 최신 시세 스냅샷 1건씩 반환
 */
router.get("/latest", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (ms.card_id)
        ms.card_id    AS "cardId",
        ms.avg_price  AS "avgPrice",
        ms.min_price  AS "minPrice",
        ms.max_price  AS "maxPrice",
        ms.median_price AS "medianPrice",
        ms.ebay_count AS "saleCount",
        ms.query,
        ms.fetched_at AS "fetchedAt",
        c.subject,
        c.year,
        c.set_name    AS "setName",
        c.grade,
        c.grader,
        c.image_url   AS "imageUrl"
      FROM market_snapshots ms
      JOIN cards c ON c.id = ms.card_id
      ORDER BY ms.card_id, ms.fetched_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/snapshots/latest error", err);
    res.status(500).json({ error: "failed_to_fetch_snapshots" });
  }
});

/**
 * @openapi
 * /api/snapshots/{cardId}/history:
 *   get:
 *     summary: 특정 카드의 가격 이력 조회 (차트용)
 *     tags:
 *       - Snapshots
 *     parameters:
 *       - name: cardId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: 시간순 시세 이력 반환 (오래된 순)
 */
router.get("/:cardId/history", async (req, res) => {
  const cardId = parseInt(req.params.cardId, 10);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  if (!cardId) return res.status(400).json({ error: "invalid_card_id" });

  try {
    const { rows } = await pool.query(
      `SELECT
         avg_price    AS "avgPrice",
         min_price    AS "minPrice",
         max_price    AS "maxPrice",
         median_price AS "medianPrice",
         ebay_count   AS "saleCount",
         fetched_at   AS "fetchedAt"
       FROM market_snapshots
       WHERE card_id = $1
       ORDER BY fetched_at DESC
       LIMIT $2`,
      [cardId, limit]
    );
    res.json(rows.reverse()); // 오래된 순으로 반환 (차트용)
  } catch (err) {
    console.error(`GET /api/snapshots/${cardId}/history error`, err);
    res.status(500).json({ error: "failed_to_fetch_history" });
  }
});

/**
 * @openapi
 * /api/snapshots/summary:
 *   get:
 *     summary: 전체 포트폴리오 시세 요약 (대시보드용)
 *     tags:
 *       - Snapshots
 *     responses:
 *       200:
 *         description: 총 포트폴리오 가치, 가격 변동 통계 반환
 */
router.get("/summary", async (_req, res) => {
  try {
    // 카드별 최신 스냅샷으로 포트폴리오 합산
    const { rows } = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (card_id)
          card_id, avg_price, fetched_at
        FROM market_snapshots
        ORDER BY card_id, fetched_at DESC
      ),
      prev AS (
        SELECT DISTINCT ON (card_id)
          card_id, avg_price
        FROM market_snapshots
        WHERE fetched_at < NOW() - INTERVAL '6 hours'
        ORDER BY card_id, fetched_at DESC
      )
      SELECT
        COUNT(l.card_id)::int                              AS "snapshotCount",
        COALESCE(SUM(l.avg_price), 0)                     AS "totalMarketValue",
        COALESCE(AVG(l.avg_price), 0)                     AS "avgMarketPrice",
        MAX(l.avg_price)                                   AS "maxMarketPrice",
        MIN(l.fetched_at)                                  AS "oldestSnapshot",
        MAX(l.fetched_at)                                  AS "latestSnapshot",
        COALESCE(
          ROUND(
            (SUM(l.avg_price) - SUM(COALESCE(p.avg_price, l.avg_price)))
            / NULLIF(SUM(COALESCE(p.avg_price, l.avg_price)), 0) * 100,
          2),
        0)                                                 AS "portfolioChangePercent"
      FROM latest l
      LEFT JOIN prev p ON p.card_id = l.card_id
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/snapshots/summary error", err);
    res.status(500).json({ error: "failed_to_fetch_snapshot_summary" });
  }
});

/**
 * @openapi
 * /api/snapshots/run:
 *   post:
 *     summary: 시세 수집 즉시 실행 (수동 트리거)
 *     tags:
 *       - Snapshots
 *     responses:
 *       202:
 *         description: 수집 시작됨 (백그라운드 실행)
 */
router.post("/run", (_req, res) => {
  res.status(202).json({ message: "시세 수집을 시작합니다. 잠시 후 /api/snapshots/latest 를 확인하세요." });
  runCollection().catch((err) => console.error("[manual run] error:", err));
});

export default router;
