/* ================================================================
   천문 식탁 — 오늘의 메뉴 추천 (100% 클라이언트, 네트워크 0)
   사주 오행 분포 → 부족한 기운을 보강하는 음식을 '오늘의 한 그릇'으로.
   날짜+사주로 시드를 고정해 하루 동안 같은 추천이 유지된다(매일 바뀜).
   네트워크 없이 즉시 오행 기반 추천을 돌려준다.

   ※ 한방 성질·오행 적합도는 전통 명리/한방 식이의 일반 통념을 단순화한 것으로
     의학적 진단이 아닙니다.
================================================================ */

import { callGeminiRetry, hasApiKey } from './fortune.js';

// 오행 상생(보강): KEY 를 낳아 주는(채워 주는) 오행
//   목←수, 화←목, 토←화, 금←토, 수←금
const PARENT = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };

// 식당에서 실제 파는 흔한 메뉴 + 오행 귀속 + 일상어 설명 + 일반 영양 정보.
// (주변에서 못 사는 집밥 대신 '식당 메뉴'로 구성 → 추천 음식을 바로 찾아 먹을 수 있게)
// el: 보강 오행. nature: 맛/식감(서술형). desc: 메뉴 소개. nutrition: 일반 영양 정보(사실 기반).
// tip: 상식적인 섭취 팁. benefits: 좋은 점(칩). score: 기본 적합도(보강 시 가산).
const FOODS = [
  // 수(물) — 지혜·차분·신장
  { name: '순두부찌개', emoji: '🍲', el: ['수', '토'], nature: '얼큰하고 부드러운', desc: '보글보글 끓는 순두부가 부드럽게 속을 데워줘요.', nutrition: '두부의 식물성 단백질과 이소플라본, 칼슘을 함께 섭취할 수 있어요.', tip: '국물은 간이 셀 수 있으니 밥과 함께 슴슴하게 드세요.', score: 86, benefits: ['식물성 단백질', '부드러운 소화', '든든한 포만감'] },
  { name: '해물탕', emoji: '🦐', el: ['수'], nature: '시원하고 담백한', desc: '시원한 국물에 해산물이 가득해 속이 든든해져요.', nutrition: '조개·새우 등 해산물로 저지방 단백질과 아연·타우린을 보충해요.', tip: '통풍이 있다면 해산물·국물 섭취는 적당히 조절하세요.', score: 84, benefits: ['저지방 단백질', '담백한 국물', '미네랄 보충'] },
  { name: '미역국 백반', emoji: '🥣', el: ['수', '목'], nature: '담백하고 부드러운', desc: '담백한 미역국이 속을 편안하게 감싸줘요.', nutrition: '미역의 식이섬유와 요오드, 칼슘·마그네슘을 함께 섭취할 수 있어요.', tip: '갑상선 질환이 있다면 미역(요오드) 섭취량은 의료진과 상의하세요.', score: 83, benefits: ['식이섬유', '미네랄 풍부', '부담 없는 소화'] },
  // 목(나무) — 성장·간·유연
  { name: '비빔밥', emoji: '🍚', el: ['목', '토'], nature: '산뜻하고 든든한', desc: '갖은 나물을 고루 비벼 한 그릇에 담아낸 든든한 메뉴예요.', nutrition: '여러 나물·채소로 식이섬유와 비타민을, 밥으로 탄수화물을 고루 섭취해요.', tip: '고추장 양을 줄이면 나트륨 섭취를 낮출 수 있어요.', score: 85, benefits: ['다양한 채소', '균형 잡힌 한 끼', '식이섬유'] },
  { name: '콩나물국밥', emoji: '🍜', el: ['목', '수'], nature: '시원하고 개운한', desc: '아삭한 콩나물과 뜨끈한 국물이 속을 개운하게 해줘요.', nutrition: '콩나물의 아스파라긴산과 수분이 풍부해 가벼운 한 끼로 좋아요.', tip: '맵고 짠 양념은 줄이고 국물은 적당히 드세요.', score: 84, benefits: ['수분 보충', '가벼운 소화', '개운한 맛'] },
  { name: '쌈밥 정식', emoji: '🥬', el: ['목'], nature: '향긋하고 순한', desc: '신선한 쌈 채소에 밥을 싸 먹는 산뜻한 한 상이에요.', nutrition: '쌈 채소로 식이섬유와 엽산, 비타민K를 풍부하게 섭취할 수 있어요.', tip: '쌈장은 나트륨이 높으니 소량만 곁들이세요.', score: 82, benefits: ['풍부한 채소', '식이섬유', '비타민'] },
  // 화(불) — 열정·심장·순환
  { name: '제육볶음', emoji: '🍖', el: ['화'], nature: '매콤하고 따뜻한', desc: '매콤하게 볶은 돼지고기가 밥 한 공기를 뚝딱 비우게 해요.', nutrition: '돼지고기의 양질 단백질과 비타민B1(티아민)이 풍부해요.', tip: '기름·양념이 많을 수 있으니 채소를 곁들여 드세요.', score: 85, benefits: ['든든한 단백질', '비타민B군', '높은 포만감'] },
  { name: '닭갈비', emoji: '🍗', el: ['화', '금'], nature: '매콤달콤한', desc: '매콤달콤한 양념에 닭고기와 채소를 볶아낸 인기 메뉴예요.', nutrition: '닭고기의 양질 단백질이 풍부하고 지방은 비교적 낮은 편이에요.', tip: '매운 양념과 나트륨이 높을 수 있으니 자극에 약하면 순하게.', score: 83, benefits: ['고단백', '채소 함께', '든든한 포만감'] },
  { name: '부대찌개', emoji: '🍲', el: ['화', '수'], nature: '얼큰하고 든든한', desc: '얼큰한 국물에 여러 재료가 어우러진 든든한 한 냄비예요.', nutrition: '다양한 재료로 단백질과 열량을 보충하는 든든한 국물 요리예요.', tip: '가공육과 나트륨이 높으니 국물은 적게, 자주 드시진 마세요.', score: 82, benefits: ['든든함', '따뜻한 국물', '높은 포만감'] },
  // 토(흙) — 안정·소화·중심
  { name: '된장찌개 백반', emoji: '🥘', el: ['토'], nature: '구수하고 든든한', desc: '구수한 된장찌개에 밥을 곁들인 편안한 집밥이에요.', nutrition: '발효 된장의 단백질·유익균과 두부·채소의 식이섬유를 함께 섭취해요.', tip: '된장은 나트륨이 높으니 국물은 너무 짜지 않게 드세요.', score: 85, benefits: ['발효식품', '식물성 단백질', '구수한 포만'] },
  { name: '삼계탕', emoji: '🐔', el: ['토', '화'], nature: '따뜻하게 보하는', desc: '한 마리 닭에 인삼과 대추를 넣고 푹 끓인 보양식이에요.', nutrition: '닭고기 단백질에 인삼·대추·마늘을 더한 대표적인 보양식이에요.', tip: '열량이 높은 편이라 양을 조절하고 천천히 드세요.', score: 84, benefits: ['고단백 보양', '기력 보충', '속 편한 국물'] },
  { name: '갈비탕', emoji: '🍖', el: ['토', '수'], nature: '담백하고 든든한', desc: '맑게 우려낸 국물에 갈비를 더한 든든한 탕 요리예요.', nutrition: '소고기의 단백질과 철분을 맑은 국물로 보충할 수 있어요.', tip: '기름을 걷어내면 포화지방 섭취를 줄일 수 있어요.', score: 82, benefits: ['양질 단백질', '철분', '맑은 국물'] },
  // 금(쇠) — 결단·폐·정리
  { name: '생선구이 백반', emoji: '🐟', el: ['금', '수'], nature: '담백하고 정갈한', desc: '노릇하게 구운 생선에 밥과 반찬을 곁들인 정갈한 한 상이에요.', nutrition: '생선의 양질 단백질과 오메가-3 지방산(EPA·DHA)이 풍부해요.', tip: '탄 부위에는 유해물질이 생길 수 있으니 떼어내고 드세요.', score: 83, benefits: ['오메가-3', '양질 단백질', '담백한 맛'] },
  { name: '갈치조림', emoji: '🐟', el: ['금', '수'], nature: '감칠맛 나고 촉촉한', desc: '무와 함께 조려낸 갈치가 밥도둑이 되어줘요.', nutrition: '갈치의 단백질·불포화지방과 무·채소의 수분을 함께 섭취해요.', tip: '조림 양념은 짤 수 있으니 밥과 함께 슴슴하게 드세요.', score: 81, benefits: ['양질 단백질', '촉촉한 식감', '입맛 살림'] },
  { name: '칼국수', emoji: '🍜', el: ['금', '토'], nature: '따뜻하고 구수한', desc: '쫄깃한 면을 뜨끈한 국물에 끓여낸 따뜻한 한 그릇이에요.', nutrition: '면과 국물로 탄수화물과 수분을 보충하는 따뜻한 한 그릇이에요.', tip: '국물에는 나트륨이 많을 수 있으니 다 드시지 않는 게 좋아요.', score: 80, benefits: ['따뜻한 포만', '구수한 국물', '부담 적은 한 끼'] },
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
  @returns { foodName, ohaengTags, suitabilityScore, summary, nutrition, tip, benefits, focusEl, focusPlain }
*/
const PLAIN = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };

