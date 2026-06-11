/* ================================================================
   천문 — Gemini 프록시 (Vercel Serverless)
   브라우저가 키 없이 호출 → 서버에서 GEMINI_API_KEY로 대신 호출.
   목적: VITE_GEMINI_API_KEY를 번들에 박지 않아 키 도용을 막는다.
   운영 배포 시 VITE_GEMINI_API_KEY는 '설정하지 말고', GEMINI_API_KEY(서버 전용)만 둔다.

   POST /api/gemini  body: { model, payload }  → Gemini generateContent 응답 그대로
================================================================ */
const KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });

  const { model, payload } = req.body || {};
  // 모델명 화이트리스트 검증(경로 주입 방지)
  const m = /^[a-z0-9.-]+$/i.test(String(model || '')) ? model : 'gemini-3.1-flash-lite';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}),
    });
    const text = await r.text();               // 응답 본문 그대로 전달(상태코드 보존 → 클라 에러 분류 유지)
    res.setHeader('Content-Type', 'application/json');
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
