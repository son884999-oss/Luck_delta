# 천문 — 개선 로그 (Lead Architect 주도)

각 항목: **무엇을 / 왜 / 어떻게 검증** 순. 최신 항목이 위.

## P0 — 안정성 · 핵심 가치

### PM 반복: 발송 견고성·정직한 실패·닫힘 가드 ✓
- **Iter1(Code·서버리스 견고성):** 함수/로컬서버에서 **PDF 렌더 실패 시 전체 HTML 본문으로 폴백** → @sparticuz/chromium이 실패해도 사용자는 리포트를 반드시 받음(silent drop 방지). `renderUserReportEmail`을 폴백으로 사용.
- **Iter2(UX·정직성):** 실발송이 즉시 일어나는데 남아 있던 **가짜 'ETA 예약' 시뮬레이션 제거** — 실패 시 가짜 "○시에 보내드릴게요" 대신 **정직한 오류 화면 + [다시 시도]**. 이제 모순적이던 허브 진행바(`DispatchStatusBar`)·`assessDispatchEta`·`cm_report_pending` 쓰기 제거.
- **Iter3(UX·닫힘 방지):** 생성~전송(~20초) 동안 **beforeunload 경고** + 스피너에 "창을 닫지 말고 기다려 주세요" 안내. (완전한 fire-and-forget은 서버 백그라운드 함수가 필요 — 별도 선택지.)

### 표지 메일 + PDF 첨부 · 서버리스 PDF(@sparticuz/chromium) · 줄바꿈 수정 ✓
- **메일=표지만, 본문=첨부 PDF:** [`emailTemplate.js`](src/lib/emailTemplate.js) `renderCoverEmail` 신설 — 표지(天文·SIGNATURE·이름·명식 요약)+"전체는 첨부 PDF" 안내만. 모든 발송 경로(앱·mail-server·send-report·send-report-smtp)가 표지메일+PDF 첨부로 통일.
- **줄바꿈 버그(전역) 수정:** 한국어가 음절 중간에서 끊기던 문제 → 메일 전역 `word-break:keep-all`(+overflow-wrap). "애정과 인연" 등 정상.
- **서버리스 PDF(@sparticuz/chromium):** 아키텍처 변경 — **무거운 리포트 생성은 클라이언트(브라우저)가 수행**(generateReport, 스피너), 함수는 받은 `data`로 **PDF 렌더(@sparticuz/chromium+playwright-core)+발송만** → 동기 함수 타임아웃 회피. [`netlify/functions/send-report.mjs`](netlify/functions/send-report.mjs) `{email,name,data}` 수신. [`netlify.toml`](netlify.toml) external_node_modules·included_files 갱신. 함수는 더 이상 GEMINI 키 불필요.
- **검증:** 빌드·구문 통과. 손용범(2004-11-3 03:13) 실생성 → `report-손용범.pdf`(15p·병술 일주) + 표지메일 미리보기 육안 확인. ⚠️ 서버리스 함수의 @sparticuz/chromium PDF는 **실배포에서 미검증**(번들 크기·런타임) — 배포 후 함수 로그로 확인 필요.

