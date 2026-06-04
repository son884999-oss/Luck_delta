/* ================================================================
   Gmail SMTP 발송 (nodemailer) — 리포트 생성 → PDF 첨부 → 임의 수신자 발송.
   도메인 인증 불필요(발신=본인 Gmail 주소). 브라우저 불가 → 로컬/노드에서 실행.

   .env.local 필요:
     GMAIL_USER=you@gmail.com
     GMAIL_APP_PASSWORD=앱비밀번호16자          (공백 없이, 일반 비번 아님)
     VITE_GEMINI_API_KEY=...                     (리포트 생성용, 기존과 동일)

   실행 예:
     node --env-file=.env.local scripts/send-report-smtp.mjs --to someone@example.com --name 예린 --birth 2004-11-3 --time 3:13
   옵션:
     --time 모름   출생 시각 미상
     --dry         생성·PDF·렌더까지만, 실제 발송은 생략(파이프라인 점검용)
================================================================ */
import nodemailer from 'nodemailer';
import { chromium } from 'playwright';
import { generateReport } from '../src/lib/fortune.js';
import { renderReportPdfHtml } from '../src/lib/reportPdf.js';
import { renderCoverEmail } from '../src/lib/emailTemplate.js';

// ── 인자 파싱 (--key value) ──
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const key = argv[i].slice(2);
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i++; } else args[key] = true;
}

const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD;
const isDry = !!args.dry;
const to = args.to;
const name = args.name || '천문';
// 실제 발송에만 자격증명·수신자 필요. --dry(생성·렌더만)는 둘 다 없어도 됨.
if (!isDry) {
  if (!USER || !PASS) { console.log('❌ .env.local 에 GMAIL_USER, GMAIL_APP_PASSWORD 가 필요합니다.'); process.exit(1); }
  if (!to) { console.log('❌ --to 수신자 이메일 주소가 필요합니다.'); process.exit(1); }
}

// 생년월일/시각 파싱
const [by, bm, bd] = String(args.birth || '2004-11-3').split('-');
let bh = '모름', bmin = '0';
if (args.time && args.time !== '모름') {
  const [h, m] = String(args.time).split(':');
  bh = h; bmin = m || '0';
}
const birth = { y: by, m: bm, d: bd, h: bh, min: bmin };

if (!isDry) console.log('SMTP 인증 정보 감지됨 ✓ (자격증명은 출력하지 않음)');
console.log(`수신자: ${to || '(dry · 미지정)'} · 이름: ${name} · 생년월일: ${by}-${bm}-${bd} ${bh === '모름' ? '(시각 미상)' : `${bh}:${bmin}`}`);

console.log('1) 리포트 생성 중…(Gemini)');
const data = await generateReport(birth, name);
console.log(`   완료 — ${data.ilju} 일주`);

console.log('2) PDF 렌더 중…');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.setContent(renderReportPdfHtml(data, 'light'), { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const pdfBuf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
console.log(`   PDF ${(pdfBuf.length / 1024).toFixed(0)}KB`);

const html = renderCoverEmail(data);
const subject = `${name}님을 위한 천문 시그니처 리포트 ✦`;

if (isDry) {
  console.log('🟡 DRY 모드 — 실제 발송 생략(생성·렌더 정상). 발송하려면 --dry 빼고 수신자(--to)와 Gmail 자격증명을 지정하세요.');
  process.exit(0);
}

console.log('3) Gmail SMTP 발송 중…');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // 465 = SSL
  auth: { user: USER, pass: PASS },
});
const info = await transporter.sendMail({
  from: `천문 <${USER}>`,
  to,
  subject,
  html,
  attachments: [{ filename: `천문_시그니처리포트_${name}.pdf`, content: pdfBuf }],
});
console.log(`   ✅ 발송 완료 — messageId ${info.messageId}`);
console.log(`   ${to} 의 받은편지함(+스팸/프로모션함) 확인하세요.`);
