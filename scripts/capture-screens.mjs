/* ── 천문 앱 화면 자동 캡처 (현재 카테고리형 허브 구조에 맞춤) ──
   설계 원칙: '뒤로가기' 버튼(아이콘이라 텍스트로 못 누름)에 의존하지 않는다.
   대신 매 캡처마다 페이지를 새로 로드(goto)해 항상 허브에서 시작 → 한 기능이 실패해도
   다음 캡처에 영향이 없다(독립·견고). 시드된 localStorage 덕분에 로드 시 바로 허브로 진입.

   실행:  npm run shots                         (기본: 배포본)
          npm run shots http://localhost:4173   (로컬 빌드: npm run build && npm run preview 후)
          SHOTS_URL=... npm run shots            (환경변수로도 지정 가능) */
import { launchEdge, mobileContext, makeShooter, byText, waitText, flip } from './deck/capture-kit.mjs';

const BASE = process.argv[2] || process.env.SHOTS_URL || 'https://luck-delta.vercel.app';
const SEED = { cm_birth: JSON.stringify({ y: '1988', m: '3', d: '15', h: '모름', min: '0' }), cm_nick: '천문' };
const GEO = { latitude: 37.4979, longitude: 127.0276 };

console.log(`▶ 캡처 대상: ${BASE}`);

const browser = await launchEdge();
const { shot, shots } = makeShooter('screenshots');
const txt = (page, t, exact = false) => byText(page, t, exact);

/* 한 캡처 = 허브에서 새로 시작 → 클릭들 수행 → 촬영. 실패해도 다음으로 넘어간다.
   result:true 면 AI 결과 화면('메인으로'가 보일 때)까지 기다린다. */
async function capture(ctx, name, steps, { result = false } = {}) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    if (steps) await steps(page);
    if (result) await waitText(page, '메인으로', { timeout: 70000 }); // AI 분석 대기(없어도 throw 안 함)
    await page.evaluate(() => window.scrollTo({ top: 0 })).catch(() => {});
    await shot(page, name, result ? 3200 : 1400);
  } catch (e) {
    console.log(`  ! ${name} 실패:`, e.message);
  } finally {
    await page.close();
  }
}

try {
  /* ── A. 온보딩 (시드 없는 새 컨텍스트 — 첫 진입/입력 화면) ── */
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
    await shot(page, '02_setup_input');
    await ctx0.close();
  } catch (e) { console.log('  ! 온보딩:', e.message); }

  /* ── B. 시드된 컨텍스트 — 허브 + 기능별 캡처 ── */
  const ctx = await mobileContext(browser, { seed: SEED, geo: GEO });

  // 허브
  await capture(ctx, '03_hub', null);

  // 허브에서 직접 진입하는 항목
  await capture(ctx, 'fortune_오늘의운세', async (p) => { await txt(p, '오늘의 운세').click(); }, { result: true });
  await capture(ctx, 'food_천문식탁', async (p) => { await txt(p, '천문 식탁').click(); await p.waitForTimeout(1500); await flip(p); });

  // 카테고리 화면 자체(하위 메뉴가 보이는 화면)
  await capture(ctx, 'cat_운명풀이', async (p) => { await txt(p, '운명 풀이').click(); });
  await capture(ctx, 'cat_맞춤운세', async (p) => { await txt(p, '맞춤 운세').click(); });
  await capture(ctx, 'cat_기록리포트', async (p) => { await txt(p, '기록 · 리포트').click(); });

  // 카테고리 → 하위 기능 (라벨이 바뀌었을 수 있어 베스트에포트 — 실패 시 로그만)
  await capture(ctx, 'know_평생사주', async (p) => {
    await txt(p, '운명 풀이').click(); await p.waitForTimeout(700); await txt(p, '평생').click();
  }, { result: true });

  await capture(ctx, 'know_타로', async (p) => {
    await txt(p, '운명 풀이').click(); await p.waitForTimeout(700); await txt(p, '타로').click();
    await p.waitForTimeout(900); await p.locator('button.animate-float').first().click({ force: true }).catch(() => {});
  });

  await capture(ctx, 'relate_궁합', async (p) => {
    await txt(p, '맞춤 운세').click(); await p.waitForTimeout(700); await txt(p, '궁합').click();
    await p.waitForTimeout(700);
    await p.getByPlaceholder('1990').first().fill('1992').catch(() => {});
    await txt(p, '궁합 보기').click().catch(() => {});
  }, { result: true });

  await capture(ctx, 'record_다이어리', async (p) => {
    await txt(p, '기록 · 리포트').click(); await p.waitForTimeout(700); await txt(p, '다이어리').click();
  });

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n완료: ${shots.length}장 → screenshots/`);
