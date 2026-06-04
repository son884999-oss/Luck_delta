/* ================================================================
   천문 — 로컬 메일 발송 서버 (개발용 브리지)
   브라우저는 직접 메일을 못 보내므로, 앱이 이 엔드포인트로 POST하면
   서버가 리포트 생성 → PDF 렌더 → Gmail SMTP 발송을 수행한다.
   (배포 시엔 동일 로직을 서버리스 함수로 옮기면 됨. DEPLOY.md ② 참고)

   실행: node --env-file=.env.local scripts/mail-server.mjs
   .env.local 필요: GMAIL_USER, GMAIL_APP_PASSWORD, VITE_GEMINI_API_KEY
   엔드포인트: POST http://localhost:8787/api/send-report
     body: { email, name, data }   // data = generateReport() 결과(앱이 생성해 전달)
           또는 { email, name, birth } // data 없으면 서버가 생성(직접 테스트용)
     resp: { ok, messageId } | { ok:false, error }
================================================================ */
import http from 'node:http';
import nodemailer from 'nodemailer';
import { chromium } from 'playwright';
import { generateReport } from '../src/lib/fortune.js';
import { renderReportPdfHtml } from '../src/lib/reportPdf.js';
import { renderCoverEmail, renderUserReportEmail } from '../src/lib/emailTemplate.js';

const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD;
if (!USER || !PASS) { console.log('❌ .env.local 에 GMAIL_USER, GMAIL_APP_PASSWORD 필요'); process.exit(1); }
const PORT = Number(process.env.MAIL_PORT) || 8787;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS },
});

const server = http.createServer((req, res) => {
  // CORS (개발용 — 로컬 origin 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !req.url.startsWith('/api/send-report')) { send(404, { ok: false, error: 'not found' }); return; }

  let body = '';
  req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const { email, name = '천문', birth } = payload;
      let { data } = payload;
      if (!email || !String(email).includes('@') || (!data && !birth?.y)) { send(400, { ok: false, error: 'email + (data 또는 birth) 필요' }); return; }
      if (!data) { console.log(`[gen] ${name} ${birth.y}-${birth.m}-${birth.d}`); data = await generateReport(birth, name); }
      console.log(`[send] ${email} · ${name} · 일주 ${data.ilju}`);

      let pdf = null;
      try {
        const browser = await chromium.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
        await page.setContent(renderReportPdfHtml(data, 'light'), { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        pdf = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
      } catch (pe) { console.log('   ⚠️ PDF 렌더 실패 → HTML 본문 폴백:', pe.message); }

      const mail = pdf
        ? { html: renderCoverEmail(data), attachments: [{ filename: `천문_시그니처리포트_${name}.pdf`, content: pdf }] }
        : { html: renderUserReportEmail(data) };
      const info = await transporter.sendMail({ from: `천문 <${USER}>`, to: email, subject: `${name}님을 위한 천문 시그니처 리포트 ✦`, ...mail });
      console.log(`   ✅ 발송 완료 — ${info.messageId}${pdf ? ' (PDF 첨부)' : ' (HTML 폴백)'}`);
      send(200, { ok: true, messageId: info.messageId, pdf: !!pdf });
    } catch (e) {
      console.log('   ❌ 실패 —', e.message);
      send(500, { ok: false, error: e.message });
    }
  });
});

server.listen(PORT, () => {
  console.log(`✉️  천문 메일 서버 실행 중 → http://localhost:${PORT}/api/send-report`);
  console.log('   (Gmail SMTP · 자격증명은 출력하지 않음) · 종료: Ctrl+C');
});
