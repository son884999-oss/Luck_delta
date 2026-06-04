/* ================================================================
   천문식탁 — 메뉴 대표 이미지 프록시 (Vercel Serverless)
   카카오 이미지 검색(dapi)은 브라우저 직접 호출 시 CORS/키노출 문제라 서버에서 호출한다.
   키: KAKAO_REST_KEY (nearby.js와 동일 · 없으면 VITE_KAKAO_REST_KEY 허용).

   GET /api/food-image?q=갈치조림  →  { image, thumb }
================================================================ */
const KEY = process.env.KAKAO_REST_KEY || process.env.VITE_KAKAO_REST_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // 결과는 하루 캐시(메뉴별 대표 이미지는 자주 바뀔 필요 없음)
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!KEY) return res.status(500).json({ error: 'KAKAO_REST_KEY 미설정' });

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q 필요' });

  try {
    const url = `https://dapi.kakao.com/v2/search/image?query=${encodeURIComponent(q + ' 음식')}&size=20&sort=accuracy`;
    const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `kakao ${r.status} ${t.slice(0, 120)}` });
    }
    const j = await r.json();
    const docs = j.documents || [];
    // https + 가로(또는 정사각)에 가까운 적당한 크기를 우선 → 카드 hero로 깔끔하게.
    const pick = docs.find(d => /^https:/.test(d.image_url || '') && (d.width || 0) >= 400 && (d.width || 0) >= (d.height || 0) * 0.8)
      || docs.find(d => /^https:/.test(d.image_url || ''))
      || docs[0];
    if (!pick) return res.status(200).json({ image: null, thumb: null });
    return res.status(200).json({
      image: /^https:/.test(pick.image_url || '') ? pick.image_url : (pick.thumbnail_url || null),
      thumb: pick.thumbnail_url || null,
    });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
