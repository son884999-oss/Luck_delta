/* ================================================================
   천문 — 기능별 화면 + 상호작용 스크린샷 캡처  [천문 전용 플로우]
   범용 캡처 헬퍼는 scripts/deck/capture-kit.mjs(DeckKit). 이 파일은 '무엇을
   누르고 무엇을 찍을지'(천문 화면 플로우)만 담는다.

   사용:  node scripts/capture-screens.mjs [baseUrl]   ·   npm run shots
   주의: 운세/사주/궁합/타로/학습 결과는 Gemini 호출(20~40초)이라 오래 걸린다.
   각 단계는 try/catch로 감싸 한 화면이 실패해도 나머지는 계속 캡처한다.
================================================================ */
import { launchEdge, mobileContext, makeShooter, byText, flip } from './deck/capture-kit.mjs';

const BASE = process.argv[2] || 'https://luck-delta.vercel.app';
const SEED = { cm_birth: JSON.stringify({ y: '1988', m: '3', d: '15', h: '모름', min: '0' }), cm_nick: '천문' };
const GEO = { latitude: 37.4979, longitude: 127.0276 };

const browser = await launchEdge();
const { shot, shots } = makeShooter('screenshots');

/* ── 천문 앱 전용 내비게이션 헬퍼(보이는 한글 텍스트 기준) ── */
const txt = (page, t, exact = true) => byText(page, t, exact);
async function backToHub(page) {
  await txt(page, '메인으로').click().catch(() => {});
  await txt(page, '바로가기').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
}
async function openFeature(page, label) {
  if (!(await txt(page, label).isVisible().catch(() => false))) {
    const more = txt(page, '더보기');
    if (await more.isVisible().catch(() => false)) { await more.click(); await page.waitForTimeout(500); }
  }
  await txt(page, label).click();
}
// 결과(분석 완료) 대기 — 모든 결과 화면 하단에 '메인으로' 버튼이 뜬다
async function waitResult(page, timeout = 65000) {
  await txt(page, '메인으로').waitFor({ state: 'visible', timeout });
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(3400); // ScoreRing 공개(2.4s)+별가루 여유
}

try {
  /* ── A. 시드 없이: 첫 진입 + 온보딩 입력 ── */
  try {
    const ctx = await mobileContext(browser);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await shot(page, '01_entrance', 1500);
    await page.locator('[role="button"]').first().click();
    await page.waitForTimeout(800);
    await page.getByPlaceholder('별명 또는 이름').fill('천문').catch(() => {});
    await page.getByPlaceholder('1990').fill('1988').catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '02_setup_input');
    await ctx.close();
  } catch (e) { console.log('  ! A 온보딩 스킵:', e.message); }

  /* ── B. 시드 후: 허브 + 각 기능/상호작용 ── */
  const ctx = await mobileContext(browser, { seed: SEED, geo: GEO });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  await shot(page, '03_hub');
  try { await txt(page, '더보기').click(); await shot(page, '04_hub_more', 800); await txt(page, '더보기').click(); } catch (e) { console.log('  ! 더보기:', e.message); }

  try { // 오늘의 운세
    await openFeature(page, '오늘의 운세'); await waitResult(page); await shot(page, '10_fortune_result');
    await page.evaluate(() => window.scrollTo({ top: 760 })); await shot(page, '11_fortune_body', 900);
    await page.evaluate(() => window.scrollTo({ top: 99999 })); await shot(page, '12_fortune_lucky', 900);
    await backToHub(page);
  } catch (e) { console.log('  ! 오늘의운세:', e.message); await backToHub(page); }

  try { // 사주 카드 — 뒤집기 전/후
    await openFeature(page, '사주 카드'); await waitResult(page); await shot(page, '13_card_front');
    if (await flip(page)) await shot(page, '14_card_back', 800);
    await page.evaluate(() => window.scrollTo({ top: 99999 })); await shot(page, '15_card_detail', 900);
    await backToHub(page);
  } catch (e) { console.log('  ! 사주카드:', e.message); await backToHub(page); }

  try { // 평생 사주
    await openFeature(page, '평생 사주'); await waitResult(page); await shot(page, '16_saju_result');
    await page.evaluate(() => window.scrollTo({ top: 820 })); await shot(page, '17_saju_body', 900);
    await backToHub(page);
  } catch (e) { console.log('  ! 평생사주:', e.message); await backToHub(page); }

  try { // 주간 운세
    await openFeature(page, '주간 운세'); await waitResult(page); await shot(page, '18_weekly_result');
    await page.evaluate(() => window.scrollTo({ top: 760 })); await shot(page, '19_weekly_body', 900);
    await backToHub(page);
  } catch (e) { console.log('  ! 주간운세:', e.message); await backToHub(page); }

  try { // 궁합 — 입력 + 결과
    await openFeature(page, '궁합'); await page.waitForTimeout(800); await shot(page, '20_gunghap_form');
    await page.getByPlaceholder('1990').fill('1992').catch(() => {}); await page.waitForTimeout(400);
    await txt(page, '궁합 보기', false).click(); await waitResult(page); await shot(page, '21_gunghap_result');
    await backToHub(page);
  } catch (e) { console.log('  ! 궁합:', e.message); await backToHub(page); }

  try { // 타로 — 뽑기 → 결과 (카드가 떠다녀 force click)
    await openFeature(page, '타로'); await page.waitForTimeout(900); await shot(page, '22_tarot_draw');
    await page.locator('button.animate-float').first().click({ force: true }).catch(() => {});
    await waitResult(page); await shot(page, '24_tarot_result');
    await backToHub(page);
  } catch (e) { console.log('  ! 타로:', e.message); await backToHub(page); }

  try { // 천문 식탁 — 추천 카드 뒤집기 + 주변 식당
    await openFeature(page, '천문 식탁'); await page.waitForTimeout(1600); await shot(page, '25_food_front');
    if (await flip(page)) await shot(page, '26_food_back', 900);
    const near = txt(page, '주변 식당 추천받기', false);
    if (await near.isVisible().catch(() => false)) {
      await near.click();
      await txt(page, '오늘의 메뉴를 파는 주변 식당', false).waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo({ top: 99999 })); await shot(page, '27_food_restaurants', 1200);
    }
    await backToHub(page);
  } catch (e) { console.log('  ! 천문식탁:', e.message); await backToHub(page); }

  try { await openFeature(page, '프리미엄 리포트'); await shot(page, '28_report_select', 900); await backToHub(page); }
  catch (e) { console.log('  ! 리포트:', e.message); await backToHub(page); }

  try { await openFeature(page, '다이어리'); await shot(page, '29_diary', 900); await backToHub(page); }
  catch (e) { console.log('  ! 다이어리:', e.message); await backToHub(page); }

  try { // 학습 나침반 — 인트로 + 결과
    await openFeature(page, '학습 나침반'); await page.waitForTimeout(800); await shot(page, '30_study_intro');
    const open = txt(page, '학습나침반 열기', false);
    if (await open.isVisible().catch(() => false)) {
      await open.click();
      await txt(page, '오늘의 두뇌 유형', false).waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1000); await shot(page, '31_study_result');
    }
    await backToHub(page);
  } catch (e) { console.log('  ! 학습나침반:', e.message); await backToHub(page); }

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n완료: ${shots.length}장 → screenshots/`);
console.log(shots.join(', '));
