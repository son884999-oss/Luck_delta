/* ================================================================
   천문 — Vercel Serverless Function: 공유 랜딩(결과별 OG 메타 + 리다이렉트)
   GET /api/share?t=..&s=87&q=..&i=갑자&e=화&c=fb7185
   봇(카카오톡/페북/트위터)이 긁으면 결과별 og:image(/api/og?...)가 박힌 HTML을,
   사람이 열면 즉시 앱(/)으로 보낸다. SPA가 정적 og.png만 노출하는 한계를 우회.
================================================================ */
import { ogParams } from './_ogCard.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export default function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const qs = url.searchParams.toString();
  const p = ogParams(Object.fromEntries(url.searchParams.entries()));

  const title = typeof p.score === 'number'
    ? `천문 · 오늘의 운세 ${p.score}점`
    : `천문 · ${p.headline}`;
  const desc = p.sub || '태어난 순간의 하늘을 읽어, 오늘의 운세부터 평생 사주까지.';
  // 절대 URL — 카카오톡/페북 일부 봇은 상대경로 og:image를 못 읽는다
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = host ? `${proto}://${host}` : '';
  const ogImg = `${origin}/api/og?${qs}`;
  const app = `${origin}/`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 미리보기 이미지는 영구 캐시 가능하나, 랜딩 HTML은 가볍게 짧은 캐시
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
  res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="천문">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<link rel="canonical" href="${app}">
<meta http-equiv="refresh" content="0; url=${app}">
<script>location.replace(${JSON.stringify(app)});</script>
</head><body style="margin:0;background:#070611;color:#cbd5e1;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
천문으로 이동 중… <a href="${app}" style="color:#a78bfa;margin-left:8px">바로가기</a>
</body></html>`);
}
