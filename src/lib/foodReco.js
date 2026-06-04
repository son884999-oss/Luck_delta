/* ================================================================
   천문 식탁 — 오늘의 메뉴 추천 (100% 클라이언트, 네트워크 0)
   사주 오행 분포 → 부족한 기운을 보강하는 음식을 '오늘의 한 그릇'으로.
   날짜+사주로 시드를 고정해 하루 동안 같은 추천이 유지된다(매일 바뀜).
   네트워크 없이 즉시 오행 기반 추천을 돌려준다.

   ※ 한방 성질·오행 적합도는 전통 명리/한방 식이의 일반 통념을 단순화한 것으로
     의학적 진단이 아닙니다.
================================================================ */

// 오행 상생(보강): KEY 를 낳아 주는(채워 주는) 오행
//   목←수, 화←목, 토←화, 금←토, 수←금
const PARENT = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };

// 식당에서 실제 파는 흔한 메뉴 + 오행 귀속 + 따뜻한 일상어 설명/추천/단점.
// (주변에서 못 사는 집밥 대신 '식당 메뉴'로 구성 → 추천 음식을 바로 찾아 먹을 수 있게)
// el: 이 음식이 보강하는 오행(들). nature: 한방 성질. score: 기본 적합도(보강 시 가산).
const FOODS = [
  // 수(물) — 지혜·차분·신장
  { name: '순두부찌개', el: ['수', '토'], nature: '얼큰하고 부드러운 성질', desc: '보글보글 순두부가 속을 데우고 수분을 채워줘요.', good: '마음이 달뜨고 긴장돼 쉬어가고 싶은 날', bad: '아주 매운 건 순하게', score: 86, benefits: ['수분과 기운 보충', '속을 따뜻하게 데움', '긴장 완화에 도움'] },
  { name: '해물탕', el: ['수'], nature: '시원하고 담백한 성질', desc: '바다의 물 기운이 가득해 머리를 맑게 해줘요.', good: '머리가 무겁고 생각이 복잡한 날', bad: '속이 차면 뜨끈하게', score: 84, benefits: ['머리를 맑게 정돈', '담백한 단백질 보충', '수분 보강'] },
  { name: '미역국 백반', el: ['수', '목'], nature: '담백하고 부드러운 성질', desc: '속을 편안히 데우고 수분을 채워줘요.', good: '기운이 분주하고 마음이 바쁜 날', bad: '소화 약하면 따뜻하게', score: 83, benefits: ['속을 편안하게', '수분·미네랄 보충', '부담 없는 소화'] },
  // 목(나무) — 성장·간·유연
  { name: '비빔밥', el: ['목', '토'], nature: '산뜻하고 든든한 성질', desc: '푸른 나물이 막힌 기운을 풀어 가볍게 해줘요.', good: '몸이 무겁고 나른해 가볍게 풀고 싶은 날', bad: '찬 나물 많으면 속이 찰 수 있어요', score: 85, benefits: ['막힌 기운 풀이', '채소로 가벼운 포만', '균형 잡힌 한 끼'] },
  { name: '콩나물국밥', el: ['목', '수'], nature: '시원하고 개운한 성질', desc: '아삭한 콩나물이 속을 풀어줘요.', good: '전날 무리했거나 속이 더부룩한 날', bad: '너무 맵지 않게', score: 84, benefits: ['속풀이에 도움', '수분 보충', '개운한 마무리'] },
  { name: '쌈밥 정식', el: ['목'], nature: '향긋하고 순한 성질', desc: '푸른 채소가 답답함을 틔워줘요.', good: '눈이 피로하고 답답함이 쌓인 날', bad: '짜지 않게', score: 82, benefits: ['답답함 틔우기', '풍부한 채소 섭취', '가벼운 환기'] },
  // 화(불) — 열정·심장·순환
  { name: '제육볶음', el: ['화'], nature: '맵고 따뜻한 성질', desc: '붉은 기운이 처진 의욕에 생기를 줘요.', good: '기운 없고 의욕이 처지는 날', bad: '속쓰림 있으면 양 줄여서', score: 85, benefits: ['처진 의욕에 생기', '든든한 단백질', '따뜻한 기운 보강'] },
  { name: '닭갈비', el: ['화', '금'], nature: '매콤하고 따뜻한 성질', desc: '얼큰한 불 기운이 활력을 깨워줘요.', good: '무기력하고 가라앉는 날', bad: '위가 예민하면 순하게', score: 83, benefits: ['활력 깨우기', '든든한 포만감', '매콤한 순환'] },
  { name: '부대찌개', el: ['화', '수'], nature: '얼큰하고 든든한 성질', desc: '뜨끈한 국물이 몸을 데워줘요.', good: '쌀쌀하고 몸이 처지는 날', bad: '짠맛 강하면 국물은 적게', score: 82, benefits: ['몸을 데움', '든든한 국물', '쌀쌀함 달래기'] },
  // 토(흙) — 안정·소화·중심
  { name: '된장찌개 백반', el: ['토'], nature: '구수하고 든든한 성질', desc: '곡식과 장이 속 중심을 잡아줘요.', good: '식사가 불규칙해 속이 어수선한 날', bad: '짜지 않게', score: 85, benefits: ['속 중심 잡기', '구수한 안정감', '규칙적인 한 끼'] },
  { name: '삼계탕', el: ['토', '화'], nature: '따뜻하게 보하는 성질', desc: '기력을 채워주는 든든한 한 그릇.', good: '기운이 허하고 지친 날', bad: '열이 많은 날엔 가볍게', score: 84, benefits: ['기력 보충', '따뜻하게 보함', '지친 몸 회복'] },
  { name: '갈비탕', el: ['토', '수'], nature: '담백하고 보하는 성질', desc: '맑은 국물이 속을 편안히 채워줘요.', good: '속이 허하고 든든함이 필요한 날', bad: '기름은 걷어내고', score: 82, benefits: ['속을 편안히 채움', '맑은 보양', '부담 적은 단백질'] },
  // 금(쇠) — 결단·폐·정리
  { name: '생선구이 백반', el: ['금', '수'], nature: '담백하고 깔끔한 성질', desc: '맑은 단백질이 호흡과 기운을 정리해줘요.', good: '머리가 텁텁하고 몸이 무거운 날', bad: '탄 부분은 피해서', score: 83, benefits: ['맑은 단백질 보충', '호흡기 정돈', '몸속 노폐물 정리'] },
  { name: '갈치조림', el: ['금', '수'], nature: '감칠맛 나고 촉촉한 성질', desc: '촉촉함이 마른 기운을 적셔줘요.', good: '몸이 건조하고 입맛이 없는 날', bad: '짜면 밥과 함께 슴슴하게', score: 81, benefits: ['마른 기운 적심', '촉촉한 감칠맛', '입맛 살리기'] },
  { name: '칼국수', el: ['금', '토'], nature: '따뜻하고 구수한 성질', desc: '뜨끈한 면이 속을 편안히 데워줘요.', good: '쌀쌀하고 든든한 게 당기는 날', bad: '밀가루 부담되면 조금씩', score: 80, benefits: ['속을 데움', '구수한 포만감', '쌀쌀함 달래기'] },
];

