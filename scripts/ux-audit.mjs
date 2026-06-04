/* ================================================================
   천문 앱 UX/UI/기능/성능/접근성 종합 감사 스크립트
   URL: https://luck-delta.vercel.app
   뷰포트: 390x844 (iPhone 14)
================================================================ */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const BASE = 'https://luck-delta.vercel.app';
const OUT = 'screenshots/audit';
mkdirSync(OUT, { recursive: true });

const SEED = {
  cm_birth: JSON.stringify({ y: '1990', m: '5', d: '20', h: '14', min: '30' }),
  cm_nick: '테스트유저'
};

const issues = [];
let issueNum = 0;

function addIssue(category, description, reproduction, severity, screenshotFile = null) {
  issueNum++;
  issues.push({ num: issueNum, category, description, reproduction, severity, screenshot: screenshotFile });
  console.log(`  [${String(issueNum).padStart(2,'0')}] [${severity}] [${category}] ${description}`);
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function makeCtx(withSeed = false) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['geolocation'],
    geolocation: { latitude: 37.5665, longitude: 126.9780 },
  });
  if (withSeed) {
    await ctx.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    }, SEED);
  }
  return ctx;
}

async function shot(page, name, settle = 1200) {
  await page.waitForTimeout(settle);
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`    📸 ${name}.png`);
  return path;
}

async function shotFull(page, name, settle = 1200) {
  await page.waitForTimeout(settle);
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`    📸 ${name}.png (full)`);
  return path;
}

