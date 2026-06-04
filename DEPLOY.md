# 시그니처 리포트 — 실발송(F2) 운영 런북

> 현재 앱의 발송 워크플로우(요약 모달·ETA·허브 진행바)는 **클라이언트 시뮬레이션**이다.
> 실제 메일이 나가려면 아래 ①~③ 외부 설정이 필요하다. **이 단계는 배포·DNS·시크릿 권한이 있는 운영자(=프로젝트 소유자)의 수동 작업**이며, 에이전트가 자동 수행할 수 없다.

## 현재 상태 (이미 동작하는 것)
- 로컬 end-to-end 파이프라인: [`scripts/send-report.mjs`](scripts/send-report.mjs) — 리포트 생성 → PDF 렌더(Playwright) → **Resend로 HTML+PDF 첨부 발송**. 실행: `node --env-file=.env.local scripts/send-report.mjs`.
- 단, 발신자가 Resend 테스트 주소 `onboarding@resend.dev` → **계정 소유자 인증 메일(son884999@gmail.com)로만** 도착. 임의 수신자는 ① 도메인 인증 후 가능.
- 시크릿: `RESEND_API_KEY`는 `.env.local`(git 미포함)에서만 읽음. **키는 코드/로그/채팅에 출력 금지**(테스트 스크립트의 키 일부 로그도 제거 완료).

## ⓪ (대안) Gmail SMTP — 도메인 인증 없이 임의 수신자 발송
도메인 없이 바로 임의 주소로 보내려면 Gmail SMTP가 가장 쉽다. 발신 주소는 본인 Gmail로 고정되고, 무료 한도 ~500통/일.
1. Google 계정 **2단계 인증 켜기** → https://myaccount.google.com/apppasswords 에서 **앱 비밀번호(16자)** 발급.
2. `.env.local` 에 추가 (git 미포함, 값은 절대 출력 금지):
   ```
   GMAIL_USER=you@gmail.com
   GMAIL_APP_PASSWORD=앱비밀번호16자공백없이
   ```
3. 실행: `node --env-file=.env.local scripts/send-report-smtp.mjs --to 수신자@x.com --name 예린 --birth 2004-11-3 --time 3:13`
   (점검만: `--dry` 추가 → 생성·렌더만, 발송 생략)
- 구현: [`scripts/send-report-smtp.mjs`](scripts/send-report-smtp.mjs) (nodemailer, 포트 465 SSL). HTML 템플릿은 Resend 경로와 동일하게 재사용.
- 한계: 발신=Gmail 주소, 일일 한도/스팸 위험. 서버리스 자동발송엔 SMTP 포트 제약 → 인앱 자동화는 ②(HTTPS API) 권장. 로컬/소규모엔 이 경로로 충분.
- ✅ **검증:** 손용범(2004-11-3 03:13) 리포트 생성→PDF 첨부→son884999@gmail.com 실제 발송 성공(messageId 수신). 파이프라인 end-to-end 동작 확인.

## ① Resend 도메인 인증 (임의 수신자 발송 조건)
1. Resend 대시보드 → Domains → 보유 도메인 추가.
2. 안내된 **SPF/DKIM(및 DMARC 권장) DNS 레코드**를 도메인 DNS에 등록.
3. 검증 완료 후 발신자를 `천문 <noreply@yourdomain>` 형태로 교체(코드의 `from` 두 곳: send-report/send-test, 그리고 ②의 함수).

## ② Netlify 배포 — PC 없이 인앱 실발송 ✅ (구현 완료)
앱이 호출하는 발송 로직을 Netlify Function으로 올리면, **사용자 PC와 무관하게 클라우드가 24/7 발송**한다.

**구현된 파일**
- 함수: [`netlify/functions/send-report.mjs`](netlify/functions/send-report.mjs) — POST `{email,name,birth}` → `generateReport`(서버) → `renderUserReportEmail` → Gmail SMTP 발송 → `{ok,messageId}`.
- 설정: [`netlify.toml`](netlify.toml) — build `npm run build`, publish `dist`, functions `netlify/functions`, `VITE_MAIL_ENDPOINT=/.netlify/functions/send-report`(같은 도메인 → CORS 불필요).
- 앱: `confirmDispatch`가 `VITE_MAIL_ENDPOINT`로 POST(개발=로컬 서버 / 배포=이 함수). 실패 시 ETA 안내로 graceful 폴백.

**배포 절차**
1. 코드를 GitHub에 푸시(또는 Netlify에 프로젝트 폴더 드래그-드롭).
2. Netlify → **Add new site → Import from Git** → 저장소 선택. 빌드 설정은 `netlify.toml`이 자동 적용.
3. **Site configuration → Environment variables** 에 등록(절대 커밋 금지):

   | 변수 | 용도 |
   |---|---|
   | `GMAIL_USER` | 발송 Gmail 주소 (함수) |
   | `GMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 16자 (함수) |
   | `GEMINI_API_KEY` | 리포트 생성 (함수·서버 전용) |
   | `VITE_GEMINI_API_KEY` | 인앱 운세 모드(클라이언트) — ⚠️ 번들에 노출됨 |

4. **Deploy site**. 완료 후 배포 URL에서 시그니처 리포트 신청 → 입력한 이메일로 발송 확인(스팸/프로모션함 포함).

**주의**
- 동기 함수 타임아웃 ≈ 10초. 리포트 생성(Gemini 4회)이 느려 초과하면 앱은 폴백 안내로 빠진다 → 필요 시 **Background Function**(`*-background.mjs`, Netlify Pro)으로 전환하면 최대 15분.
- PDF 첨부는 서버리스 Chromium(`@sparticuz/chromium`)이 필요해 번들이 무겁다 → **1차는 전체 내용이 담긴 HTML 본문** 발송. PDF가 꼭 필요하면 별도 도입(또는 호스팅 PDF 링크를 `ctaUrl`로).
- 커스텀 발신주소(`noreply@yourdomain`)를 원하면 ① Resend 도메인 인증 경로.

### 로컬 개발에서 인앱 실발송 테스트
배포 전 로컬에서도 동일 흐름 확인 가능:
```
node --env-file=.env.local scripts/mail-server.mjs   # 별도 터미널 (localhost:8787)
npm run dev                                           # 앱 (VITE_MAIL_ENDPOINT 기본=localhost:8787)
```
앱에서 리포트 신청 → 입력 이메일로 실제 발송.

## 보안 체크리스트
- [ ] 키는 호스팅 시크릿/`.env.local`에만. 코드·로그·클라이언트 번들·채팅 어디에도 노출 금지.
- [ ] 함수 응답/에러에 키·전체 요청 헤더를 echo하지 않음.
- [ ] 발신 도메인 SPF/DKIM 정렬(스팸 방지).
- [ ] 실발송은 외부·비가역 → 운영자 승인 하에 수행.
