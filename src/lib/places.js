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
