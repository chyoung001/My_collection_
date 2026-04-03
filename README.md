# My Collection

> **스포츠 카드 컬렉션 가치 추적 및 관리 웹 애플리케이션**
>
> [프론트엔드 라이브 데모](https://chyoung001.github.io/My_collection_/)

<br/>

## 프로젝트 소개

**My Collection**은 보유 중인 스포츠 카드의 목록을 체계적으로 관리하고, 가치 변화를 추적하기 위해 개발된 웹 서비스입니다.  
단순한 수동 기록을 넘어, **PSA Public API**를 활용한 카드 정보 자동 등록 기능을 지원하며, eBay 완료 거래 기반 시세 자동 수집을 통해 컬렉션의 현재 가치를 한눈에 파악할 수 있게 합니다.

<br/>

---

### 메인화면 (Dashboard)

> 포트폴리오 총액 · 보유 장 수 · PSA 10 젬 수 · 최고가 카드 등 요약 지표를 보여 주고,  
> 포트폴리오 가치 추이 차트, Top Performers, 최근 시세 수집 이력을 한 번에 확인할 수 있습니다.

<p align="center">
  <img src="Screenshot/메인.png" width="100%"/>
</p>

---

### 컬렉션 관리

> 보유 카드 전체 목록과 포트폴리오 요약(총액, 장 수·등급, 시세 갱신 시각),  
> 선수·인증번호 검색, 등급사·등급·브랜드 필터, 카드 등록/삭제 기능이 모여 있습니다.

<p align="center">
  <img src="Screenshot/컬렉션.png" width="100%"/>
</p>

---

### 시세 검색 (Market Trends)

> eBay Browse API를 통한 실시간 완료 거래 시세 검색.  
> 검색어, 가격 범위, 구매 옵션, 상태 필터를 지원하며 IQR 기반 이상치 제거 후 통계를 제공합니다.

<p align="center">
  <img src="Screenshot/시세추적.png" width="100%"/>
</p>

---

### 카드 등록

> **자동 등록** — PSA Cert 번호 입력 시 PSA Public API에서 카드 정보·이미지를 자동으로 가져옵니다.

<p align="center">
  <img src="Screenshot/카드등록(자동).png" width="70%"/>
</p>

> **수동 등록** — RAW 카드나 PSA 데이터가 없는 카드를 직접 입력합니다.

<p align="center">
  <img src="Screenshot/카드등록(수동).png" width="70%"/>
</p>

---

<br/>

## 기술 스택

### Backend
- **Runtime:** Node.js 18+ (ES Modules)
- **Framework:** Express.js 4
- **Database:** PostgreSQL (pg 드라이버)
- **API Docs:** Swagger UI — `/docs`
- **배포:** Railway

### Frontend
- Vanilla HTML / CSS / JavaScript (프레임워크 없음)
- GitHub Pages 정적 호스팅

### 외부 API

| API | 용도 |
|-----|------|
| **PSA Public API** | Cert 번호로 카드 정보·이미지 자동 조회 |
| **eBay Browse API** | 실시간 시세 수동 검색 및 자동 수집 |

<br/>

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cards` | 전체 카드 목록 (최대 200개) |
| POST | `/api/cards` | 카드 수동 등록 |
| POST | `/api/cards/auto` | PSA 인증번호로 자동 등록 |
| DELETE | `/api/cards/:id` | 카드 삭제 |
| GET | `/api/dashboard/summary` | 포트폴리오 요약 (총액, 카드 수, 등급 분포) |
| GET | `/api/dashboard/top-cards` | 고가 카드 Top N |
| GET | `/api/dashboard/top-gainer` | 최고가 카드 |
| GET | `/api/market/search` | eBay 시세 수동 검색 (필터 지원) |
| GET | `/api/snapshots/latest` | 카드별 최신 시세 스냅샷 |
| GET | `/api/snapshots/:id/history` | 카드 시세 이력 (차트용) |
| GET | `/api/snapshots/summary` | 포트폴리오 시세 요약 |
| POST | `/api/snapshots/run` | 시세 수집 수동 트리거 |

전체 명세는 서버 실행 후 **`http://localhost:4000/docs`** 에서 확인할 수 있습니다.

<br/>

## 프로젝트 구조

```
MY_collection/
│
├── my_collection_backend/          # Node.js / Express API 서버
│   ├── src/
│   │   ├── server.js               # 진입점 — Express 앱 설정, 라우터 등록
│   │   ├── swagger.js              # Swagger / OpenAPI 스펙 생성
│   │   ├── service/                # API 라우트 핸들러
│   │   │   ├── cards.js            # GET·POST /api/cards, POST /api/cards/auto, DELETE /api/cards/:id
│   │   │   ├── dashboard.js        # GET /api/dashboard/summary·top-cards·top-gainer
│   │   │   ├── market.js           # GET /api/market/search (eBay Browse API)
│   │   │   ├── snapshots.js        # GET·POST /api/snapshots/*
│   │   │   └── grading.js          # POST /api/grading/lookup (스텁)
│   │   └── utils/                  # 공통 유틸
│   │       ├── db.js               # PostgreSQL 커넥션 풀
│   │       ├── ebayClient.js       # eBay Browse API 클라이언트 (OAuth + IQR 이상치 제거)
│   │       ├── psaClient.js        # PSA Public API 클라이언트
│   │       └── scheduler.js        # 전체 카드 시세 수집 로직
│   ├── schema.sql                  # DB 스키마 (cards, market_snapshots)
│   ├── package.json
│   └── railway.json                # Railway 배포 설정
│
├── my_collection_frontend/         # 정적 HTML / CSS / JS 프론트엔드
│   └── src/
│       ├── pages/
│       │   ├── dashboard.html      # 메인 — 포트폴리오 요약, 차트, 시세 수집
│       │   ├── collection.html     # 카드 목록 · 등록 · 삭제
│       │   ├── market-trends.html  # eBay 시세 수동 검색
│       │   └── settings.html       # API Base URL 설정
│       ├── scripts/
│       │   └── api-base-nav.js     # apiBase 파라미터 세션 유지 유틸
│       └── styles/
│           └── style.css           # 전역 스타일
│
├── index.html                      # 루트 — dashboard.html 으로 자동 리다이렉트
└── README.md
```

<br/>

## 로컬 실행

### 1. 환경변수 설정

`my_collection_backend/.env` 파일 생성:

```env
PORT=4000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<dbname>
PSA_API_BASE=https://api.psacard.com/publicapi
PSA_TOKEN=<PSA Bearer Token>
EBAY_CLIENT_ID=<eBay OAuth Client ID>
EBAY_CLIENT_SECRET=<eBay OAuth Client Secret>
```

### 2. DB 초기화

```bash
psql -U <user> -d <dbname> -f my_collection_backend/schema.sql
```

### 3. 백엔드 실행

```bash
cd my_collection_backend
npm install
npm start
```

### 4. 프론트엔드 열기

`my_collection_frontend/src/pages/dashboard.html` 을 Live Server 등으로 열거나, GitHub Pages URL에 접속합니다.

<br/>