### 인앱 실발송(로컬 메일 서버 브리지) + 리포트 PDF 한 페이지 한 주제 ✓
- **인앱 → 실제 메일 발송:** 브라우저는 메일을 못 보내므로 로컬 메일 서버 [`scripts/mail-server.mjs`](scripts/mail-server.mjs)(Node http + nodemailer Gmail SMTP) 추가. 앱 `confirmDispatch`가 `VITE_MAIL_ENDPOINT`(기본 `http://localhost:8787`)로 POST → 서버가 리포트 생성+PDF+발송. 발송중(스피너)/성공('발송 완료')/**서버 없을 시 graceful 폴백**(기존 ETA 안내) 상태 분기. son884999@gmail.com 실발송 테스트 성공(messageId).
- **배포(PC 불필요):** 동일 로직을 [`netlify/functions/send-report.mjs`](netlify/functions/send-report.mjs)(서버리스) + [`netlify.toml`](netlify.toml)(`VITE_MAIL_ENDPOINT=/.netlify/functions/send-report`, 동일 출처)로 이식. 배포 후 클라우드가 24/7 발송 → 사용자 PC 무관. 절차/환경변수는 [DEPLOY.md](DEPLOY.md) ②. (서버리스 1차는 HTML 본문 발송 — Chromium PDF는 무거워 옵션.)
- **PDF 한 페이지 = 한 주제:** 본문 11개 섹션을 **각각 독립 페이지**(`break-before:page`)로 — '건강운' 등이 페이지 경계에 걸쳐 잘리던 문제 해결. 섹션 헤더를 **챕터 오프너**(가운데 번호 배지+큰 serif 제목+짧은 룰)로, 본문 11→12.5pt·행간 2.0, 인용/칩/팁/월별/타임라인 글씨 확대(가독성). 짧은 섹션은 **세로 중앙 정렬 + ✦ 장식**으로 균형 있게 채움. 스톡 사진 대신 인쇄·저작권 안전한 인라인 벡터 장식 사용.
- **검증:** 빌드 정상. 오프라인 preview-pdf로 ~14p(섹션별 1p) + 챕터 레이아웃·중앙정렬 육안 확인.

### 전역 토글 제거(전체 펼침) + 다이어리/입력 정리 + 리포트 고정 CTA ✓
- **전역 '더보기/접기' 제거(전 영역 정보 완전 노출 정책):** ① 허브 '운세 더 보기' 토글 제거 → 6모드 전부 펼쳐 노출(시그니처 상단 배치는 유지), ② `ExpandableText`를 전문 항상 노출로 단순화(일기 미리보기·다이어리), ③ 결과화면 `BasisBlock`(명리학적 근거) 접힘 제거 → 항상 펼침. 미사용 import 정리(celestial: `useLayoutEffect`·`ChevronDown`).
  - *주의:* 직전 항목3-B의 Progressive Disclosure(접기)를 **명시적 지시로 되돌림** — 단, 시그니처 최우선 배치는 유지. 시그니처 리포트는 단일 연속 블록 유지(분할 안 함).
- **Task 18 Part2(단일-콘텐츠-페이지):** 리포트 신청 화면을 결과화면과 동일한 **하단 고정 CTA**(이메일+신청 버튼 항상 노출)로 — 오퍼 상세는 흐르고 커밋 액션은 폴드에 안 가림.
- **입력 정리(next work 1):** 시(時)=모름일 때 분(分) 컬럼의 '자동' 오버레이 문구 제거.
- **다이어리 정리(next work 2):** '일기 허브' → **'{이름}님의 다이어리'**, 부제의 '· 조회 · 수정 · 삭제' 메타 라벨 제거(개수만 표시). 항목별 [수정]/[삭제] 기능 버튼은 CRUD 유지.
- **검증:** 빌드 정상 · 신규 린트 0 · Playwright 15플래그(허브 토글 없음·5모드 노출·시그니처 상단 / 다이어리 제목·라벨제거 / 분 '자동' 없음 / 리포트 하단 고정 CTA).

### 항목4 · 실발송(F2) — 자율분 완료 / 라이브는 운영자 ◐
- **자율 완료:** ① 보안 — `send-test.mjs`가 키 앞 5자를 콘솔에 찍던 부분 제거(키 노출 0 원칙 준수). ② 운영 런북 [`DEPLOY.md`](DEPLOY.md) — Resend 도메인 인증·서버리스 발송 함수 계약·서버리스 PDF(Chromium) 주의 및 1차 출시안(HTML 즉시발송+PDF는 CTA 링크)·클라이언트 연동 지점(`confirmDispatch`)·시크릿/배포 체크리스트.
- **차단(운영자 수동):** 호스팅 배포·도메인 DNS(SPF/DKIM)·시크릿 등록은 권한 필요 → 에이전트가 자동 불가. 실발송은 외부·비가역이라 승인 하 수행.

### 항목3-B · 허브 Progressive Disclosure + 시그니처 상단 ✓
- **무엇:** 허브 IA를 §5 와이어프레임대로 재구성 — ① 시그니처 배너를 **내 정보 바로 아래(최우선)**로 상향(기존 최하단), ② **'오늘' 1차**(오늘의 운세 + 다이어리)만 노출, ③ 나머지 5모드(주간·내사주카드·평생·궁합·타로)는 **'운세 더 보기'(개수 배지·▾)** 로 접어 클러터 제거, ④ 발송 진행 바는 상단 유지. 모드 카드 마크업을 재사용 컴포넌트 `HubModeCard`로 추출(1차/2차 공용, DRY).
- **왜:** 6개 모드 동시 노출의 인지 부하↓ + 수익 경로(시그니처) 가시성↑ + 일일 행동 집중.
- **검증:** 빌드 정상. Playwright 11개 플래그 — 1차(시그니처·오늘의운세·다이어리) 노출, **시그니처가 일일 액션보다 위**(bounding box y 비교), 2차 모드 초기 숨김 → '운세 더 보기' 클릭 시 5모드 노출 → '접기' 재숨김.

### 시그니처 리포트 듀얼 테마 디자인 시스템 ✓
- **무엇:** 리포트(PDF·이메일)용 디자인 토큰 SSOT [`reportTheme.js`](src/lib/reportTheme.js) 신설 — 라이트/다크 시맨틱 토큰(`color-bg-*`/`color-text-*`/`color-brand-*`/`color-cta-*`) + 테마 적응형 오행색(`reportElems`: 라이트=print/다크=color). `reportPdf.js`·`emailTemplate.js`가 토큰을 소비하도록 리팩터 → 두 산출물의 **팔레트 드리프트 제거**(이메일 INK/BODY/DIM 등이 PDF와 미세하게 달랐음 → 통일·대비 개선). 이메일에 토큰 기반 **CTA 버튼**(`d.ctaUrl` 있을 때만) 추가.
- **왜:** "흑/백 배경 양쪽에서 전문적·일관." 앱은 다크 전용 유지(브랜드), 리포트만 듀얼.
- **WCAG:** 구조·브랜드 토큰 전부 AA↑(대부분 AAA) 실측 검증. 오행색은 대형/그래픽 전용 규칙(라이트 소형 본문 미사용). 다크 오행색을 print→color로 바꿔 네이비에서 또렷·AAA.
- **검증:** 빌드 정상 + 변경 3파일 신규 린트 0. 오프라인 미리보기(Gemini 무호출)로 light/dark PDF 명식·차트 + 라이트 이메일 육안 확인. 스펙 문서 [`SIGNATURE_REPORT_DESIGN.md`](SIGNATURE_REPORT_DESIGN.md).

### 항목2 · 시그니처 발송 워크플로우 ✓
- **무엇:** (1) **요약 확인 모달** — '리포트 신청하기' → 생년월일·태어난 시각·이메일을 재노출하는 커스텀 `ConfirmDialog`([수정]/[맞아요, 신청])로 오발송 방지. (2) **적응형 ETA** `assessDispatchEta()` — 대기열(미발송 pending)·피크시간(심야 22–01·점심 12–14)·랜덤 혼잡도 중 하나라도 참이면 10분, 아니면 5분. (3) **도착 안내** — 완료 화면에 "시그니처 리포트를 **[도착시각]**에 보내드릴게요 · 약 N분 후"(혼잡 시 '정성껏 준비 중' 문구 추가). (4) **허브 진행바** `DispatchStatusBar` — `cm_report_pending` 읽어 카운트다운/진행바, 도착 시각 도달 시 '발송 완료 ✦' + 닫기(X).
- **데이터:** `localStorage.cm_report_pending = { email, birth, nickname, mode, sendAt, etaMin, congested, createdAt }`. 공용 포맷터 `fmtBirthDate/fmtBirthTime/fmtClock`(saju.js)로 전문용어 없이 자연스러운 한국어.
- **검증:** 빌드 정상. Playwright 11개 플래그 통과 — 모달(2004년 11월 3일·새벽 3시 13분·hmcf7nz7@naver.com 재노출), ETA 안내(오후 4시·약 5분 후), 허브 진행바(준비 중·N분 남음), 경과 후 '발송 완료'·닫기.
- **⚠️ 한계:** 실제 메일 발송은 서버리스(F2·항목4) 도입 후 라이브. 현재 '발송 완료'는 클라이언트 시뮬레이션(카운트다운 종료) — 실제 메일은 아직 나가지 않음.

### Task16 · 결과화면 중복 진입점 제거 ✓
- **무엇:** 결과화면 본문의 인라인 '시그니처 리포트'(`PremiumButton`)를 제거. 시그니처 진입은 메인 허브의 단일 배너(`PremiumHubCard`)로 일원화. 하단은 [공유][**메인으로**] 단일 1차 동선 유지.
- **왜:** 같은 진입점이 결과화면·허브에 중복 → 인지 부하·시각 산만. 허브에 이미 존재하므로 결과화면 것은 잉여.
- **정리(죽은 코드):** 결과 진입 제거로 `reportFrom` 상태(허브/결과 분기) 불필요 → 제거하고 리포트 복귀는 항상 '허브로 돌아가기'로 단순화. 미사용 `onRetry`(다시보기) 플럼빙·`canPremium`·`PremiumButton` 컴포넌트·미사용 `RefreshCcw` import까지 제거.
- **검증:** 빌드 정상 + App.jsx 신규 린트 오류 0(RefreshCcw 미사용 오류 해소). Playwright (1) 허브→시그니처 카드 클릭→리포트 신청 화면 도달·'허브로 돌아가기' 라벨 확인, (2) 캐시된 운세 주입해 결과화면 렌더→인라인 SIGNATURE 배지 0개·'메인으로' 단일 버튼 확인.

### 항목1 · Navy+Gold 리페인트(절충) ✓
- **무엇:** 베이스 `#07060d`→**딥 네이비 `#070a16`**, `--ink-dim` 대비↑, `--gold` 토큰 추가. Background 그라데이션/오로라를 네이비+따뜻한 골드 한 점으로. theme-color·manifest 네이비. 보석 멀티톤은 모드 카테고리 기능색으로 유지(절충).
- **검증:** 허브 캡처로 무드 확인(딥 네이비+골드 시그니처). 빌드 정상.

### 항목3-A · 결과화면 선형 내비 ✓
- **무엇:** 하단 바를 [공유][**메인으로**(주버튼·Home아이콘)]로. '다시 보기' 제거, 상단 중복 BackBar 제거(하단 고정 메인으로가 항상 노출). 폰트버튼 aria-label.
- (항목3-B Progressive Disclosure 허브 '더보기' 접기는 다음.)

### F1 · 공유 이미지 카드 ✓ (바이럴 레버)
- **무엇:** `src/ui/shareCard.js` — 캔버스로 1080×1350 브랜드 카드(점수 링/사주카드 타이틀 + 한 줄 인용 + 일주 + 해시태그 + 궤도 그래픽) 생성. `share()`가 PNG Blob → `navigator.share({files})`(모바일), 미지원 시 다운로드 + 텍스트 복사, 캔버스 실패 시 텍스트 공유 폴백.
- **검증:** Playwright로 navigator.share 스텁→생성 파일 가로채 PNG 저장·육안 확인(점수 94 카드).

### B3 · analyze 재시도 ✓
- **무엇:** 6개 모드 호출(analyze)에 backoff 재시도 추가(과부하 5xx·429·빈응답 → 최대 3회). 키 오류·타임아웃은 즉시 포기. (테스트 중 Gemini 과부하로 실제 발생 → 수정.)

### B4 · ScoreHistoryChart 캐스케이드 렌더 ✓
- **무엇:** effect 내 동기 setState → `useState(() => …)` lazy-init로 변경(1회 읽기, 미사용 setter 제거).

### Task5 · 포용 디자인(기본 가독성) ✓
- **무엇:** 생년월일 휠/라벨을 기본값부터 크게·고대비로. WheelPicker 행높이 46→52, 선택 1.18→1.45rem, 비선택 0.95→1.12rem·투명도 바닥 0.18→0.5·색 0.5→0.92, 컬럼/필드 라벨 확대+밝은 보라.
- **왜:** 고령 사용자는 폰트크기 버튼 사용을 꺼림 → 기본값을 WCAG AAA급으로 올려 조절 없이도 읽히게(자연스러운 접근성).
- **검증:** 셋업 재캡처로 비선택 항목·라벨 가독성 향상 확인. 디자인 스펙(메모리)에 원칙 반영.

### Task4 · 허브 프리미엄 배치 ✓
- **무엇:** 모드 그룹 아래 "✦ 스페셜" 라벨 + 금색 듀얼톤 글로우·미니 리포트 스택·PREMIUM 태그의 단일 배너. 진입 출처(`reportFrom`)에 따라 뒤로가기 분기(허브/결과) + 동적 라벨.
- **왜:** 핵심 수익 경로를 허브에서 노출하되, 주 기능(운세 모드) 위가 아닌 아래에 단일 카드로 두어 어지럽히지 않음.
- **검증:** Playwright로 배너 존재 + 허브/결과 양쪽 진입·복귀 확인.

### Task3 · 일기 텍스트 펼치기/접기 ✓
- **무엇:** 재사용 `ExpandableText`(실측 overflow 감지 → 2줄 초과 시에만 더보기/접기). 일기 허브·다이어리 미리보기에 적용, 기존 글자수 휴리스틱·openKey 상태 제거(SRP).
- **검증:** 긴 일기에서 '더보기' 노출 확인.

### Task2 · 삭제 다이얼로그 ✓
- **무엇:** 삭제/초기화를 `window.confirm`(네이티브 OS 다이얼로그·시스템 폰트)로 표준화 + 명확한 되돌릴 수 없음 고지. 커스텀/숨김 UI 배제.
- **검증:** Playwright dialog 이벤트로 메시지 노출 확인.

### 시진 제거 ✓ · D2 팔레트 중앙화 ✓
- 시진(자시·사시 등) 표현을 시(時) 휠/안내에서 제거(전문용어 노출 최소화). 오행 색을 `saju.js OHAENG`(color/print) 단일 소스로 통합 → reportPdf·email·App가 파생(DRY).

### B1 · 폰트 로딩 (🔴→✓)
- **무엇:** Google Fonts를 `index.css @import` → `index.html <link>`(+preconnect)로 이전.
- **왜:** `@import`가 `@import "tailwindcss"`·`@config` 뒤에 있어 PostCSS가 빌드에서 누락시킬 수 있었음(폰트 미로드 위험). `<link>`는 빌드 안전 + preconnect로 더 빠름.
- **검증:** 빌드에서 "@import must precede" 경고 사라짐, `dist/index.html`에 preconnect/폰트 링크 포함 확인.
