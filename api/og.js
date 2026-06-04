/* ================================================================
   천문 — Vercel Serverless Function: 결과별 OG 이미지(1200×630 PNG)
   GET /api/og?t=..&s=87&q=..&i=갑자&e=화&c=fb7185
   파라미터가 출력을 완전히 결정 → CDN 영구 캐시(같은 결과는 재렌더 없음).

   렌더: 헤드리스 크롬으로 api/_ogCard.js의 HTML을 그려 캔버스를 스크린샷.
   - 프로덕션(Vercel): @sparticuz/chromium 바이너리
   - 로컬: 설치된 playwright의 번들 크롬(LOCAL_CHROME로 직접 지정도 가능)
================================================================ */
import { chromium as pw } from 'playwright-core';
import { buildOgHtml, ogParams } from './_ogCard.js';

async function resolveBrowser() {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return { executablePath: await chromium.executablePath(), args: chromium.args, headless: true };
  }
  // 로컬: 우선 LOCAL_CHROME, 없으면 full playwright의 번들 크롬 경로
  let executablePath = process.env.LOCAL_CHROME;
  if (!executablePath) {
    try { executablePath = (await import('playwright')).chromium.executablePath(); } catch (e) { /* full playwright 미설치 */ }
  }
  return { executablePath, args: [], headless: true };
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const query = Object.fromEntries(url.searchParams.entries());
    const p = ogParams(query);
    const html = buildOgHtml(p);

    const opts = await resolveBrowser();
    const browser = await pw.launch(opts);
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
      // networkidle: 구글폰트 CSS+서브셋 다운로드가 끝나길 기다린다(한글 □ 방지)
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__ready === true, { timeout: 12000 }).catch(() => {});
      const buf = await page.locator('#c').screenshot({ type: 'png' });
      res.setHeader('Content-Type', 'image/png');
      // 파라미터가 출력을 결정 → 1년 immutable 캐시(CDN/봇 재요청 비용 0)
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status(200).send(buf);
    } finally {
      await browser.close();
    }
  } catch (e) {
    // 렌더 실패 시 정적 OG로 폴백(미리보기가 아예 안 뜨는 것보다 낫다)
    res.setHeader('Location', '/og.png');
    return res.status(302).end();
  }
}
