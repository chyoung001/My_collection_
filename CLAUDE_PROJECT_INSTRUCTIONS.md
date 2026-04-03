# My Collection — Claude.ai Project Instructions

## 프로젝트 개요

스포츠 카드 컬렉션 관리 웹 앱. PSA(Professional Sports Authentication) API를 연동하여 개인 실물 카드를 온라인에서 관리하고 포트폴리오 가치를 추적한다.

- **개발 형태**: 1인 개인 프로젝트
- **개발 상태**: 진행 중 (인증, DNA 등급 연동 미구현)
- **실행 포트**: 백엔드 4000번 (기본값)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 런타임 | Node.js (ES Modules — `"type": "module"`) |
| 백엔드 프레임워크 | Express 4.21 |
| 데이터베이스 | PostgreSQL (`pg` 8.13, 커넥션 풀) |
| API 문서 | Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`) |
| 프론트엔드 | 순수 HTML / CSS / Vanilla JS (프레임워크 없음) |
| 외부 API | PSA Public API (`https://api.psacard.com/publicapi`) |
| 인프라 | ngrok (외부 접속), dotenv (환경변수) |
| 테스트 | Playwright (devDependency, 미작성 상태) |

---

## 디렉토리 구조

```
MY_collection/
├── my_collection_backend/
│   ├── src/
│   │   ├── server.js              # Express 앱 진입점
│   │   ├── swagger.js             # Swagger 설정
│   │   ├── service/
│   │   │   ├── cards.js           # 라우터 통합 (card_status + new_card + del_card)
│   │   │   ├── card_status.js     # GET /api/cards
│   │   │   ├── new_card.js        # POST /api/cards (수동 등록)
│   │   │   ├── del_card.js        # DELETE /api/cards/:id, POST /api/cards/auto
│   │   │   └── grading.js         # POST /api/grading/lookup
│   │   └── utils/
│   │       ├── db.js              # PostgreSQL 커넥션 풀 (pool export)
│   │       ├── psaClient.js       # PSA API 실제 호출
│   │       └── psaStub.js         # PSA 목(mock) 데이터
│   ├── schema.sql                 # DB 스키마 (cards 테이블)
│   └── package.json
└── my_collection_frontend/
    └── src/
        ├── pages/
        │   ├── dashboard.html     # 포트폴리오 대시보드
        │   ├── collection.html    # 카드 목록/등록/삭제
        │   ├── market-trends.html # 시장 트렌드
        │   ├── settings.html      # 설정
        │   └── index.html         # dashboard.html로 리다이렉트
        ├── scripts/
        │   └── api-base-nav.js    # ?apiBase= 쿼리 파라미터 유지
        └── styles/
            └── style.css          # 다크 테마, 글래스모피즘 UI
```

---

## DB 스키마 (`cards` 테이블)

```sql
CREATE TABLE IF NOT EXISTS cards (
  id                  SERIAL PRIMARY KEY,
  subject             VARCHAR(255) NOT NULL,   -- 선수명 / 카드 대상
  year                VARCHAR(4)   NOT NULL,   -- 발행 연도
  set_name            VARCHAR(255) NOT NULL,   -- 세트명
  card_number         VARCHAR(50)  NOT NULL,   -- 카드 번호
  variety             VARCHAR(255),            -- 바리에이션
  category            VARCHAR(255),
  grade               VARCHAR(50),             -- 등급 (예: PSA 10)
  grader              VARCHAR(20),             -- PSA, DNA 등
  cert_number         VARCHAR(50),             -- PSA 인증번호 (UNIQUE)
  image_url           TEXT,
  certification_type  VARCHAR(20),
  is_hologram         VARCHAR(10),
  is_reverse_barcode  VARCHAR(10),
  psa_cert            JSONB,                   -- PSA 인증서 전체 JSON
  psa_population      JSONB,                   -- Population 통계
  psa_images          JSONB,                   -- 카드 이미지 목록
  dna_cert            JSONB,                   -- DNA 인증서 (미구현)
  current_price       NUMERIC(12,2),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API 엔드포인트

### Cards

| Method | Path | 설명 | 필수 Body |
|--------|------|------|-----------|
| GET | `/api/cards` | 전체 카드 조회 | — |
| POST | `/api/cards` | 카드 수동 등록 | `subject`, `year`, `setName`, `cardNumber` |
| DELETE | `/api/cards/:id` | 카드 삭제 | — |
| POST | `/api/cards/auto` | PSA 인증번호로 자동 등록 | `certNumber`, `psaToken` |

### Grading

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/grading/lookup` | PSA 등급 조회 (현재 stub 반환) |

### 기타

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 (`{ status: "ok" }`) |
| GET | `/docs` | Swagger UI |

---

## 핵심 로직

### 카드 수동 등록 (`POST /api/cards`)
- `subject`, `year`, `setName`, `cardNumber` 필수
- PSA 데이터(`psaCert`, `psaPopulation`, `psaImages`)는 선택적으로 함께 저장 가능
- `psaImages` 배열에서 `IsFrontImage === true`인 항목의 `ImageURL`을 `image_url`로 자동 설정

### 카드 자동 등록 (`POST /api/cards/auto`)
- `certNumber` + `psaToken` 필수 (현재 PSA만 지원, DNA 미구현)
- `psaClient.js`의 `fetchPsaLookupAndImages(certNumber, token)` 호출
  - PSA API 2개 병렬 호출: `GetByCertNumberForFileAppend`, `GetImagesByCertNumber`
- PSA 응답에서 `PSACert`, `PSAPopulation` 추출 → DB 저장

### PSA API 클라이언트 (`psaClient.js`)
- 환경변수 `PSA_API_BASE` (기본값: `https://api.psacard.com/publicapi`)
- Bearer 토큰 인증
- `fetchPsaLookupAndImages(certNumber, token)` → `{ psaLookup, psaImages }` 반환

### ngrok / apiBase 지원
- 프론트엔드는 `?apiBase=https://xxxx.ngrok.io` 쿼리 파라미터로 백엔드 주소 전환
- `api-base-nav.js`가 페이지 이동 시 해당 파라미터를 유지

---

## 환경변수 (`.env`)

```
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/my_collection_backenddb
PSA_API_BASE=https://api.psacard.com/publicapi
```

---

## 실행 방법

```bash
# 백엔드
cd my_collection_backend
npm install
npm run dev        # 개발 모드
npm start          # 프로덕션

# 프론트엔드
# 별도 빌드 없이 HTML 파일 직접 브라우저에서 열기
# 또는 Live Server 등으로 서빙
```

---

## 현재 미구현 / TODO

- 인증(로그인) 기능 없음 — 개인용 서비스
- DNA 등급 연동 (`dna_cert` 컬럼은 존재하나 API 미연동)
- 실시간 가격 데이터 연동 (`current_price` 컬럼 있으나 미구현)
- `POST /api/grading/lookup` — 현재 stub 데이터 반환
- 테스트 코드 없음 (Playwright devDep만 설치된 상태)

---

## 코딩 컨벤션

- 백엔드: ES Modules (`import`/`export`), `async/await`
- DB 쿼리: `pg` 풀의 `pool.query()` 직접 사용 (ORM 없음)
- JSONB 저장 시 반드시 `JSON.stringify()` 후 `::jsonb` 캐스팅
- API 요청 본문 필드명: camelCase (`setName`, `certNumber`, `psaToken`)
- DB 컬럼명: snake_case (`set_name`, `cert_number`)
- Swagger 주석: 각 라우터 파일 상단에 `@openapi` JSDoc 형식