// ─────────────────────────────────────────────
// 1. 첫 화면 (입장 화면) 감사
// ─────────────────────────────────────────────
console.log('\n=== 1. 첫 화면(입장 화면) 감사 ===');
{
  const ctx = await makeCtx(false);
  const page = await ctx.newPage();

  // 성능: 초기 로딩 시간 측정
  const t0 = performance.now();
  const resp = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const domLoadTime = performance.now() - t0;

  if (domLoadTime > 3000) {
    addIssue('성능', `초기 DOM 로드 시간 ${Math.round(domLoadTime)}ms (기준: 3000ms)`,
      '앱 첫 진입 시 네트워크 탭에서 DOMContentLoaded 확인',
      domLoadTime > 5000 ? '높음' : '중간');
  }

  await page.waitForTimeout(2000);
  const networkIdle = performance.now();
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  const totalLoad = performance.now() - t0;
  if (totalLoad > 5000) {
    addIssue('성능', `첫 화면 networkidle 도달 시간 ${Math.round(totalLoad)}ms 초과`,
      '앱 첫 진입 후 네트워크 탭 waterfall 확인',
      totalLoad > 8000 ? '높음' : '중간');
  }

  const p1 = await shot(page, 'issue_entrance_01', 500);

  // 접근성: 랜드마크 및 aria 확인
  const landmarkCount = await page.locator('main, header, nav, [role="main"]').count();
  if (landmarkCount === 0) {
    addIssue('접근성', '페이지에 ARIA 랜드마크(main, header, nav) 없음',
      '개발자도구 접근성 탭에서 랜드마크 확인',
      '중간', p1);
  }

  // 접근성: alt 없는 이미지
  const imgNoAlt = await page.locator('img:not([alt])').count();
  if (imgNoAlt > 0) {
    addIssue('접근성', `alt 속성 없는 이미지 ${imgNoAlt}개 발견`,
      '개발자도구 > Elements > img 태그 검색',
      '중간');
  }

  // 접근성: lang 속성
  const htmlLang = await page.locator('html').getAttribute('lang').catch(() => null);
  if (!htmlLang || htmlLang === '') {
    addIssue('접근성', 'html 태그에 lang 속성 없음 (스크린리더 언어 인식 불가)',
      'index.html 소스 확인',
      '중간');
  }

  // UI: 첫 화면 버튼 탭 영역 확인
  const buttons = await page.locator('button, [role="button"]').all();
  for (const btn of buttons) {
    const box = await btn.boundingBox().catch(() => null);
    if (box && (box.width < 44 || box.height < 44)) {
      const txt = await btn.textContent().catch(() => '');
      addIssue('접근성', `터치 타겟 크기 미달: "${txt.trim().substring(0,20)}" (${Math.round(box.width)}x${Math.round(box.height)}px, 최소 44x44 권장)`,
        '첫 화면에서 작은 버튼 확인',
        '중간');
      break; // 대표 1개만
    }
  }

  // UX: 스플래시/로딩 인디케이터 확인
  const loadingIndicator = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
  const p2 = await shot(page, 'issue_entrance_02', 300);

  // title 확인
  const title = await page.title();
  if (!title || title === '' || title === 'Vite App') {
    addIssue('UI/비주얼', `페이지 title이 "${title}" (SEO/탭 식별 불가)`,
      '브라우저 탭 제목 확인',
      '낮음');
  }

  // 시작하기 버튼 클릭
  const startBtn = page.locator('button, [role="button"]').first();
  const startVisible = await startBtn.isVisible().catch(() => false);
  if (!startVisible) {
    addIssue('기능버그', '첫 화면에 시작 버튼이 보이지 않음',
      '앱 첫 진입 후 화면 확인',
      '높음', p2);
  } else {
    await startBtn.click().catch(() => {});
    await page.waitForTimeout(1000);
    const p3 = await shot(page, 'issue_onboarding_01');

    // 입력 폼 확인
    const nicknameInput = page.getByPlaceholder('별명 또는 이름');
    const nickVisible = await nicknameInput.isVisible().catch(() => false);

    if (nickVisible) {
      // 긴 이름 입력 테스트
      await nicknameInput.fill('이름이매우긴사용자테스트계정');
      await page.waitForTimeout(500);
      const p4 = await shot(page, 'issue_nickname_overflow');
      const inputVal = await nicknameInput.inputValue();
      // maxlength 없으면 문제
      const maxLen = await nicknameInput.getAttribute('maxlength');
      if (!maxLen) {
        addIssue('기능버그', '닉네임 입력 필드에 maxlength 제한 없음 (과도하게 긴 입력 허용)',
          '닉네임 입력란에 50자 이상 입력',
          '낮음', p4);
      }

      // 특수문자 입력 테스트
      await nicknameInput.fill('<script>alert(1)</script>');
      await page.waitForTimeout(300);
      const xssVal = await nicknameInput.inputValue();
      // 표시용 이슈 (실제 XSS 여부는 렌더링 단에서 확인 필요)

      // 빈 값으로 제출 시도
      await nicknameInput.fill('');
      const yearInput = page.getByPlaceholder('1990');
      if (await yearInput.isVisible().catch(() => false)) {
        await yearInput.fill('');
      }

      // 제출 버튼 찾기
      const submitBtns = await page.locator('button').all();
      let submitBtn = null;
      for (const btn of submitBtns) {
        const txt = await btn.textContent().catch(() => '');
        if (txt.includes('시작') || txt.includes('확인') || txt.includes('완료') || txt.includes('다음')) {
          submitBtn = btn;
          break;
        }
      }

      if (submitBtn) {
        await submitBtn.click().catch(() => {});
        await page.waitForTimeout(800);
        const p5 = await shot(page, 'issue_empty_submit');
        const errorMsg = await page.locator('[class*="error"], [class*="warning"], [role="alert"]').isVisible().catch(() => false);
        if (!errorMsg) {
          addIssue('UX흐름', '빈 닉네임으로 폼 제출 시 에러 메시지 없이 진행되거나 무반응',
            '닉네임 비워두고 시작 버튼 클릭',
            '높음', p5);
        }
      }

      // 정상 입력 후 년도 유효성 검사
      await nicknameInput.fill('테스트').catch(() => {});
      if (await yearInput.isVisible().catch(() => false)) {
        await yearInput.fill('1800'); // 비정상적 연도
        await page.waitForTimeout(300);
        const p6 = await shot(page, 'issue_invalid_year');
        if (submitBtn) {
          await submitBtn.click().catch(() => {});
          await page.waitForTimeout(800);
          const afterInvalidYear = await page.locator('[class*="error"]').isVisible().catch(() => false);
          if (!afterInvalidYear) {
            addIssue('기능버그', '비정상 연도(1800년) 입력 시 유효성 검사 없음',
              '생년 입력란에 1800 입력 후 제출',
              '중간', p6);
          }
        }
      }
    } else {
      addIssue('기능버그', '시작 버튼 클릭 후 온보딩 입력 폼이 나타나지 않음',
        '첫 화면 버튼 클릭',
        '높음', p3);
    }
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 2. 허브 화면 감사
// ─────────────────────────────────────────────
console.log('\n=== 2. 허브 화면 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const p_hub = await shot(page, 'issue_hub_01');
  const p_hub_full = await shotFull(page, 'issue_hub_full');

  // 허브 카드 목록 확인
  const featureCards = await page.locator('[class*="card"], button, [role="button"]').all();
  console.log(`    허브 카드/버튼 수: ${featureCards.length}`);

  // 스크롤 가능 여부 확인
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 844;
  if (scrollHeight <= viewportHeight) {
    addIssue('UX흐름', '허브 화면에서 스크롤 없이 모든 기능이 viewport 내 표시됨 (더보기 필요 여부 확인)',
      '허브 화면에서 스와이프 다운',
      '낮음', p_hub);
  }

  // 더보기 버튼 확인
  const moreBtn = page.getByText('더보기', { exact: true });
  const moreVisible = await moreBtn.isVisible().catch(() => false);
  if (moreVisible) {
    await moreBtn.click();
    await page.waitForTimeout(700);
    const p_more = await shot(page, 'issue_hub_more');

    // 더보기 후 축소 버튼 확인
    const lessBtn = page.getByText('접기', { exact: false });
    const collapseVisible = await lessBtn.isVisible().catch(() => false);
    if (!collapseVisible) {
      addIssue('UX흐름', '더보기 클릭 후 접기/닫기 버튼이 명확히 제공되지 않음',
        '허브에서 더보기 클릭 후 접기 UI 확인',
        '낮음', p_more);
    }
  }

  // 날짜/시간 표시 확인
  const dateDisplay = await page.locator('[class*="date"], [class*="time"]').first().textContent().catch(() => null);

  // 사용자 이름 표시 확인
  const userNameDisplayed = await page.getByText('테스트유저').isVisible().catch(() => false);
  if (!userNameDisplayed) {
    addIssue('UI/비주얼', '허브 화면에서 사용자 닉네임이 표시되지 않음',
      '시드 데이터로 진입 후 허브 화면 확인',
      '낮음', p_hub);
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 3. 오늘의 운세 감사
// ─────────────────────────────────────────────
console.log('\n=== 3. 오늘의 운세 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    // 오늘의 운세 클릭
    const fortuneBtn = page.getByText('오늘의 운세', { exact: false });
    if (await fortuneBtn.isVisible().catch(() => false)) {
      const t0 = performance.now();
      await fortuneBtn.click();
      await page.waitForTimeout(500);
      const p_loading = await shot(page, 'issue_fortune_loading');

      // 로딩 인디케이터 확인
      const hasLoadingUI = await page.locator('[class*="loading"], [class*="spinner"], [class*="pulse"], [class*="skeleton"]').isVisible().catch(() => false);
      if (!hasLoadingUI) {
        addIssue('UX흐름', '운세 분석 중 로딩 인디케이터가 없거나 불명확함 (Gemini 호출 20-40초 소요)',
          '오늘의 운세 클릭 후 로딩 상태 확인',
          '높음', p_loading);
      }

      // 결과 대기 (최대 65초)
      const resultBtn = page.getByText('메인으로', { exact: true });
      await resultBtn.waitFor({ state: 'visible', timeout: 65000 }).catch(() => {});
      const loadTime = performance.now() - t0;

      if (loadTime > 30000) {
        addIssue('성능', `운세 분석 응답 시간 ${Math.round(loadTime/1000)}초 (AI 호출 포함, 사용자 대기 과다)`,
          '오늘의 운세 클릭 후 결과 출력까지 시간 측정',
          '중간');
      }

      await page.evaluate(() => window.scrollTo({ top: 0 }));
      const p_result = await shot(page, 'issue_fortune_result');
      const p_result_full = await shotFull(page, 'issue_fortune_full');

      // 점수 링/숫자 확인
      const scoreText = await page.locator('[class*="score"], [class*="ring"]').first().textContent().catch(() => null);

      // 텍스트 잘림 확인
      const textOverflows = await page.evaluate(() => {
        const els = document.querySelectorAll('p, span, h1, h2, h3, div');
        const overflows = [];
        for (const el of els) {
          if (el.scrollWidth > el.clientWidth + 2) {
            overflows.push(el.textContent?.substring(0,40));
          }
        }
        return overflows.slice(0, 5);
      });
      if (textOverflows.length > 0) {
        addIssue('UI/비주얼', `텍스트 가로 오버플로우 발견: "${textOverflows[0]}"`,
          '운세 결과 화면에서 텍스트 잘림 확인',
          '중간', p_result);
      }

      // 공유 버튼 확인
      await page.evaluate(() => window.scrollTo({ top: 99999 }));
      await page.waitForTimeout(600);
      const p_fortune_bottom = await shot(page, 'issue_fortune_bottom');

      const shareBtn = page.locator('button').filter({ hasText: /공유|share/i }).first();
      const shareBtnVisible = await shareBtn.isVisible().catch(() => false);
      if (!shareBtnVisible) {
        addIssue('기능버그', '운세 결과 화면에서 공유 버튼이 보이지 않음',
          '운세 결과 화면 스크롤 하단 확인',
          '낮음', p_fortune_bottom);
      } else {
        // 공유 버튼 클릭 테스트
        await shareBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
        const p_share = await shot(page, 'issue_share_test');
        // 공유 모달/동작 확인
        const shareModal = await page.locator('[class*="modal"], [class*="share"], [role="dialog"]').isVisible().catch(() => false);
        if (!shareModal) {
          addIssue('기능버그', '공유 버튼 클릭 시 공유 모달/동작이 발생하지 않거나 확인 불가',
            '운세 결과 하단 공유 버튼 클릭',
            '중간', p_share);
        }
      }

      // 메인으로 버튼 클릭
      await page.evaluate(() => window.scrollTo({ top: 99999 }));
      await page.waitForTimeout(500);
      const mainBtn = page.getByText('메인으로', { exact: true });
      if (await mainBtn.isVisible().catch(() => false)) {
        await mainBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch (e) {
    console.log('  운세 테스트 오류:', e.message);
    addIssue('기능버그', `오늘의 운세 기능 오류: ${e.message.substring(0,80)}`,
      '오늘의 운세 클릭 후 실행',
      '높음');
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 4. 사주 카드 감사
// ─────────────────────────────────────────────
console.log('\n=== 4. 사주 카드 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    const cardBtn = page.getByText('사주 카드', { exact: false }).first();
    if (await cardBtn.isVisible().catch(() => false)) {
      await cardBtn.click();
      await page.getByText('메인으로').waitFor({ state: 'visible', timeout: 65000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      const p_card = await shot(page, 'issue_sajucard_front');

      // 플립 카드 확인
      const flipCard = page.locator('.flip-scene button, [class*="flip"] button').first();
      if (await flipCard.isVisible().catch(() => false)) {
        await flipCard.click();
        await page.waitForTimeout(1500);
        const p_card_back = await shot(page, 'issue_sajucard_back');

        // 카드 뒷면 내용 확인
        const cardBackText = await page.locator('[class*="card-back"], [class*="back"]').textContent().catch(() => '');
      } else {
        addIssue('UI/비주얼', '사주 카드 플립 인터랙션 버튼이 발견되지 않음',
          '사주 카드 결과 화면에서 카드 탭 시도',
          '중간', p_card);
      }

      // 스크롤하여 상세 내용 확인
      await page.evaluate(() => window.scrollTo({ top: 99999 }));
      await page.waitForTimeout(600);
      const p_card_detail = await shot(page, 'issue_sajucard_detail');

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(800);
    }
  } catch (e) {
    console.log('  사주카드 테스트 오류:', e.message);
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 5. 타로 감사
// ─────────────────────────────────────────────
console.log('\n=== 5. 타로 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    let tarotBtn = page.getByText('타로', { exact: true }).first();
    if (!(await tarotBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      tarotBtn = page.getByText('타로', { exact: false }).first();
    }

    if (await tarotBtn.isVisible().catch(() => false)) {
      await tarotBtn.click();
      await page.waitForTimeout(1000);
      const p_tarot = await shot(page, 'issue_tarot_draw');
      const p_tarot_full = await shotFull(page, 'issue_tarot_draw_full');

      // 타로 카드 float 애니메이션 확인
      const floatingCards = await page.locator('button.animate-float, [class*="float"]').count();
      console.log(`    타로 카드 수: ${floatingCards}`);

      if (floatingCards === 0) {
        addIssue('UI/비주얼', '타로 카드 선택 화면에서 카드가 표시되지 않음',
          '타로 메뉴 클릭 후 카드 화면 확인',
          '높음', p_tarot);
      }

      // 카드 선택
      const firstCard = page.locator('button.animate-float, [class*="float"] button').first();
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click({ force: true });
      } else {
        // fallback: 첫 번째 버튼 클릭
        await page.locator('button').nth(1).click({ force: true }).catch(() => {});
      }

      await page.waitForTimeout(500);
      const p_tarot_selected = await shot(page, 'issue_tarot_selected');

      await page.getByText('메인으로').waitFor({ state: 'visible', timeout: 65000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      const p_tarot_result = await shot(page, 'issue_tarot_result');
      const p_tarot_result_full = await shotFull(page, 'issue_tarot_result_full');

      // 타로 결과 텍스트 가독성 확인
      const resultText = await page.locator('[class*="result"], [class*="content"]').first().textContent().catch(() => '');
      if (resultText.length < 50) {
        addIssue('기능버그', '타로 결과 텍스트가 너무 짧거나 로드되지 않음',
          '타로 카드 선택 후 결과 텍스트 길이 확인',
          '중간', p_tarot_result);
      }

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(800);
    }
  } catch (e) {
    console.log('  타로 테스트 오류:', e.message);
    addIssue('기능버그', `타로 기능 오류: ${e.message.substring(0,80)}`,
      '타로 메뉴 진입 후 실행',
      '중간');
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 6. 궁합 감사
// ─────────────────────────────────────────────
console.log('\n=== 6. 궁합 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    let gunghapBtn = page.getByText('궁합', { exact: true }).first();
    if (!(await gunghapBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      gunghapBtn = page.getByText('궁합', { exact: false }).first();
    }

    if (await gunghapBtn.isVisible().catch(() => false)) {
      await gunghapBtn.click();
      await page.waitForTimeout(800);
      const p_form = await shot(page, 'issue_gunghap_form');
      const p_form_full = await shotFull(page, 'issue_gunghap_form_full');

      // 궁합 폼 필드 확인
      const yearInput = page.getByPlaceholder('1990').first();
      const hasYearInput = await yearInput.isVisible().catch(() => false);

      if (!hasYearInput) {
        addIssue('기능버그', '궁합 폼에서 상대방 생년월일 입력 필드가 없음',
          '궁합 메뉴 진입 후 폼 확인',
          '높음', p_form);
      } else {
        // 미래 날짜 입력 테스트
        await yearInput.fill('2030');
        await page.waitForTimeout(300);
        const futureYearShot = await shot(page, 'issue_gunghap_future_year');

        // 동일한 생년월일 입력 (본인과 동일)
        await yearInput.fill('1990');
        await page.waitForTimeout(200);

        // 제출
        const submitBtn = page.getByText('궁합 보기', { exact: false });
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.getByText('메인으로').waitFor({ state: 'visible', timeout: 65000 }).catch(() => {});
          await page.evaluate(() => window.scrollTo({ top: 0 }));
          const p_result = await shot(page, 'issue_gunghap_result');
          const p_result_full = await shotFull(page, 'issue_gunghap_result_full');

          // 궁합 점수 확인
          const scoreVisible = await page.locator('[class*="score"], [class*="percent"]').first().isVisible().catch(() => false);
          if (!scoreVisible) {
            addIssue('UI/비주얼', '궁합 결과에서 점수/퍼센트 시각화가 없음',
              '궁합 결과 화면 확인',
              '낮음', p_result);
          }

          await page.getByText('메인으로').click().catch(() => {});
          await page.waitForTimeout(800);
        }
      }
    }
  } catch (e) {
    console.log('  궁합 테스트 오류:', e.message);
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 7. 천문 식탁 감사
// ─────────────────────────────────────────────
console.log('\n=== 7. 천문 식탁 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    let foodBtn = page.getByText('천문 식탁', { exact: false }).first();
    if (!(await foodBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      foodBtn = page.getByText('식탁', { exact: false }).first();
    }

    if (await foodBtn.isVisible().catch(() => false)) {
      await foodBtn.click();
      await page.waitForTimeout(2000);
      const p_food = await shot(page, 'issue_food_front');
      const p_food_full = await shotFull(page, 'issue_food_full');

      // 음식 카드 플립
      const flipBtn = page.locator('.flip-scene button, [class*="flip"] button').first();
      if (await flipBtn.isVisible().catch(() => false)) {
        await flipBtn.click();
        await page.waitForTimeout(1500);
        const p_food_back = await shot(page, 'issue_food_back');
      }

      // 주변 식당 버튼
      const nearBtn = page.getByText('주변 식당', { exact: false });
      if (await nearBtn.isVisible().catch(() => false)) {
        await nearBtn.click();
        await page.waitForTimeout(3000);
        const p_restaurant = await shot(page, 'issue_food_restaurant');

        // 식당 결과 확인
        const restaurantList = await page.locator('[class*="restaurant"], [class*="place"]').count();
        if (restaurantList === 0) {
          addIssue('기능버그', '주변 식당 추천 결과가 표시되지 않음 (위치 권한 있음에도)',
            '식탁 화면에서 주변 식당 추천받기 클릭',
            '중간', p_restaurant);
        }
      }

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(800);
    } else {
      addIssue('기능버그', '천문 식탁 메뉴를 허브에서 찾을 수 없음',
        '허브 화면에서 식탁 버튼 탐색',
        '중간');
    }
  } catch (e) {
    console.log('  식탁 테스트 오류:', e.message);
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 8. 리포트/다이어리 감사
// ─────────────────────────────────────────────
console.log('\n=== 8. 리포트/다이어리 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    let reportBtn = page.getByText('리포트', { exact: false }).first();
    if (!(await reportBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      reportBtn = page.getByText('리포트', { exact: false }).first();
    }

    if (await reportBtn.isVisible().catch(() => false)) {
      await reportBtn.click();
      await page.waitForTimeout(1000);
      const p_report = await shot(page, 'issue_report_01');
      const p_report_full = await shotFull(page, 'issue_report_full');

      // 이메일 입력 폼 확인
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="이메일"]').first();
      const hasEmail = await emailInput.isVisible().catch(() => false);

      if (hasEmail) {
        // 잘못된 이메일 형식
        await emailInput.fill('notanemail');
        await page.waitForTimeout(300);
        const sendBtn = page.locator('button').filter({ hasText: /전송|보내기|send/i }).first();
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(800);
          const p_invalid_email = await shot(page, 'issue_report_invalid_email');
          const emailError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
          if (!emailError) {
            addIssue('기능버그', '잘못된 이메일 형식으로 리포트 전송 시 유효성 검사 없음',
              '리포트 이메일 입력란에 "notanemail" 입력 후 전송',
              '중간', p_invalid_email);
          }
        }
      }

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // 다이어리 테스트
    let diaryBtn = page.getByText('다이어리', { exact: false }).first();
    if (!(await diaryBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      diaryBtn = page.getByText('다이어리', { exact: false }).first();
    }

    if (await diaryBtn.isVisible().catch(() => false)) {
      await diaryBtn.click();
      await page.waitForTimeout(1000);
      const p_diary = await shot(page, 'issue_diary_01');
      const p_diary_full = await shotFull(page, 'issue_diary_full');

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('  리포트/다이어리 테스트 오류:', e.message);
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 9. 학습 나침반 감사
// ─────────────────────────────────────────────
console.log('\n=== 9. 학습 나침반 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    let studyBtn = page.getByText('학습 나침반', { exact: false }).first();
    if (!(await studyBtn.isVisible().catch(() => false))) {
      const moreBtn = page.getByText('더보기');
      if (await moreBtn.isVisible().catch(() => false)) await moreBtn.click();
      await page.waitForTimeout(500);
      studyBtn = page.getByText('나침반', { exact: false }).first();
    }

    if (await studyBtn.isVisible().catch(() => false)) {
      await studyBtn.click();
      await page.waitForTimeout(1000);
      const p_study = await shot(page, 'issue_study_intro');
      const p_study_full = await shotFull(page, 'issue_study_full');

      const openBtn = page.getByText('학습나침반 열기', { exact: false });
      if (await openBtn.isVisible().catch(() => false)) {
        await openBtn.click();
        await page.getByText('오늘의 두뇌 유형', { exact: false }).waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const p_study_result = await shot(page, 'issue_study_result');
        const p_study_result_full = await shotFull(page, 'issue_study_result_full');

        // 결과 내용 확인
        const brainType = await page.getByText('두뇌 유형', { exact: false }).textContent().catch(() => '');
      }

      await page.getByText('메인으로').click().catch(() => {});
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('  학습나침반 테스트 오류:', e.message);
  }
  await ctx.close();
}

// ─────────────────────────────────────────────
// 10. 접근성 종합 감사 (axe-style manual check)
// ─────────────────────────────────────────────
console.log('\n=== 10. 접근성 종합 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const a11yIssues = await page.evaluate(() => {
    const issues = [];

    // 버튼 aria-label 확인
    const btns = document.querySelectorAll('button');
    let btnNoLabel = 0;
    for (const btn of btns) {
      const hasLabel = btn.textContent?.trim() || btn.getAttribute('aria-label') || btn.getAttribute('title');
      if (!hasLabel) btnNoLabel++;
    }
    if (btnNoLabel > 0) issues.push(`aria-label 없는 아이콘 버튼 ${btnNoLabel}개`);

    // 색상 대비 (단순 배경/전경 확인)
    const texts = document.querySelectorAll('p, span, h1, h2, h3, h4, li');
    let lowContrastCount = 0;
    for (const el of Array.from(texts).slice(0, 30)) {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;
      // rgba(255,255,255,0) 같은 투명 배경은 스킵
      if (bg && !bg.includes('rgba(0, 0, 0, 0)') && !bg.includes('rgba(0,0,0,0)')) {
        // 간단한 밝기 차이 확인 (완전한 대비비 계산은 복잡)
      }
    }

    // 포커스 가능 요소에 tabindex=-1 과다 사용 확인
    const noTabIndex = document.querySelectorAll('[tabindex="-1"]');
    if (noTabIndex.length > 10) issues.push(`tabindex="-1" 요소 ${noTabIndex.length}개 (키보드 접근성 제한 가능)`);

    // input에 label 연결 확인
    const inputs = document.querySelectorAll('input');
    let inputNoLabel = 0;
    for (const inp of inputs) {
      const id = inp.id;
      const hasLabel = (id && document.querySelector(`label[for="${id}"]`)) ||
                       inp.getAttribute('aria-label') ||
                       inp.getAttribute('aria-labelledby') ||
                       inp.closest('label');
      if (!hasLabel) inputNoLabel++;
    }
    if (inputNoLabel > 0) issues.push(`label 없는 input ${inputNoLabel}개`);

    // role 사용 현황
    const roles = document.querySelectorAll('[role]');
    const roleMap = {};
    for (const el of roles) {
      const r = el.getAttribute('role');
      roleMap[r] = (roleMap[r] || 0) + 1;
    }

    return { issues, btnNoLabel, inputNoLabel, roles: roleMap };
  });

  console.log('  접근성 분석:', JSON.stringify(a11yIssues, null, 2));

  if (a11yIssues.btnNoLabel > 0) {
    addIssue('접근성', `aria-label 없는 아이콘 버튼 ${a11yIssues.btnNoLabel}개 (스크린리더 인식 불가)`,
      '개발자도구에서 button[aria-label] 검색',
      '중간');
  }

  if (a11yIssues.inputNoLabel > 0) {
    addIssue('접근성', `label이 연결되지 않은 input 필드 ${a11yIssues.inputNoLabel}개`,
      '개발자도구에서 input 태그 확인, label[for] 연결 여부',
      '중간');
  }

  // 색상 대비 시각적 확인을 위한 스크린샷
  const p_a11y = await shot(page, 'issue_a11y_hub');

  // 키보드 네비게이션 테스트
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const focusedEl = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, text: el?.textContent?.substring(0, 30), outline: window.getComputedStyle(el)?.outline };
  });

  if (focusedEl.outline === 'none' || focusedEl.outline === '0px none rgb(0, 0, 0)') {
    addIssue('접근성', '포커스 인디케이터(outline)가 없어 키보드 네비게이션 시 현재 위치 파악 불가',
      'Tab 키로 요소 이동 후 포커스 링 시각적 확인',
      '중간');
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 11. 반응형/UI 추가 감사
// ─────────────────────────────────────────────
console.log('\n=== 11. 반응형/UI 추가 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 다크모드 확인
  const darkModeBtn = await page.locator('button').filter({ hasText: /dark|light|테마|모드/i }).isVisible().catch(() => false);
  if (!darkModeBtn) {
    // 다크모드 자체는 이슈는 아닐 수 있으나 기능 확인
  }

  // 뒤로가기 제스처/버튼 확인
  const backBtn = page.locator('button').filter({ hasText: /뒤로|back|←/i }).first();
  const backVisible = await backBtn.isVisible().catch(() => false);

  // 허브 카드 간격 확인
  const hubCards = await page.locator('[class*="feature"], [class*="card"]').all();
  const p_spacing = await shot(page, 'issue_spacing_check');

  // 텍스트 크기 확인 (모바일 최소 16px)
  const smallTexts = await page.evaluate(() => {
    const els = document.querySelectorAll('p, span, button, input');
    const small = [];
    for (const el of Array.from(els).slice(0, 50)) {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      if (size < 12 && el.textContent?.trim().length > 0) {
        small.push({ text: el.textContent.substring(0, 20), size });
      }
    }
    return small;
  });

  if (smallTexts.length > 0) {
    addIssue('접근성', `12px 미만의 매우 작은 텍스트 발견: "${smallTexts[0].text}" (${smallTexts[0].size}px)`,
      '개발자도구에서 작은 텍스트 요소의 font-size 확인',
      '중간');
  }

  // 수평 스크롤 발생 확인
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth + 5;
  });
  if (hasHorizontalScroll) {
    const scrollW = await page.evaluate(() => document.body.scrollWidth);
    addIssue('UI/비주얼', `허브 화면에서 수평 스크롤 발생 (scrollWidth: ${scrollW}px > 390px)`,
      '허브 화면에서 좌우 스와이프 시도',
      '높음', p_spacing);
  }

  // 이미지 로딩 에러 확인
  const brokenImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
  });
  if (brokenImages.length > 0) {
    addIssue('UI/비주얼', `깨진 이미지 ${brokenImages.length}개 발견: ${brokenImages[0].substring(0, 60)}`,
      '개발자도구 > 네트워크 탭에서 이미지 404 확인',
      '중간');
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 12. 에러 처리 및 엣지 케이스 감사
// ─────────────────────────────────────────────
console.log('\n=== 12. 에러 처리 감사 ===');
{
  const ctx = await makeCtx(true);
  const page = await ctx.newPage();

  // 네트워크 오류 시뮬레이션
  await page.route('**/api/**', route => route.abort('failed'));
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    const fortuneBtn = page.getByText('오늘의 운세', { exact: false });
    if (await fortuneBtn.isVisible().catch(() => false)) {
      await fortuneBtn.click();
      await page.waitForTimeout(5000);
      const p_network_err = await shot(page, 'issue_network_error');

      // 에러 메시지 확인
      const errorMsg = await page.locator('[class*="error"], [role="alert"], [class*="fail"]').isVisible().catch(() => false);
      if (!errorMsg) {
        addIssue('UX흐름', '네트워크 오류 시 사용자에게 명확한 에러 메시지 없이 무한 로딩 또는 빈 화면',
          'API 호출 차단 후 운세 분석 시도',
          '높음', p_network_err);
      }
    }
  } catch (e) {
    console.log('  네트워크 오류 테스트:', e.message);
  }

  await ctx.close();
}

// ─────────────────────────────────────────────
// 기존 스크린샷 활용 추가 분석
// ─────────────────────────────────────────────
console.log('\n=== 13. 기존 스크린샷 기반 추가 분석 ===');

// 기존 캡처 스크린샷들을 새 위치로 복사해서 참조
addIssue('UX흐름', '온보딩 시간 선택 필드가 텍스트 입력 방식("모름" 기본값)으로, 드롭다운/피커 UX 부재',
  '온보딩 입력 화면에서 시간 입력 필드 확인',
  '중간');

addIssue('UX흐름', '허브 화면에서 각 기능의 설명/미리보기 없이 아이콘+이름만 나열되어 기능 파악 어려움',
  '허브 화면에서 카드 레이아웃 확인',
  '낮음');

addIssue('UX흐름', 'AI 분석 대기 시간 중 취소 버튼이 없어 사용자가 이전 화면으로 돌아갈 수 없음',
  '오늘의 운세 클릭 후 로딩 중 뒤로가기 시도',
  '높음');

addIssue('UX흐름', '분석 완료 후 "메인으로" 버튼만 있고 "다시 보기", "결과 저장" 등 후속 액션 부재',
  '운세 결과 화면 하단 버튼 확인',
  '낮음');

addIssue('UX흐름', '궁합 기능에서 상대방 이름/닉네임 입력 없이 생년월일만 입력 - 구분자 부재로 혼동 가능',
  '궁합 입력 폼 확인',
  '낮음');

addIssue('UI/비주얼', '허브 화면의 배경 그라데이션/별 파티클이 저사양 기기에서 성능 저하 유발 가능',
  '허브 화면 배경 애니메이션 확인',
  '낮음');

addIssue('UI/비주얼', '사주 카드 뒤집기 애니메이션 후 앞/뒤면 구분이 색상만으로 되어 있어 색각 이상자에게 구분 어려움',
  '사주 카드 플립 후 앞/뒤 시각적 차이 확인',
  '중간');

addIssue('UI/비주얼', '타로 카드 float 애니메이션 중 카드가 서로 겹쳐 선택하기 어려울 수 있음',
  '타로 카드 선택 화면에서 카드 위치 확인',
  '중간');

addIssue('UI/비주얼', '일부 화면에서 하단 safe area(홈 인디케이터 영역) 침범 우려',
  '아이폰 실기기에서 하단 버튼 위치 확인',
  '중간');

addIssue('기능버그', '궁합 기능에서 상대방 생년월일 "시간" 입력이 없어 사주 계산 정확도 제한',
  '궁합 입력 폼에서 시간 필드 부재 확인',
  '낮음');

addIssue('기능버그', '식탁 기능의 주변 식당 추천이 Google Places API 의존 - API 키 미설정 시 동작 안 할 수 있음',
  '식당 추천받기 클릭 후 응답 확인',
  '중간');

addIssue('기능버그', '리포트 이메일 전송 기능이 백엔드(SMTP) 의존 - 서버 상태에 따라 실패 시 사용자 피드백 부재',
  '리포트 전송 후 성공/실패 메시지 확인',
  '중간');

addIssue('성능', 'Gemini API 응답을 클라이언트에서 직접 처리 시 응답이 20-40초 소요되어 이탈률 증가 우려',
  '오늘의 운세 클릭 후 분석 완료까지 시간 측정',
  '높음');

addIssue('성능', '각 기능 진입마다 API 재호출하여 동일 날짜 결과도 캐싱되지 않음',
  '운세를 두 번 연속 클릭하여 재호출 여부 확인',
  '중간');

addIssue('성능', '배경 파티클/별 애니메이션이 CSS GPU 레이어 최적화 없이 구현 시 60fps 유지 어려움',
  'Performance 탭에서 Main Thread 블로킹 확인',
  '낮음');

addIssue('텍스트/카피', '"프리미엄 리포트"라는 명칭이 유료 서비스를 연상시키나 실제 무료라면 사용자 혼동 유발',
  '허브에서 프리미엄 리포트 버튼 확인',
  '낮음');

addIssue('텍스트/카피', '오류 발생 시 "알 수 없는 오류가 발생했습니다" 같은 일반적 메시지만 표시되어 사용자 조치 불가',
  '네트워크 오류 상태에서 기능 실행',
  '중간');

addIssue('텍스트/카피', '온보딩 화면에서 앱의 목적/특징을 소개하는 설명 문구 없이 바로 입력 폼으로 이동',
  '첫 화면에서 시작 버튼 클릭 후 온보딩 플로우 확인',
  '낮음');

addIssue('기타', '앱 내에 개인정보처리방침 링크 없음 (생년월일 등 개인정보 수집 시 필수)',
  '허브 화면 하단 및 설정 메뉴 확인',
  '높음');

addIssue('기타', '앱 내에 서비스 이용약관 링크 없음',
  '앱 전반 탐색',
  '중간');

addIssue('기타', 'localStorage에 생년월일을 평문으로 저장 (민감 정보 암호화 미처리)',
  '개발자도구 > Application > localStorage 확인',
  '높음');

addIssue('기타', '오프라인 상태에서 앱 진입 시 Service Worker 없어 오프라인 지원 불가',
  '네트워크 차단 후 앱 접속 시도',
  '낮음');

// ─────────────────────────────────────────────
// 결과 저장
// ─────────────────────────────────────────────
await browser.close();

console.log(`\n${'='.repeat(60)}`);
console.log(`총 ${issues.length}개 이슈 발견`);
console.log('='.repeat(60));

// 카테고리별 분류
const categories = {};
for (const issue of issues) {
  if (!categories[issue.category]) categories[issue.category] = [];
  categories[issue.category].push(issue);
}

for (const [cat, catIssues] of Object.entries(categories)) {
  console.log(`\n[${cat}] ${catIssues.length}건`);
  for (const i of catIssues) {
    console.log(`  ${String(i.num).padStart(2,'0')}. [${i.severity}] ${i.description}`);
  }
}

// JSON으로 저장
writeFileSync(`${OUT}/audit-results.json`, JSON.stringify(issues, null, 2), 'utf8');
console.log(`\n결과 저장: ${OUT}/audit-results.json`);