/* 메뉴 이름 → 대표 이모지 (키워드 매칭, 검색결과·AI 추천 폴백 공용) */
export function pickFoodEmoji(name = '') {
  const map = [['순두부','🍲'],['두부','🍲'],['해물','🦐'],['새우','🦐'],['조개','🦪'],['미역','🥣'],['국밥','🍜'],['비빔','🍚'],['덮밥','🍚'],['쌈','🥬'],['나물','🥬'],['제육','🍖'],['불고기','🍖'],['닭','🍗'],['치킨','🍗'],['부대','🍲'],['된장','🥘'],['삼계','🐔'],['갈비','🍖'],['생선','🐟'],['갈치','🐟'],['조림','🐟'],['칼국수','🍜'],['국수','🍜'],['면','🍜'],['죽','🥣'],['전','🥞'],['김치','🥬'],['찌개','🥘'],['탕','🍲'],['국','🍲'],['밥','🍚'],['고기','🍖'],['구이','🐟']];
  for (const [k, e] of map) if (name.includes(k)) return e;
  return '🍽️';
}

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
    summary: `${eunNeun(pick.name)} ${pick.nature} 메뉴예요. ${pick.desc}`,
    nutrition: pick.nutrition,
    tip: pick.tip,
    benefits: pick.benefits || [],
    emoji: pick.emoji || pickFoodEmoji(pick.name),
    focusReason: `${PLAIN[focusEl]} 기운이 부족한 사주에 ${PLAIN[focusEl]} 기운을 채워주는 한 그릇이에요.`,
    alternatives,
    focusEl,
    focusPlain: PLAIN[focusEl],
    category: 'C_GENERAL',
  };
}

