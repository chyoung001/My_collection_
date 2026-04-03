# My Collection Backend (Postgres + Express)

## 외부 PC(다른 네트워크)에서 시연하기: ngrok 사용법

이 프로젝트의 프론트는 백엔드 API를 `apiBase`로 호출합니다.
외부 PC(다른 네트워크/다른 사람)에서 동작하려면 로컬 백엔드를 ngrok으로 **HTTPS 공개 URL**로 연결한 뒤,
프론트 URL의 `?apiBase=...` 값에 그 URL을 넣어야 합니다.

### 1) 백엔드 실행
백엔드 폴더에서 서버를 실행합니다.

- 기본 포트: `4000`
- 실행:
  ```bash
  npm run dev
  ```

### 2) ngrok 실행(4000 포트 포워딩)

#### (권장) ngrok Authtoken 설정
ngrok 계정이 있다면 1회만 설정해두세요.
```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

#### (필수) 4000 포트 공개
```bash
ngrok http 4000
```

콘솔에 `Forwarding https://... -> http://localhost:4000` 형태로 나오는 **Forwarding URL(https로 시작)** 을 복사합니다.
예: `https://3b42-112-171-74-158.ngrok-free.app`

> 주의: ngrok Free 플랜은 실행할 때마다 Forwarding URL이 바뀔 수 있습니다.
시연 시에는 **새로 뜬 URL을 매번** 프론트 링크에 반영하세요.

### 3) 프론트(배포된 collection 페이지)에서 apiBase 지정
배포된 프론트 URL에 `?apiBase=<ngrok-forwarding-url>`을 붙여서 엽니다.

템플릿(한 줄):
```text
https://<github-id>.github.io/<repo-name>/pages/collection.html?apiBase=<NGROK_FORWARDING_URL>
```

예시:
```text
https://chyoung001.github.io/My_collection/pages/collection.html?apiBase=https://3b42-112-171-74-158.ngrok-free.app
```

### 4) 시연 체크리스트(빠르게)
1. 외부 PC에서 브라우저 개발자도구(Console/Network)로 `/api/cards` 또는 `/api/cards/auto` 요청이
   `https://<ngrok-forwarding-url>/api/...`로 나가는지 확인
2. PSA 토큰은 페이지 우측 상단 프로필 버튼에서 설정(저장) 후 진행

### Troubleshooting
- 외부에서 “아무 반응이 없음”:
  - `apiBase`가 여전히 `http://localhost:4000`으로 호출되고 있는지 확인
  - Network 탭에서 실패한 요청의 URL/에러(예: Mixed Content, ECONNREFUSED)를 확인
