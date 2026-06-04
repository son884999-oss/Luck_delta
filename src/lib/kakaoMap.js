/* ================================================================
   천문식탁 — 카카오 지도 JS SDK 로더 (인앱 지도용)
   JavaScript 키는 브라우저 노출이 정상(카카오가 등록 도메인으로 제한).
   키 없거나 SDK 로드 실패 시 호출부가 리스트로 폴백한다.
   ※ JS SDK는 등록된 Web 도메인에서만 동작(REST 프록시와 달리 도메인 검사).
================================================================ */
const JS_KEY = (import.meta.env?.VITE_KAKAO_JS_KEY || '').trim();
export const hasKakaoJsKey = () => !!JS_KEY;

let loaderPromise = null;

/* 카카오 지도 SDK를 1회만 로드하고 준비되면 resolve. */
export function loadKakaoMaps() {
  if (!JS_KEY) return Promise.reject(new Error('no-kakao-js-key'));
  if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) return Promise.resolve(window.kakao);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`;
    s.onload = () => {
      try { window.kakao.maps.load(() => resolve(window.kakao)); }
      catch (e) { reject(e); }
    };
    s.onerror = () => { loaderPromise = null; reject(new Error('kakao-sdk-load-failed')); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/* 카카오맵 길찾기 딥링크 — 키 불필요.
   origin(사용자 현재 위치 {lat,lng})이 있으면 from/to로 출발지까지 넣어 '진짜 경로'를
   띄운다. to-only(link/to)는 출발지가 비어(rt=,,...) 기본 지도만 떠서 길찾기가 안 됐다.
   place.y=위도, place.x=경도. */
export const directionsUrl = (place, origin) => {
  const dest = `${encodeURIComponent(place.name)},${place.y},${place.x}`;
  if (origin && origin.lat != null && origin.lng != null)
    return `https://map.kakao.com/link/from/${encodeURIComponent('내 위치')},${origin.lat},${origin.lng}/to/${dest}`;
  return `https://map.kakao.com/link/to/${dest}`;
};
