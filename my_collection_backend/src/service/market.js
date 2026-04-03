import { Router } from "express";
import { searchEbayPrices } from "../utils/ebayClient.js";

const router = Router();

/**
 * @openapi
 * /api/market/search:
 *   get:
 *     summary: eBay 카드 시세 검색
 *     tags:
 *       - Market
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "Shohei Ohtani 2018 Topps PSA 10"
 *         description: 검색어 (선수명, 세트명, 등급 조합 권장)
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: 결과 수
 *     responses:
 *       200:
 *         description: 검색 결과 및 가격 통계 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     avgPrice:
 *                       type: number
 *                     minPrice:
 *                       type: number
 *                     maxPrice:
 *                       type: number
 *                     medianPrice:
 *                       type: number
 *                 items:
 *                   type: array
 *       400:
 *         description: 검색어(q) 누락
 *       503:
 *         description: eBay API 자격증명 미설정 또는 호출 실패
 */
router.get("/search", async (req, res) => {
  const query       = req.query.q?.trim();
  const limit       = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const sort        = req.query.sort        || "price";
  const buyingOption = req.query.buyingOption || "";
  const minPrice    = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
  const maxPrice    = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
  const condition   = req.query.condition   || "";

  if (!query) {
    return res.status(400).json({ error: "missing_query", message: "q 파라미터가 필요합니다." });
  }

  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return res.status(503).json({ error: "ebay_not_configured", message: "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET 환경변수를 설정해주세요." });
  }

  try {
    const result = await searchEbayPrices(query, limit, { sort, buyingOption, minPrice, maxPrice, condition });
    res.json({ query, ...result });
  } catch (err) {
    console.error("GET /api/market/search error", err.message);
    res.status(502).json({ error: "ebay_api_error", message: err.message });
  }
});

export default router;