/*
  오늘의 메뉴 — AI(Gemini) 추천. 식탁 진입 시 호출해 카드를 뒤집는 동안 받아온다.
  반환 모양은 recommendTodayFood()와 동일 → 카드가 그대로 렌더된다.
  키가 없거나 실패하면 호출부에서 recommendTodayFood() 로컬 추천으로 폴백한다.
*/
export async function recommendTodayFoodAI(saju) {
  if (!hasApiKey()) throw new Error('API 키가 없어요.');
  const elements = saju?.elements || {};
  const order = ['목', '화', '토', '금', '수'];
  const focusEl = (saju?.lacking && saju.lacking[0])
    || order.slice().sort((a, b) => (elements[a] || 0) - (elements[b] || 0))[0];
  const focusPlain = PLAIN[focusEl];

  const result = await callGeminiRetry({
    system: `당신은 한국 음식과 영양에 밝은 따뜻한 식이 도우미입니다. 사용자 사주에서 부족한 '${focusPlain}(${focusEl})' 기운을 보강하는, 한국에서 흔히 사 먹을 수 있는 식당 메뉴 한 가지를 오늘의 메뉴로 추천하세요.
- 메뉴는 실제 식당에서 파는 평범하고 구체적인 것(예: 갈치조림, 콩나물국밥, 된장찌개 백반). 특이하거나 비싼 건 피하세요.
- 한자·전문용어 없이 순한글, 따뜻한 톤.
- summary는 기운 이야기 말고 메뉴 자체를 침 고이게 소개하는 1~2문장.
- nature는 맛·식감을 나타내는 짧은 표현(8자 내외, 예: '담백하고 정갈한', '얼큰하고 든든한'). '~성질로 몸에 활력' 같은 문장·효능 주장 금지.
- nutrition은 실제 영양 사실에 기반해 1문장(과장·허위 금지). tip은 상식적인 섭취 팁 1문장. 의학적 진단은 금지.`,
    user: `부족한 기운: ${focusPlain}. 오늘 채워주면 좋은 한 그릇을 추천해 주세요.`,
    schema: {
      type: 'OBJECT',
      properties: {
        foodName: { type: 'STRING' },                              // 메뉴 이름
        nature: { type: 'STRING' },                                // 맛·식감 짧은 표현 8자 내외(예: 담백하고 정갈한). 효능·건강 주장 금지.
        summary: { type: 'STRING' },                               // 메뉴 소개 1~2문장
        nutrition: { type: 'STRING' },                             // 사실 기반 영양 정보 1문장
        tip: { type: 'STRING' },                                   // 섭취 팁 1문장
        benefits: { type: 'ARRAY', items: { type: 'STRING' } },    // 좋은 점 3개(각 4~10자)
        alternatives: { type: 'ARRAY', items: { type: 'STRING' } },// 대안 메뉴 이름 3개
        ohaengTags: { type: 'ARRAY', items: { type: 'STRING' } },  // 오행 키
        suitabilityScore: { type: 'NUMBER' },                      // 60~98
      },
      required: ['foodName', 'nature', 'summary', 'nutrition', 'tip', 'benefits', 'suitabilityScore'],
    },
  }, 2);

  // 성질 태그 방어 — 모델이 문장·효능 주장을 넣으면 '성질' 앞까지/짧게 잘라 짧은 표현만 남긴다.
  const natureClean = String(result.nature || '').replace(/\s*성질.*$/, '').replace(/[.。]\s*$/, '').trim().slice(0, 20);

  return {
    foodName: result.foodName,
    ohaengTags: (result.ohaengTags && result.ohaengTags.length) ? result.ohaengTags : [focusEl],
    nature: natureClean,
    suitabilityScore: Math.min(98, Math.max(60, Math.round(result.suitabilityScore || 88))),
    summary: result.summary,
    nutrition: result.nutrition,
    tip: result.tip,
    benefits: (result.benefits || []).slice(0, 3),
    alternatives: (result.alternatives || []).slice(0, 3),
    focusEl,
    focusPlain,
    emoji: pickFoodEmoji(result.foodName),
    focusReason: `${focusPlain} 기운이 부족한 사주에 ${focusPlain} 기운을 채워주는 한 그릇이에요.`,
    category: 'C_GENERAL',
    source: 'ai',
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
