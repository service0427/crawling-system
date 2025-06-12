# CloudFlare Pages 설정 가이드

## 프로젝트 구조

```
/home/jun/server/
├── functions/              # CloudFlare Pages Functions (API 엔드포인트)
│   ├── _middleware.js      # CORS 및 공통 헤더 처리
│   ├── [[path]].js        # 동적 라우팅 폴백
│   ├── ws.js              # WebSocket 연결
│   └── api/               # API 엔드포인트
│       ├── status.js
│       ├── agents.js
│       ├── search.js
│       └── job/
│           └── [id].js
├── public/                # 정적 파일
│   ├── _routes.json       # 라우팅 설정
│   ├── _headers           # HTTP 헤더 설정
│   └── _redirects         # 리다이렉트 설정
├── src/                   # 기존 Worker 소스 코드
├── wrangler.jsonc         # CloudFlare Worker 설정 (환경별)
├── wrangler-dev.jsonc     # 로컬 개발 환경 설정
├── cloudflare.toml        # CloudFlare Pages 빌드 설정
└── deploy-functions.sh    # 배포 스크립트
```

## 환경 설정

### 1. 프로덕션 환경
- **production**: wapi.mkt-guide.com

### 2. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 값으로 채우세요:

```bash
cp .env.example .env
```

## 개발 및 배포

### 로컬 개발
```bash
# CloudFlare Pages 개발 서버 실행
npm run dev

# Worker 개발 서버 실행 (대체 방법)
npm run dev:worker
```

### 빌드
```bash
# 전체 빌드
npm run build

# CloudFlare용 빌드
npm run build:cloudflare
```

### 배포
```bash
# Worker 배포
npm run deploy        # 프로덕션 환경
npm run deploy:prod   # 프로덕션 환경 (동일)

# Pages 배포  
npm run deploy:pages:test   # 테스트 (crawling-system-test)
npm run deploy:pages:prod   # 프로덕션 (crawling-system)

# 또는 배포 스크립트 사용
./deploy-functions.sh develop    # 개발 환경
./deploy-functions.sh test       # 테스트 환경
./deploy-functions.sh production # 프로덕션 환경
```

## API 엔드포인트

- `GET /api/status` - 시스템 상태 확인
- `GET /api/agents` - 에이전트 목록 조회
- `GET /api/job/:id` - 특정 작업 조회
- `POST /api/search` - 새 검색 작업 생성
- `GET /ws` - WebSocket 연결

## 주의사항

1. **KV Namespace ID**: `wrangler.jsonc`의 KV namespace ID를 실제 값으로 변경하세요
2. **Account ID**: CloudFlare 계정 ID를 설정하세요
3. **도메인**: 실제 사용할 도메인으로 변경하세요
4. **환경 변수**: CloudFlare 대시보드에서 각 환경별로 설정하는 것을 권장합니다

## 마이그레이션 체크리스트

- [x] CloudFlare 설정 파일 생성 (wrangler.jsonc, cloudflare.toml)
- [x] Functions 디렉토리 구조 설정
- [x] API 엔드포인트 마이그레이션
- [x] 환경별 설정 파일 구성
- [x] 빌드 및 배포 스크립트 업데이트
- [x] 라우팅 설정 파일 생성
- [ ] KV Namespace 생성 및 ID 업데이트
- [ ] CloudFlare 계정 설정
- [ ] 도메인 설정 및 DNS 구성
- [ ] 환경 변수 설정 (CloudFlare 대시보드)