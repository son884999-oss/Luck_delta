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

    // 후보 정규화 — https 썸네일 필수. image(고화질 원본)는 있으면 같이.
    const norm = docs
      .filter(d => /^https:/.test(d.thumbnail_url || ''))
      .map(d => ({
        image: /^https:/.test(d.image_url || '') ? d.image_url : null,
        thumb: d.thumbnail_url,
        w: d.width || 0, h: d.height || 0,
      }));
    const ar = d => (d.h > 0 ? d.w / d.h : 1);
    // 품질 필터 — 해상도 충분 + 정사각/가로에 가까운 비율(세로 메뉴판·영수증·배너 제거)
    const strict = norm.filter(d => d.w >= 500 && ar(d) >= 0.75 && ar(d) <= 1.8);
    const relaxed = norm.filter(d => d.w >= 300 && ar(d) >= 0.6 && ar(d) <= 2.2);
    const ranked = (strict.length ? strict : relaxed)
      .sort((a, b) => Math.abs(1 - ar(a)) - Math.abs(1 - ar(b))) // 정사각에 가까운 순(카드에 잘 맞음)
      .slice(0, 6);

    return res.status(200).json({ candidates: ranked, count: docs.length });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
