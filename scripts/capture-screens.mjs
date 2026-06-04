/* ── 천문 앱 전 기능 자동 캡처 (발표자료용) ──
   앱의 모든 메뉴/결과 화면을 빠짐없이 촬영한다. 각 캡처는 페이지를 새로 로드(goto)해
   항상 허브에서 시작하므로 '뒤로가기' 버튼에 의존하지 않고, 한 기능이 실패해도 다음에 영향이 없다.
   시드된 localStorage 덕분에 로드 시 바로 허브로 진입한다.

   실행:  npm run shots                          (기본: 배포본)
          npm run shots http://localhost:4173    (로컬 빌드: npm run build && npm run preview 후)
          SHOTS_URL=... npm run shots             (환경변수 지정도 가능)

   산출물 이름은 build-pptx.mjs(발표자료)가 그대로 참조한다. */
import { launchEdge, mobileContext, makeShooter, byText, waitText, flip } from './deck/capture-kit.mjs';

const BASE = process.argv[2] || process.env.SHOTS_URL || 'https://luck-delta.vercel.app';
const SEED = { cm_birth: JSON.stringify({ y: '1988', m: '3', d: '15', h: '모름', min: '0' }), cm_nick: '천문' };
const GEO = { latitude: 37.4979, longitude: 127.0276 };

console.log(`▶ 캡처 대상: ${BASE}`);

const browser = await launchEdge();
const { shot, shots } = makeShooter('screenshots');
const txt = (page, t, exact = false) => byText(page, t, exact);
const tap = async (page, t) => { await txt(page, t).click({ timeout: 12000 }); };

/* 한 캡처 = 허브에서 새로 시작 → steps 수행 → 촬영. 실패해도 다음으로.
   opts.result: AI 결과('메인으로'가 보일 때)까지 대기. opts.scrollBody: 결과 본문도 _body로 한 장 더. */
async function capture(ctx, name, steps, { result = false, scrollBody = false, settle = 1500 } = {}) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1100);
    if (steps) await steps(page);
    if (result) await waitText(page, '메인으로', { timeout: 75000 }); // AI 분석 대기(없어도 throw 안 함)
    await page.evaluate(() => window.scrollTo({ top: 0 })).catch(() => {});
    await shot(page, name, result ? 3200 : settle);
    if (scrollBody) {
      await page.evaluate(() => window.scrollBy({ top: Math.round(window.innerHeight * 0.85) })).catch(() => {});
      await shot(page, `${name}_body`, 1200);
    }
  } catch (e) {
    console.log(`  ! ${name} 실패:`, e.message);
  } finally {
    await page.close();
  }
}

try {
  /* ── A. 온보딩 (시드 없는 새 컨텍스트) ── */
  try {
    const ctx0 = await mobileContext(browser);
    const page = await ctx0.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await shot(page, '01_entrance', 1600);
    await page.locator('[role="button"]').first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.getByPlaceholder('별명 또는 이름').fill('천문').catch(() => {});
    await page.getByPlaceholder('1990').first().fill('1988').catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '02_setup');
    await ctx0.close();
  } catch (e) { console.log('  ! 온보딩:', e.message); }

  /* ── B. 시드된 컨텍스트 — 전 기능 순회 ── */
  const ctx = await mobileContext(browser, { seed: SEED, geo: GEO });

  // 허브 + 카테고리 화면
  await capture(ctx, '03_hub', null);
  await capture(ctx, '04_cat_know', async (p) => { await tap(p, '운명 풀이'); });
  await capture(ctx, '05_cat_relate', async (p) => { await tap(p, '맞춤 운세'); });
  await capture(ctx, '06_cat_record', async (p) => { await tap(p, '기록 · 리포트'); });

  // 허브 직행 — 오늘의 운세 / 천문 식탁
  await capture(ctx, '10_fortune', async (p) => { await tap(p, '오늘의 운세'); }, { result: true, scrollBody: true });
  await capture(ctx, '26_food', async (p) => { await tap(p, '천문 식탁'); await p.waitForTimeout(1800); }, { settle: 2200 });
  await capture(ctx, '27_food_back', async (p) => { await tap(p, '천문 식탁'); await p.waitForTimeout(1800); await flip(p); }, { settle: 1800 });

  // 운명 풀이 하위
  await capture(ctx, '12_saju', async (p) => { await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '평생'); }, { result: true, scrollBody: true });
  await capture(ctx, '20_tarot_draw', async (p) => { await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '타로'); await p.waitForTimeout(900); }, { settle: 1800 });
  await capture(ctx, '21_tarot_result', async (p) => {
    await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '타로'); await p.waitForTimeout(900);
    await p.locator('button.animate-float').first().click({ force: true }).catch(() => {});
  }, { result: true });
  await capture(ctx, '22_astrology', async (p) => { await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '점성술'); }, { settle: 2600 });
  await capture(ctx, '23_ziwei', async (p) => { await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '자미두수'); }, { settle: 2600 });
  await capture(ctx, '24_numerology', async (p) => { await tap(p, '운명 풀이'); await p.waitForTimeout(700); await tap(p, '수비학'); }, { settle: 2600 });

  // 맞춤 운세 하위
  await capture(ctx, '14_weekly', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '주간'); }, { result: true });
  await capture(ctx, '15_monthly', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '월간'); }, { result: true });
  await capture(ctx, '16_yearly', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '올해'); }, { result: true });
  await capture(ctx, '17_wealth', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '재물'); }, { result: true });
  await capture(ctx, '18_gunghap_form', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '궁합'); await p.waitForTimeout(900); }, { settle: 1800 });
  await capture(ctx, '19_gunghap_result', async (p) => {
    await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '궁합'); await p.waitForTimeout(900);
    await p.getByPlaceholder('1990').first().fill('1992').catch(() => {});
    await txt(p, '궁합 보기').click().catch(() => {});
  }, { result: true });
  await capture(ctx, '25_study', async (p) => { await tap(p, '맞춤 운세'); await p.waitForTimeout(700); await tap(p, '학습 나침반'); }, { result: true });

  // 기록 · 리포트 하위
  await capture(ctx, '28_diary', async (p) => { await tap(p, '기록 · 리포트'); await p.waitForTimeout(700); await tap(p, '다이어리'); }, { settle: 1800 });
  await capture(ctx, '29_report_select', async (p) => { await tap(p, '기록 · 리포트'); await p.waitForTimeout(700); await tap(p, '프리미엄'); }, { settle: 1800 });

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n완료: ${shots.length}장 → screenshots/`);
