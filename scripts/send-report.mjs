/* 2단계 end-to-end: 리포트 생성 → HTML 본문 + PDF 첨부 → Resend 발송.
   실행: node --env-file=.env.local scripts/send-report.mjs */
import { chromium } from 'playwright';
import { generateReport } from '../src/lib/fortune.js';
import { renderReportPdfHtml } from '../src/lib/reportPdf.js';
import { renderCoverEmail, renderAdminEmail } from '../src/lib/emailTemplate.js';

const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.log('NO RESEND KEY'); process.exit(1); }

// 인자 파싱 (--key value) — 기본값은 테스트용
const argv = process.argv.slice(2); const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2), n = argv[i + 1];
  if (n && !n.startsWith('--')) { args[k] = n; i++; } else args[k] = true;
}
const to = args.to || 'son884999@gmail.com';
const name = args.name || '예린';
const [by, bm, bd] = String(args.birth || '2004-11-3').split('-');
let bh = '3', bmin = '13';
if (args.time === '모름') { bh = '모름'; bmin = '0'; }
else if (args.time) { const [h, m] = String(args.time).split(':'); bh = h; bmin = m || '0'; }
const birth = { y: by, m: bm, d: bd, h: bh, min: bmin };

console.log('1) 리포트 생성 중…');
const data = await generateReport(birth, name);
console.log(`   완료 — ${data.ilju} 일주 / ${data.ohaengPlain} 기운`);

console.log('2) PDF 렌더 중…');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.setContent(renderReportPdfHtml(data, 'light'), { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const pdfBuf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
const pdfB64 = pdfBuf.toString('base64');
console.log(`   PDF ${(pdfBuf.length / 1024).toFixed(0)}KB`);

const send = (body) => fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async r => ({ status: r.status, json: await r.json() }));

console.log('3) 발송 중…');
const userHtml = renderCoverEmail(data);
const r1 = await send({
  from: '천문 <onboarding@resend.dev>',
  to: [ADMIN],
  subject: `[천문] ${name}님을 위한 프리미엄 사주 리포트 ✦`,
  html: userHtml,
  attachments: [{ filename: `천문_프리미엄리포트_${name}.pdf`, content: pdfB64 }],
});
console.log('   [사용자 리포트]', r1.status, JSON.stringify(r1.json));

const adminHtml = renderAdminEmail({ email: 'tester@example.com', nickname: name, birthText: data.birthText, ilju: data.ilju, mode: 'premium', at: new Date().toLocaleString('ko-KR') });
const r2 = await send({ from: '천문 <onboarding@resend.dev>', to: [ADMIN], subject: `[천문] 새 리포트 신청 — ${name}`, html: adminHtml });
console.log('   [관리자 알림]', r2.status, JSON.stringify(r2.json));
console.log('\n완료! son884999@gmail.com 받은편지함(+스팸/프로모션) 확인하세요.');
