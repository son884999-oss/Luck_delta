/* ================================================================
   천문식탁 — 주변 식당 (서버 프록시 /api/nearby 경유)
   카카오 로컬 dapi는 브라우저 직접 호출 시 403(CORS)이라 서버에서 호출한다.
   키는 서버 환경변수(KAKAO_REST_KEY 또는 VITE_KAKAO_REST_KEY)에 둔다 →
   클라이언트 번들에 키가 안 박히고, 카카오 Web 도메인 등록도 불필요.
================================================================ */

// 키 보유/검증은 서버(/api/nearby)가 판단 → 클라에선 항상 시도.
export const hasPlacesKey = () => true;

/* 메뉴 이름들(메인+대안)로 주변 식당을 찾는다. → [{name, dish, catShort, distance, url, address}] */
export async function searchRestaurantsByDishes(dishes, { lat, lng, radius = 5000, limit = 3 }) {
  const q = encodeURIComponent((dishes || []).filter(Boolean).join(','));
  const resp = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}&dishes=${q}`);
  if (!resp.ok) {
    const j = await resp.json().catch(() => ({}));
    throw new Error(j.error || `nearby ${resp.status}`);
  }
  const j = await resp.json();
  return j.places || [];
}

/* 메뉴 대표 이미지 후보들(서버 프록시 /api/food-image 경유). 메뉴명별 localStorage 캐시.
   반환: [{ image, thumb, w, h }] — 호출부가 앞에서부터 로드 시도(고화질 우선), 다 실패하면 이모지 폴백. */
export async function fetchFoodImage(name) {
  const key = `cm_food_img3_${name}`;  // v3: 후보 리스트 + 품질 필터
  try { const c = localStorage.getItem(key); if (c !== null) return JSON.parse(c); } catch (e) {}
  try {
    const resp = await fetch(`/api/food-image?q=${encodeURIComponent(name)}`);
    if (!resp.ok) return [];
    const j = await resp.json();
    const arr = j.candidates || [];
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
    return arr;
  } catch (e) { return []; }
}
