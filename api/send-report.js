/* ================================================================
   천문 — Vercel Serverless Function: Resend 이메일 발송
   클라이언트가 이미 생성한 report data + PDF(base64)를 받아 발송.
   PDF는 브라우저에서 html2canvas+jsPDF로 생성(서버 Chromium 불필요).

   POST /api/send-report
     body: { email, name, data, type, pdfBase64? }
     resp: { ok, id } | { ok:false, error }

   Vercel 환경변수: RESEND_API_KEY
================================================================ */

import { renderCoverEmail, renderUserReportEmail, renderStudyReportEmail } from '../src/lib/emailTemplate.js';

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = '천문 <onboarding@resend.dev>';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  if (!RESEND_KEY) return res.status(500).json({ ok: false, error: 'RESEND_API_KEY 미설정' });

  const { email, name = '천문', data, type = 'signature', pdfBase64 } = req.body || {};
  if (!email || !String(email).includes('@') || !data?.ilju) {
    return res.status(400).json({ ok: false, error: 'email 또는 data 누락' });
  }

  const isStudy = type === 'study';
  // 첨부 PDF가 있으면 메일 본문은 가벼운 표지, 없으면 전체 HTML 폴백
  const html = pdfBase64
    ? renderCoverEmail(data)
    : (isStudy ? renderStudyReportEmail(data) : renderUserReportEmail(data));

  const subject = isStudy
    ? `${name}님을 위한 천문 학습 상세 리포트 ✦`
    : `${name}님을 위한 천문 시그니처 리포트 ✦`;

  const filename = isStudy
    ? `천문_학습상세리포트_${name}.pdf`
    : `천문_시그니처리포트_${name}.pdf`;

  const payload = { from: FROM, to: [email], subject, html };
  if (pdfBase64) payload.attachments = [{ filename, content: pdfBase64 }];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);

    console.log(`[send-report] 발송 완료 — ${result.id} → ${email}${pdfBase64 ? ' (PDF 첨부)' : ' (HTML)'}`);
    return res.status(200).json({ ok: true, id: result.id });
  } catch (e) {
    console.error('[send-report] 실패:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
