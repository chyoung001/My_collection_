const LOTRICH_URL =
  "https://lotrichvault.com/api/apps/69bc3752e35a008a8a8b8393/integration-endpoints/Core/InvokeLLM";

const LOTRICH_HEADERS = {
  "Content-Type": "application/json",
  accept: "application/json",
  "x-app-id": "69bc3752e35a008a8a8b8393",
  "x-origin-url": "https://lotrichvault.com/",
};

/**
 * LotRICH Vault API — Gemini Grounding 기반 eBay 완료 거래 시세 조회 (AJAX 버전)
 *
 * @param {string} cardName  - 카드 풀네임 (예: "2026 Topps All Kings Babe Ruth PSA 9 Baseball")
 * @returns {Promise<{average_price: number, min_price: number, max_price: number, sale_count: number, trend: string, trend_percent: number, confidence: string, analysis: string, period_used: string, recent_sales: object[]}>}
 */
export function fetchCardPrice(cardName) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: LOTRICH_URL,
      type: "POST",
      headers: LOTRICH_HEADERS,
      // 데이터 전송 시 문자열로 변환 (기존 fetch의 body와 동일)
      data: JSON.stringify({
        add_context_from_internet: true,
        model: "gemini_3_flash",
        prompt: `You are a sports card market expert. Research eBay completed sales for this card: ${cardName}. Analyze the last 3 months of completed/sold listings. Provide average price in USD.`,
        response_json_schema: {
          type: "object",
          properties: {
            average_price:  { type: "number" },
            min_price:      { type: "number" },
            max_price:      { type: "number" },
            sale_count:     { type: "number" },
            trend:          { type: "string" },
            trend_percent:  { type: "number" },
            confidence:     { type: "string" },
            analysis:       { type: "string" },
            period_used:    { type: "string" },
            recent_sales:   { type: "array", items: { type: "object" } },
          },
        },
      }),
      // 성공 시 처리 (fetch의 await res.json()에 해당)
      success: function(response) {
        // $.ajax는 Content-Type 헤더가 JSON일 경우 자동으로 객체로 파싱합니다.
        resolve(response);
      },
      // 에러 시 처리 (fetch의 !res.ok에 해당)
      error: function(xhr, status, error) {
        const text = xhr.responseText || "";
        reject(new Error(`LotRICH API 실패: ${xhr.status} ${error} - ${text}`));
      }
    });
  });
}
