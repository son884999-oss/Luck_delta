/* ================================================================
   천문 — Service Worker
   전략: Network-first for HTML(항상 최신), Cache-first for 해시 정적 자원
   - /index.html · 네비게이션: 항상 네트워크 우선 → 새 배포 즉시 반영(흰화면 방지)
   - /assets/*.js|css (Vite 해시파일): 캐시 우선 → 재방문 즉시 로드
   - /api/*: 네트워크 우선, 오프라인 시 캐시 폴백
   - 그 외 정적 자원: 네트워크 우선, 실패 시 캐시 폴백

   ⚠️ 핵심 규칙:
   1) Cache.put()은 GET 요청만 지원 → 반드시 method==='GET' 확인 후 캐싱
   2) respondWith()에는 절대 undefined를 넘기지 않는다(페이지가 죽음)
      → 캐시 미스 시에도 항상 유효한 Response 폴백을 보장
================================================================ */
const CACHE = 'cheonmun-v3';
const OFFLINE_URL = '/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/manifest.webmanifest',
      '/favicon.svg',
      '/icon-192.png',
      '/icon-512.png',
    ]).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 캐시 미스/네트워크 실패 시 안전한 폴백 Response (undefined 방지) */
function fallbackResponse() {
  return new Response('', { status: 504, statusText: 'Offline' });
}

/* GET 요청만 캐시에 저장(비-GET은 Cache.put 미지원) */
function cachePut(request, response) {
  if (request.method !== 'GET') return;
  if (!response || !response.ok) return;
  const clone = response.clone();
  caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {});
}

self.addEventListener('fetch', e => {
  const { request } = e;

  // GET 외 요청(POST/HEAD/PUT 등)은 SW가 개입하지 않고 브라우저에 위임
  // → Cache.put 오류 및 불필요한 가로채기 방지
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // 다른 오리진(예: Gemini API, 카카오 등) → 통과(가로채지 않음)
  if (url.origin !== self.location.origin) return;

  // /api/* — 항상 네트워크 우선, 실패 시 캐시 폴백
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then(res => { cachePut(request, res); return res; })
        .catch(() => caches.match(request).then(c => c || fallbackResponse()))
    );
    return;
  }

  // 네비게이션(HTML) — 항상 네트워크 우선으로 새 배포 즉시 반영
  // 오프라인 시에만 캐시 폴백, 그것도 없으면 안전 폴백
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(c => c || caches.match('/index.html')).then(c => c || fallbackResponse())
      )
    );
    return;
  }

  // Vite 해시 정적 자원(/assets/*.js·css) — 캐시 우선(해시 변경 시 새 URL이므로 안전)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(res => { cachePut(request, res); return res; })
          .catch(() => fallbackResponse());
      })
    );
    return;
  }

  // 그 외(이미지·폰트 등) — 네트워크 우선, 실패 시 캐시, 그것도 없으면 안전 폴백
  e.respondWith(
    fetch(request)
      .then(res => { cachePut(request, res); return res; })
      .catch(() => caches.match(request).then(c => c || fallbackResponse()))
  );
});
