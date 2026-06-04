/* ================================================================
   DeckKit · 캡처 엔진 [범용]
   Playwright(시스템 Edge)로 웹앱 화면을 모바일 뷰로 촬영하는 공통 헬퍼.
   앱별 '무엇을 누르고 무엇을 찍을지'(플로우)는 호출부가 정의하고,
   '어떻게 브라우저를 띄우고 찍고 기다릴지'(보일러플레이트)는 여기서 제공.

   사용 예:
     import { launchEdge, mobileContext, makeShooter, byText, flip } from './deck/capture-kit.mjs';
     const browser = await launchEdge();
     const ctx = await mobileContext(browser, { seed: {key:'val'}, geo: {latitude, longitude} });
     const page = await ctx.newPage();
     const { shot, shots } = makeShooter('screenshots');
     await page.goto(url); await shot(page, '01_home');
================================================================ */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

/* 시스템 Edge를 헤드리스로 실행(별도 브라우저 설치 불필요).
   Edge가 없으면 channel 옵션을 빼고 번들 Chromium으로 대체 가능. */
export async function launchEdge(opts = {}) {
  return chromium.launch({ channel: 'msedge', headless: true, ...opts });
}

/* 모바일 컨텍스트 생성 — 시드(localStorage)·위치 권한 옵션. */
export async function mobileContext(browser, { seed, geo, viewport = { width: 412, height: 915 }, scale = 2, locale = 'ko-KR', tz = 'Asia/Seoul' } = {}) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: scale, locale, timezoneId: tz,
    ...(geo ? { permissions: ['geolocation'], geolocation: geo } : {}),
  });
  if (seed) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, seed);
  return ctx;
}

/* 촬영기 — outDir을 만들고 shot()/목록을 반환. */
export function makeShooter(outDir = 'screenshots') {
  mkdirSync(outDir, { recursive: true });
  const shots = [];
  async function shot(page, name, settle = 1000) {
    await page.waitForTimeout(settle);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    shots.push(name);
    console.log('  ✓', name);
  }
  return { shot, shots, outDir };
}

/* 보이는 텍스트로 요소 선택(첫 번째). */
export const byText = (page, t, exact = true) => page.getByText(t, { exact }).first();

/* 특정 텍스트가 보일 때까지 대기(없어도 throw 안 함). */
export async function waitText(page, t, { exact = false, timeout = 60000 } = {}) {
  return byText(page, t, exact).waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
}

/* 3D 플립 카드 뒤집기(셀렉터 일치 시). */
export async function flip(page, selector = '.flip-scene button', wait = 1300) {
  const card = page.locator(selector).first();
  if (await card.isVisible().catch(() => false)) { await card.click(); await page.waitForTimeout(wait); return true; }
  return false;
}

/* 떠다니는(animation) 요소도 강제 클릭. */
export async function forceClick(page, selector) {
  return page.locator(selector).first().click({ force: true }).then(() => true).catch(() => false);
}
