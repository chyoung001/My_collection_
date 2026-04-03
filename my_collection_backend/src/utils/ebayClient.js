import dotenv from "dotenv";
dotenv.config();

const EBAY_AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Client Credentials Grant으로 eBay Access Token 발급 (캐시 포함)
 */
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID 또는 EBAY_CLIENT_SECRET 환경변수가 없습니다.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(EBAY_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eBay 토큰 발급 실패: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // 만료 30초 전에 갱신하도록 여유 설정
  tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;

  return cachedToken;
}

/**
 * eBay Browse API로 카드 시세 검색
 *
 * @param {string} query    - 검색어
 * @param {number} limit    - 결과 수 (기본 10, 최대 50)
 * @param {object} options  - 추가 필터 옵션
 *   @param {string}  options.sort         - 정렬: "price" | "price desc" | "endingSoonest" | "newlyListed"
 *   @param {string}  options.buyingOption - "FIXED_PRICE" | "AUCTION" | "" (둘 다)
 *   @param {number}  options.minPrice     - 최소 가격 (USD)
 *   @param {number}  options.maxPrice     - 최대 가격 (USD)
 *   @param {string}  options.condition    - "NEW" | "USED" | "Graded" | "" (전체)
 */
export async function searchEbayPrices(query, limit = 10, options = {}) {
  const token = await getAccessToken();

  const {
    sort = "price",
    buyingOption = "",
    minPrice = null,
    maxPrice = null,
    condition = "",
  } = options;

  // filter 조건 조합
  const filterParts = [];

  if (buyingOption) {
    filterParts.push(`buyingOptions:{${buyingOption}}`);
  } else {
    filterParts.push("buyingOptions:{FIXED_PRICE|AUCTION}");
  }

  if (condition) {
    filterParts.push(`conditions:{${condition}}`);
  }

  if (minPrice !== null && maxPrice !== null) {
    filterParts.push(`price:[${minPrice}..${maxPrice}]`);
    filterParts.push("priceCurrency:USD");
  } else if (minPrice !== null) {
    filterParts.push(`price:[${minPrice}..}]`);
    filterParts.push("priceCurrency:USD");
  } else if (maxPrice !== null) {
    filterParts.push(`price:[0..${maxPrice}]`);
    filterParts.push("priceCurrency:USD");
  }

  const params = new URLSearchParams({
    q: query,
    category_ids: "212",           // Sports Trading Cards 카테고리
    filter: filterParts.join(","),
    sort,
    limit: String(Math.min(limit, 50)),
    fieldgroups: "MATCHING_ITEMS",
  });


  const res = await fetch(`${EBAY_BROWSE_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eBay Browse API 실패: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const items = (data.itemSummaries || []).map((item) => ({
    itemId: item.itemId,
    title: item.title,
    price: item.price ? parseFloat(item.price.value) : null,
    currency: item.price?.currency || "USD",
    condition: item.condition,
    buyingOptions: item.buyingOptions || [],
    itemUrl: item.itemWebUrl,
    imageUrl: item.image?.imageUrl || null,
    seller: item.seller?.username || null,
    endDate: item.itemEndDate || null,
  }));

  const prices = items.map((i) => i.price).filter((p) => p !== null);
  const filteredPrices = removeOutliers(prices);
  const summary =
    filteredPrices.length > 0
      ? {
          count: filteredPrices.length,
          rawCount: prices.length,
          avgPrice: Math.round((filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length) * 100) / 100,
          minPrice: Math.min(...filteredPrices),
          maxPrice: Math.max(...filteredPrices),
          medianPrice: calcMedian(filteredPrices),
        }
      : { count: 0, rawCount: prices.length, avgPrice: null, minPrice: null, maxPrice: null, medianPrice: null };

  return { items, summary };
}

/**
 * IQR 기반 이상값 제거
 * Q1 - 1.5×IQR ~ Q3 + 1.5×IQR 범위 밖의 가격을 제외
 * 데이터가 4개 미만이면 필터링 생략
 */
function removeOutliers(prices) {
  if (prices.length < 4) return prices;

  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  // IQR이 0이면 (모든 가격이 동일) 필터링 의미 없음
  if (iqr === 0) return prices;

  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return prices.filter((p) => p >= lower && p <= upper);
}

function calcMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}
