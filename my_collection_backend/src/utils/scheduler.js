import { pool } from "./db.js";
import { fetchCardPrice } from "./lotrichClient.js";

/**
 * 카드 1개의 시세를 LotRICH Vault API(Gemini Grounding)로 조회하고
 * market_snapshots에 저장 + cards.current_price 업데이트
 *
 * 카드 이름 조합 규칙:
 *   {year} {set_name} {subject} {grader} {등급숫자} {sport}
 *   예: "2026 Topps All Kings Babe Ruth PSA 9 Baseball"
 */
async function snapshotCard(card) {
  // "BASEBALL CARDS" → "Baseball"
  const sport    = card.category?.replace(/\s*cards?\s*/i, "").trim() || "";
  // "GEM MT 10" → "10", "MINT 9" → "9"
  const gradeNum = card.grade?.match(/\d+$/)?.[0] ?? card.grade;
  const cardName = [card.year, card.set_name, card.card_number, card.variety, card.subject, card.grader, gradeNum, sport]
    .filter(Boolean)
    .join(" ");

  let data;
  try {
    data = await fetchCardPrice(cardName);
  } catch (err) {
    console.error(`[scheduler] LotRICH 조회 실패 card_id=${card.id}: ${err.message}`);
    return;
  }

  if (!data || typeof data !== "object") {
    console.error(`[scheduler] LotRICH 빈 응답 card_id=${card.id}:`, data);
    return;
  }

  const avgPrice  = data.average_price ?? null;
  const minPrice  = data.min_price     ?? null;
  const maxPrice  = data.max_price     ?? null;
  const saleCount = data.sale_count    ?? 0;

  await pool.query(
    `INSERT INTO market_snapshots (card_id, query, ebay_count, avg_price, min_price, max_price, median_price, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      card.id,
      cardName,
      saleCount,
      avgPrice,
      minPrice,
      maxPrice,
      null,                  // median_price: LotRICH 미제공
      JSON.stringify(data),  // trend, confidence, analysis 등 전체 응답 보존
    ]
  );

  if (avgPrice) {
    await pool.query(
      `UPDATE cards SET current_price = $1, updated_at = NOW() WHERE id = $2`,
      [avgPrice, card.id]
    );
  }

  console.log(
    `[scheduler] card_id=${card.id} "${cardName}" → avg $${avgPrice ?? "—"} (${saleCount}건, ${data.confidence ?? "—"} 신뢰도)`
  );
}

/**
 * 전체 카드 순차 수집 (LotRICH API 응답이 5~30초 소요되므로 별도 sleep 최소화)
 */
async function runCollection() {
  console.log("[scheduler] 시세 수집 시작", new Date().toISOString());

  let cards;
  try {
    const { rows } = await pool.query(`SELECT id, subject, year, set_name, card_number, variety, category, grader, grade FROM cards ORDER BY id`);
    cards = rows;
  } catch (err) {
    console.error("[scheduler] DB 조회 실패:", err.message);
    return;
  }

  if (!cards.length) {
    console.log("[scheduler] 등록된 카드 없음, 종료");
    return;
  }

  for (const card of cards) {
    await snapshotCard(card);
  }

  console.log(`[scheduler] 수집 완료 (${cards.length}개)`, new Date().toISOString());
}

/**
 * 수동 즉시 실행 (API에서 호출용)
 */
export { runCollection };
