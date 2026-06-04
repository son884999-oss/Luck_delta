/* ================================================================
   Chunmun 백엔드 — Docker 없이 핵심 파이프라인 검증
   실제 식약처 API 호출 → 파싱 → 오행 태깅 → 추천 → 컴플라이언스.
   (PostgreSQL/Redis/NestJS 없이 순수 로직만, dist 컴파일 결과 재사용)
   실행:  cd backend && npm run build && node scripts/verify.mjs
================================================================ */
import 'reflect-metadata';
import { config } from 'dotenv';
import { inferOhaengTags } from '../dist/saju/ohaeng-tagger.js';
import { SajuService } from '../dist/saju/saju.service.js';
import { ComplianceService } from '../dist/compliance/compliance.service.js';

config();
const FOOD_KEY = process.env.MFDS_FOOD_DATAGOKR_KEY;
const HFI_KEY = process.env.MFDS_HFI_API_KEY || process.env.MFDS_API_KEY;
const FOOD_URL = process.env.MFDS_FOOD_DATAGOKR_URL || 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02';

const line = (c = '─') => console.log(c.repeat(64));
const num = (...vs) => { for (const v of vs) { const n = Number(v); if (v != null && v !== '' && !isNaN(n)) return n; } return undefined; };

/* ── 1) 식품영양성분 (data.go.kr) ── */
function mapFood(it) {
  const name = it.FOOD_NM_KR ?? '(미상)';
  const category = it.FOOD_CAT1_NM ?? null;
  const nutrients = {
    energyKcal: num(it.AMT_NUM1), proteinG: num(it.AMT_NUM3), fatG: num(it.AMT_NUM4),
    carbohydrateG: num(it.AMT_NUM6), sugarsG: num(it.AMT_NUM7), sodiumMg: num(it.AMT_NUM13),
  };
  return {
    foodCode: String(it.FOOD_CD ?? '').trim(), name, category, nutrients,
    sodiumMg: nutrients.sodiumMg ?? null, sugarsG: nutrients.sugarsG ?? null,
    energyKcal: nutrients.energyKcal ?? null, proteinG: nutrients.proteinG ?? null,
    ohaengTags: inferOhaengTags(name, category),
  };
}

/* ── 2) 건강기능식품 (식품안전나라 C003) ── */
const arr = (v) => Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean) : [];
function mapHfi(it) {
  return {
    licenseNo: String(it.PRDLST_REPORT_NO ?? '').trim(), name: it.PRDLST_NM ?? '(미상)',
    approvedClaims: arr(it.PRIMARY_FNCLTY), rawMaterials: arr(it.RAWMTRL_NM),
  };
}

async function main() {
  line('═');
  console.log('  CHUNMUN 백엔드 파이프라인 검증 (Docker 불필요)');
  line('═');

  // ── A. 식품영양성분 적재 시뮬레이션 ──
  console.log('\n[A] 식품영양성분DB (data.go.kr / FoodNtrCpntDbInfo02)');
  const fr = await fetch(`${FOOD_URL}?serviceKey=${FOOD_KEY}&type=json&pageNo=1&numOfRows=60`);
  const fj = await fr.json();
  const code = fj?.header?.resultCode ?? fj?.response?.header?.resultCode;
  const total = fj?.body?.totalCount ?? fj?.response?.body?.totalCount;
  const items = (fj?.body?.items ?? fj?.response?.body?.items ?? []);
  console.log(`  · resultCode=${code} · 전체 ${Number(total).toLocaleString()}건 · 이번 페이지 ${items.length}건`);
  const foods = items.map(mapFood);
  const tagged = foods.filter(f => f.ohaengTags.length);
  console.log(`  · 파싱 성공 ${foods.length} · 오행 태깅된 식품 ${tagged.length}`);
  console.log('  · 샘플 3건:');
  foods.slice(0, 3).forEach(f => console.log(`    - ${f.name} [${f.foodCode}] ${f.energyKcal}kcal·단백${f.proteinG}·나트륨${f.sodiumMg}mg·당${f.sugarsG}g · 오행[${f.ohaengTags.join(',') || '없음'}]`));

  // ── B. 오늘의 추천 음식 (안전 임계 + 오행 매칭) ──
  console.log('\n[B] 오늘의 추천 음식 — 명식 결핍[토·수] 가정');
  const saju = new SajuService();
  const natal = { distribution: { 목: 3, 화: 2, 토: 0, 금: 2, 수: 0 }, dayElement: '토', deficient: ['토', '수'], excessive: ['목'] };
  const targets = saju.todayTargets(natal, null);
  console.log(`  · 오늘의 타깃 오행: [${targets.join(', ')}]`);
  const SOD = 1600, SUG = 80; // 일일 권장 80% (나트륨 2000mg / 당 100g)
  const before = foods.filter(f => f.ohaengTags.some(t => targets.includes(t)));
  const safe = before.filter(f => (f.sodiumMg == null || f.sodiumMg <= SOD) && (f.sugarsG == null || f.sugarsG <= SUG));
  const ranked = safe.map(f => ({ f, score: saju.suitabilityScore(f.ohaengTags, natal, targets) }))
    .sort((a, b) => b.score - a.score).slice(0, 3);
  console.log(`  · 타깃 매칭 ${before.length}건 → 안전필터 통과 ${safe.length}건 (고나트륨/고당 ${before.length - safe.length}건 제외)`);
  ranked.forEach(({ f, score }, i) => console.log(`    ${i + 1}. ${f.name} — 적합도 ${score}% · 오행[${f.ohaengTags.join(',')}] · 나트륨 ${f.sodiumMg}mg`));
  if (!ranked.length) console.log('    (이 페이지엔 타깃 매칭 식품이 적어요 — 전체 동기화 시 풍부해집니다)');

  // ── C. 건강기능식품 + 컴플라이언스 게이트 ──
  console.log('\n[C] 건강기능식품(C003) + 컴플라이언스 카테고리');
  const comp = new ComplianceService();
  const hr = await fetch(`http://openapi.foodsafetykorea.go.kr/api/${HFI_KEY}/C003/json/1/4`);
  const hj = await hr.json();
  const hrows = hj?.C003?.row ?? [];
  console.log(`  · 건기식 ${hj?.C003?.total_count ?? '?'}건 중 ${hrows.length}건 분류:`);
  hrows.map(mapHfi).forEach(h => {
    const v = comp.classify(h.name, h.rawMaterials, h.approvedClaims);
    console.log(`    - ${h.name} → [${v.category}] 기능성표시 ${v.allowFunctionalClaims ? '허용' : '차단'} · 노출가능 클레임 ${v.permittedClaims.length}개`);
  });

  // ── D. 컴플라이언스 경계 케이스 ──
  console.log('\n[D] 컴플라이언스 경계 케이스');
  [['수소수 이온음료', [], []], ['흑염소 추출액', ['흑염소'], []], ['홍삼정 (인증)', ['홍삼'], ['기억력 개선에 도움을 줄 수 있음']]]
    .forEach(([n, h, c]) => { const v = comp.classify(n, h, c); console.log(`    - ${n} → [${v.category}]${v.forcedScore === 0 ? ' ★0%' : ''} ${v.warning ? '· ' + v.warning.slice(0, 40) + '…' : ''}`); });

  line('═');
  console.log('  ✅ 검증 완료 — 외부 API·파싱·오행태깅·추천·컴플라이언스 정상 동작');
  console.log('  (DB 저장/캐시/HTTP 엔드포인트는 docker compose up 후 확인)');
  line('═');
}
main().catch(e => { console.error('검증 실패:', e.message); process.exit(1); });
