# Chunmun Astro-Wellness Backend (Twin-Pillar)

천문(Chunmun) 웰니스 코어의 백엔드. **두 모듈은 상하 관계가 아니라 동일 위계의 병렬 형제(sibling)** 입니다.

| 모듈 | 엔드포인트 | 설명 |
|------|-----------|------|
| 천문식탁 (`ChunmunTableModule`) | `POST /api/chunmun-table/analyze` | 사진 OCR · 바코드 · 텍스트 검색 → 적합성 분석 |
| 오늘의 추천 음식 (`RecommendationsModule`) | `GET /api/recommendations/today-food/:userId` | 명식 결핍 + 당일 전이/절기 → 균형 음식 3종 |

스택: **NestJS · TypeScript · PostgreSQL · TypeORM · Redis**.

---

## 1. 빠른 시작

```bash
cd backend
cp .env.example .env          # 값 채우기 (아래 §3)
docker compose up -d          # PostgreSQL + Redis
npm install
npm run start:dev             # http://localhost:3000/api
```

개발 모드는 `DB_SYNCHRONIZE=true`로 스키마를 자동 생성합니다. 운영은 `false` + 마이그레이션:

```bash
npm run migration:generate src/migrations/Init
npm run migration:run
```

## 2. 아키텍처

```
src/
  app.module.ts            # 루트 — 두 병렬 모듈을 동일 위계로 등록
  main.ts                  # 전역 prefix /api, ValidationPipe, CORS
  config/data-source.ts    # TypeORM SSOT (앱 + CLI 마이그레이션 공유)
  entities/                # User · FoodNutrition · HealthFunctionalItem · DailyOhaengLog
  redis/                   # 전역 Redis 캐시(캐시-어사이드 wrap)
  ai/                      # GeminiService — Flash-Lite → Flash 폴백, 원샷 추출
  saju/                    # 오행 결핍/타깃/적합도 점수
  compliance/              # 카테고리 A/B/C/D 게이트 + 유사과학 블랙리스트
  mfds/                    # 식약처 동기화(Cron+쿼터+페이지네이션) + 수동 트리거
  chunmun-table/           # ▶ 천문식탁 (POST /chunmun-table/analyze)
  recommendations/         # ▶ 오늘의 추천 음식 (GET /recommendations/today-food/:userId)
```

## 3. 환경변수 (.env)

PostgreSQL/Redis는 `docker-compose.yml` 기본값과 일치합니다. 핵심:

| 키 | 설명 |
|----|------|
| `GEMINI_API_KEY` | Vision/OCR 라우팅 |
| `GEMINI_MODEL_PRIMARY` / `_FALLBACK` | `gemini-3.1-flash-lite` / `gemini-3.5-flash` |
| `MFDS_FOOD_DATAGOKR_KEY` | **식품영양성분DB정보** = data.go.kr(15127578) 일반인증키(Decoding) |
| `MFDS_FOOD_DATAGOKR_URL` | `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02` |
| `MFDS_HFI_API_KEY` / `MFDS_HFI_SERVICE_ID` | **건강기능식품** = 식품안전나라 hex 인증키 / `C003` |
| `MFDS_DAILY_QUOTA` | 일일 호출 한도(기본 1000) |

> **두 데이터는 포털이 다릅니다.**
> - 식품영양성분 → **data.go.kr**(`apis.data.go.kr/1471000/FoodNtrCpntDbInfo02`), serviceKey + pageNo/numOfRows, `header/body` 봉투. `MFDS_FOOD_PROVIDER=datagokr`(기본).
> - 건강기능식품 → **식품안전나라**(`openapi.foodsafetykorea.go.kr/api/{키}/C003/json/{시작}/{끝}`), `{서비스ID}.row` + `RESULT.CODE`. (검증됨: 44,811건 정상.)
> data.go.kr serviceKey는 **Decoding(일반 인증키)** 를 넣으세요(Encoding 키는 이중 인코딩으로 실패).

## 4. MFDS 동기화 (§3 of spec)

- **야간 Cron** (`MFDS_SYNC_CRON`, 기본 03:10 KST): 두 데이터셋을 PostgreSQL로 upsert.
- **쿼터 가드**: 하루 `MFDS_DAILY_QUOTA`회로 호출 제한 → 소진 시 중단, 다음 날 이어서.
- **페이지네이션**: `total_count` 기반 인덱스 범위(`/시작/끝`), 1요청당 최대 1000행.
- **로컬 우선 조회**: 사용자 쿼리는 Redis/PostgreSQL에서 처리 → 외부 API 우회(zero-latency).

발급 키 검증 / 초기 적재용 수동 트리거:

```bash
curl -X POST "http://localhost:3000/api/mfds/sync?target=food"   # 식품영양성분
curl -X POST "http://localhost:3000/api/mfds/sync?target=hfi"    # 건강기능식품
curl -X POST "http://localhost:3000/api/mfds/sync"               # 둘 다
```
> 운영에서는 이 엔드포인트를 관리자 인증 가드로 보호하세요.

## 5. Vision AI 라우팅 (§4)

`POST /api/chunmun-table/analyze` — `multipart/form-data`

| 필드 | 값 |
|------|----|
| `file` | 이미지(갤러리/카메라 프레임) — PHOTO 채널 |
| `userId` | UUID (사주 프로필 보유) |
| `channel` | `PHOTO` \| `BARCODE` \| `TEXT` |
| `barcode` / `query` | 채널별 입력 |

흐름: 캐시 → 로컬 DB(바코드/텍스트) → **Flash-Lite 원샷**(영양 추출 + 오행 적합도 0~100 + 3줄 추천) → 실패/저신뢰/복잡 라벨이면 **Flash 폴백** → 컴플라이언스 게이트.

## 6. 컴플라이언스 게이트 (§6)

| 카테고리 | 처리 |
|----------|------|
| **A 건강기능식품** | MFDS 인증 클레임만 노출 |
| **B 한약/한약재** | 기미(한열)×체질 적합성 '경향'만, 효능 단정 금지 |
| **C 일반식품(추출가공식품 등)** | 객관적 영양만, 기능성/의학 주장 차단 |
| **D 유사과학(수소수 등)** | 0% 적합 + 허위광고 경고 |

블랙리스트: `src/compliance/pseudoscience.blacklist.ts` (운영 시 DB 테이블로 승격 권장).

## 7. 안전 임계치 (§5)

추천 엔진은 1회 제공량이 일일 권장의 **80% 초과**인 고나트륨/고당 식품을 제외합니다
(나트륨 2000mg, 당 100g 기준). 만성질환 보유 시 60%로 강화(고혈압→나트륨, 당뇨→당).

## 8. 명령어

```bash
npm run start:dev     # 개발(watch)
npm run build         # dist 빌드
npm run typecheck     # tsc --noEmit
npm run lint
```