/* 문자열 → 시드 (결정적) */
function seedOf(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/* 오늘 날짜 키 (YYYY-MM-DD) */
function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/*
  오늘의 메뉴 추천
  @param saju  calculateSaju(birth) 결과 ({ elements, lacking, dominant, ... })
  @returns { foodName, ohaengTags, suitabilityScore, summary, goodFor, cautionFor, focusEl, focusPlain }
*/
const PLAIN = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };

/* 받침 유무에 따라 은/는 조사를 붙인다(예: 홍삼→은, 칼국수→는). */
function eunNeun(word) {
  const c = (word || '').charCodeAt((word || '').length - 1);
  if (!(c >= 0xAC00 && c <= 0xD7A3)) return word + '은(는)';
  return word + (((c - 0xAC00) % 28) !== 0 ? '은' : '는');
}

export function recommendTodayFood(saju) {
  const elements = saju?.elements || {};
  const order = ['목', '화', '토', '금', '수'];
  // 가장 부족한 오행(보강 대상). lacking 우선, 없으면 최솟값.
  const focusEl = (saju?.lacking && saju.lacking[0])
    || order.slice().sort((a, b) => (elements[a] || 0) - (elements[b] || 0))[0];
  const parent = PARENT[focusEl];

  // 후보: focus 또는 그 부모(상생) 기운을 보강하는 음식
  let pool = FOODS.filter(f => f.el.includes(focusEl));
  if (pool.length < 2) pool = pool.concat(FOODS.filter(f => f.el.includes(parent)));
  if (!pool.length) pool = FOODS.slice();

  // 날짜+사주 시드로 오늘의 한 그릇을 고정 선택(매일 바뀜)
  const seed = seedOf(`${todayKeyLocal()}|${focusEl}|${(saju?.ilju || '')}`);
  const pick = pool[seed % pool.length];

  // 적합도: 기본 + focus 직접 보강 가산
  const direct = pick.el.includes(focusEl);
  const score = Math.min(98, pick.score + (direct ? 8 : 3));

  // 대안 메뉴 3개 — 추천이 맘에 안 들 때를 위한 예비(이름만). 보강 후보 우선, 날짜 시드로 회전.
  const seen = new Set([pick.name]);
  const ordered = [...pool, ...FOODS].filter(f => { if (seen.has(f.name)) return false; seen.add(f.name); return true; });
  const rot = ordered.length ? seed % ordered.length : 0;
  const alternatives = ordered.slice(rot).concat(ordered.slice(0, rot)).slice(0, 3).map(f => f.name);

  return {
    foodName: pick.name,
    ohaengTags: pick.el,
    nature: pick.nature,
    suitabilityScore: score,
    summary: `${eunNeun(pick.name)} ${pick.nature}을 지닌 한 그릇이에요. ${pick.desc} 오늘 ${PLAIN[focusEl]} 기운의 균형을 맞추기에 잘 어울려요.`,
    goodFor: pick.good,
    cautionFor: pick.bad,
    benefits: pick.benefits || [],
    alternatives,
    focusEl,
    focusPlain: PLAIN[focusEl],
    category: 'C_GENERAL',
  };
}

/* 카카오맵으로 '현재 위치 주변 + 음식' 검색 딥링크 (장소 API 키 불필요).
   위치 권한 허용 시 좌표 포함, 거부/실패 시 키워드만으로 검색. */
export function openNearbyRestaurants(foodName) {
  const q = encodeURIComponent(`${foodName} 맛집`);
  // 권한 거부/미지원 → 카카오맵 키워드 검색(국내 친화)
  const openKakao = () => window.open(`https://map.kakao.com/?q=${q}`, '_blank', 'noopener');
  if (!navigator.geolocation) { openKakao(); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // 권한 허용 → 실제 좌표 중심으로 검색(구글지도는 좌표 URL 지원)
      const { latitude, longitude } = pos.coords;
      window.open(`https://www.google.com/maps/search/${q}/@${latitude},${longitude},15z`, '_blank', 'noopener');
    },
    () => openKakao(),
    { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
  );
}
