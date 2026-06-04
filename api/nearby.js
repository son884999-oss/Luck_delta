/* ================================================================
   천문식탁 — 주변 식당 프록시 (Vercel Serverless)
   카카오 로컬 dapi는 브라우저 직접 호출 시 403(CORS)이라 서버에서 호출한다.
   키: KAKAO_REST_KEY (없으면 VITE_KAKAO_REST_KEY 도 허용 — Vercel은 함수에
       모든 환경변수를 노출). 메뉴 키워드로 검색, 0개면 주변 음식점(FD6) 폴백.

   GET /api/nearby?lat=..&lng=..&dishes=순두부찌개,콩나물국밥&radius=5000&limit=3
================================================================ */
const KEY = process.env.KAKAO_REST_KEY || process.env.VITE_KAKAO_REST_KEY;

const shortCategory = (c = '') => c.split('>').pop().trim() || '음식점';
const cleanDishQuery = (d = '') =>
  d.replace(/\([^)]*\)/g, '').replace(/\s*(백반|정식|한상|세트|요리|전문점?)\s*$/g, '').trim();
const toPlace = (d, dish) => ({
  name: d.place_name, dish,
  catShort: shortCategory(d.category_name),
  distance: Number(d.distance) || 0,
  url: d.place_url,
  address: d.road_address_name || d.address_name || '',
  x: d.x, y: d.y,                 // 경도/위도 — 인앱 지도 마커용
});

async function kakao(url) {
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
  if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error(`kakao ${r.status} ${t.slice(0, 120)}`); e.status = r.status; throw e; }
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!KEY) return res.status(500).json({ error: 'KAKAO_REST_KEY 미설정' });

  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng 필요' });
  const radius = Math.min(20000, parseInt(req.query.radius) || 5000);
  const limit = Math.min(5, parseInt(req.query.limit) || 3);
  const dishes = String(req.query.dishes || '').split(',').map(s => s.trim()).filter(Boolean);

  try {
    const seen = new Set();
    const out = [];
    for (const dish of dishes) {
      if (out.length >= limit) break;
      const q = cleanDishQuery(dish);
      if (!q) continue;
      const j = await kakao(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&x=${lng}&y=${lat}&radius=${radius}&size=5&sort=distance`);
      for (const d of (j.documents || [])) {
        if (out.length >= limit) break;
        if (seen.has(d.place_name)) continue;
        seen.add(d.place_name);
        out.push(toPlace(d, dish));
      }
    }
    // 폴백: 메뉴별 0개면 주변 음식점(FD6)이라도
    if (!out.length) {
      const j = await kakao(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=${radius}&size=${limit}&sort=distance`);
      for (const d of (j.documents || []).slice(0, limit)) out.push(toPlace(d, '주변 맛집'));
    }
    out.sort((a, b) => a.distance - b.distance);
    return res.status(200).json({ places: out });
  } catch (e) {
    return res.status(e.status || 502).json({ error: e.message });
  }
}
