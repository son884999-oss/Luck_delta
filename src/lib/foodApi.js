/* ================================================================
   천문 식탁 — 백엔드(Chunmun NestJS) API 클라이언트
   기존 엔드포인트를 그대로 호출한다:
     POST /users                          (사주 프로필 등록 → userId)
     GET  /recommendations/today-food/:id (오늘의 추천 음식)
     POST /chunmun-table/analyze          (음식 성분 분석)
   개발: localhost:3000 · 배포: VITE_API_BASE 로 백엔드 URL 주입

   백엔드가 없거나 느릴 때: analyzeFoodLocal()로 Gemini 직접 호출
================================================================ */
import { calculateSaju } from './saju.js';
import { callGeminiRetry, hasApiKey } from './fortune.js';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

/** 프런트 saju.js 결과 → 백엔드 natalSaju 형태로 변환 */
function natalFromBirth(birth) {
  const s = calculateSaju(birth);
  return {
    distribution: s.elements,        // { 목:n, 화:n, 토:n, 금:n, 수:n }
    dayElement: s.dayElem,
    deficient: s.lacking || [],
    excessive: s.dominant || [],
    ilju: s.ilju,
  };
}

const toBirthNums = (b) => ({
  y: parseInt(b.y) || null, m: parseInt(b.m) || null, d: parseInt(b.d) || null,
  h: b.h === '모름' ? null : parseInt(b.h), min: b.min === '모름' ? null : parseInt(b.min),
});

/** 디바이스당 1회 사용자 등록 → userId 캐시 후 재사용 */
export async function ensureFoodUser(nickname, birth) {
  try { const cached = localStorage.getItem('cm_food_uid'); if (cached) return cached; } catch (e) {}
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nickname || '사용자', birth: toBirthNums(birth), natalSaju: natalFromBirth(birth) }),
  });
  if (!res.ok) throw new Error(`프로필 등록 실패 (${res.status})`);
  const u = await res.json();
  try { localStorage.setItem('cm_food_uid', u.id); } catch (e) {}
  return u.id;
}

export async function fetchTodayFood(userId) {
  const res = await fetch(`${API_BASE}/recommendations/today-food/${userId}`);
  if (!res.ok) throw new Error(`추천 실패 (${res.status})`);
  return res.json();
}

export async function analyzeFood(userId, query) {
  const res = await fetch(`${API_BASE}/chunmun-table/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, channel: 'TEXT', query }),
  });
  if (!res.ok) throw new Error(`분석 실패 (${res.status})`);
  return res.json();
}

/**
 * 백엔드 없이 Gemini를 직접 호출해 음식 성분·오행 분석.
 * 백엔드 서버가 없거나 느릴 때 doSearch()에서 이 함수를 사용한다.
 * 결과 형태는 analyzeFood()와 호환 (foodName, suitabilityScore, summary, goodFor, cautionFor, category).
 */
export async function analyzeFoodLocal(query, saju) {
  if (!hasApiKey()) throw new Error('API 키가 필요해요.');

  const domPlain  = (saju?.dominant  || []).map(k => ({ 목:'나무', 화:'불', 토:'흙', 금:'쇠', 수:'물' }[k])).filter(Boolean).join('·');
  const lackPlain = (saju?.lacking   || []).map(k => ({ 목:'나무', 화:'불', 토:'흙', 금:'쇠', 수:'물' }[k])).filter(Boolean).join('·');
  const sajuCtx = saju
    ? `사용자 오행 분포: 강한 기운 ${domPlain || '고른 편'}, 부족한 기운 ${lackPlain || '없음'}`
    : '';

  const result = await callGeminiRetry({
    system: `당신은 한방 식이 전문가입니다. 사용자가 입력한 음식을 오행(나무·불·흙·쇠·물) 관점에서 분석합니다.
- 한자·전문용어 없이 순한글로 쓰세요.
- 의학적 진단이 아닌 전통 한방 식이의 일반 통념을 쉽게 설명하세요.
- 응원하는 따뜻한 톤으로 작성하세요.
${sajuCtx}`,
    user: `"${query}"을(를) 분석해 주세요.`,
    schema: {
      type: 'OBJECT',
      properties: {
        foodName:        { type: 'STRING'  }, // 정규화된 음식 이름 (예: "콩나물국밥")
        ohaengTags:      { type: 'ARRAY', items: { type: 'STRING' } }, // 해당 오행 키 배열 (예: ["목", "수"])
        nature:          { type: 'STRING'  }, // 한방 성질 한 줄 (예: "시원하고 개운한 성질")
        suitabilityScore: { type: 'NUMBER' }, // 0~100, 사용자 오행 기준 적합도
        summary:         { type: 'STRING'  }, // 2~3문장 핵심 설명
        goodFor:         { type: 'STRING'  }, // 이런 분께 좋아요 (1문장)
        cautionFor:      { type: 'STRING'  }, // 주의할 점 (1문장, 없으면 빈 문자열)
        category:        { type: 'STRING'  }, // "A_SUPPLEMENT" | "B_HERBAL" | "C_GENERAL" | "D_PSEUDO"
      },
      required: ['foodName','ohaengTags','nature','suitabilityScore','summary','goodFor','cautionFor','category'],
    },
  }, 2);

  return result;
}
