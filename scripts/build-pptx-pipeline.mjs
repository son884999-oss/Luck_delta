/* ================================================================
   천문(天文) — '자동 캡처 → PPTX 자동화' 파이프라인 설명용 PPTX
   범용 엔진(scripts/deck/pptx-kit.mjs)을 사용해 자동화 로직 자체를 설명한다.
   출력: 천문_자동화_파이프라인.pptx   ·   실행: npm run pptx:pipeline
================================================================ */
import { newDeck, makeKit } from './deck/pptx-kit.mjs';

const pptx = newDeck({ title: '천문 — 발표자료 자동화 파이프라인' });
const K = makeKit(pptx, { imageDir: 'screenshots', docName: '천문(天文) · 발표자료 자동화 파이프라인' });
const { theme: T } = K;
const W = T.W;

/* ── 표지 ── */
{
  const s = pptx.addSlide();
  s.background = { color: 'FFFFFF' };
  s.addText('부속 자료 · 개발 자동화', { x: 0.9, y: 0.7, w: W - 1.8, h: 0.4, fontFace: T.font, color: T.sub, fontSize: 13, charSpacing: 2 });
  K.line(s, 0.9, 1.18, W - 1.8, T.navy, 2.25);
  s.addText('발표자료 자동화 파이프라인', { x: 0, y: 2.7, w: '100%', align: 'center', fontFace: T.font, color: T.navy, fontSize: 40, bold: true });
  s.addText('스크린샷 자동 촬영 → 최신화 → PowerPoint 자동 생성', { x: 0, y: 3.7, w: '100%', align: 'center', fontFace: T.font, color: T.gold, fontSize: 17, bold: true });
  s.addText('명령 한 줄로 앱의 모든 기능 화면을 다시 찍고 발표자료를 재생성합니다.', { x: 0, y: 4.3, w: '100%', align: 'center', fontFace: T.font, color: T.sub, fontSize: 14 });
}

/* ── 1. 한눈에 보는 흐름 ── */
{
  const s = pptx.addSlide();
  K.header(s, 1, '개요', '한눈에 보는 자동화 흐름');
  const y = 2.9, h = 2.2, w = 2.55, gap = 0.5;
  let x = 0.7;
  const steps = [
    { n: '1', title: '캡처', sub: '헤드리스 브라우저가\n실제 앱을 자동 조작·촬영' },
    { n: '2', title: '최신화', sub: 'screenshots/ 폴더의\n이미지를 새 화면으로 갱신' },
    { n: '3', title: '빌드', sub: '이미지+대본을\nPPTX로 자동 조판' },
    { n: '4', title: '산출', sub: '천문_발표자료.pptx\n(공문서 양식 23면)' },
  ];
  for (let i = 0; i < steps.length; i++) {
    K.stepBox(s, x, y, w, h, steps[i]);
    if (i < steps.length - 1) K.arrow(s, x + w + (gap - 0.4) / 2, y + h / 2 - 0.2);
    x += w + gap;
  }
  s.addText('핵심: 사람이 화면을 일일이 캡처·붙여넣기 하지 않는다. 코드가 앱을 직접 열어 찍고, 그 자리에서 발표자료까지 만든다.',
    { x: 0.7, y: 5.5, w: W - 1.4, h: 1.0, fontFace: T.font, color: T.ink, fontSize: 15, align: 'center', valign: 'middle', lineSpacingMultiple: 1.2 });
  K.footer(s);
}

/* ── 2. 명령어 ── */
{
  const s = pptx.addSlide();
  K.header(s, 2, '사용법', '명령어 한 줄이면 끝');
  K.codebox(s, [
    '# 1) 화면 캡처만 갱신 (배포본 기준)',
    'npm run shots',
    '',
    '# 2) 갱신된 이미지로 발표자료 생성',
    'npm run pptx',
    '',
    '# 3) 위 둘을 한 번에 (촬영→최신화→빌드)',
    'npm run deck',
    '',
    '# 로컬 개발 서버 대상으로 캡처할 때',
    'npm run shots http://localhost:5173',
  ], 0.7, 2.2, 6.7, 4.5);
  K.bullets(s, [
    'shots : 앱을 열어 기능별 화면·상호작용을 자동 촬영',
    'pptx : screenshots/ 이미지를 PPTX로 자동 조판',
    'deck : 촬영부터 빌드까지 한 번에 — 기능이 바뀌면 이 한 줄',
    '대상 URL을 인자로 주면 배포본/로컬 선택 가능',
    '결과물: 천문_발표자료.pptx (항상 최신 화면 반영)',
  ], 7.7, 2.4, 5.0, 15);
  K.footer(s);
}

/* ── 3. 1단계 캡처 원리 ── */
{
  const s = pptx.addSlide();
  K.header(s, 3, '1단계 · 캡처', '브라우저를 코드로 조작해 촬영');
  K.bullets(s, [
    'Playwright + 시스템 Edge(설치 불필요)로 헤드리스 구동',
    '모바일 화면(412×915, 2배 선명도)으로 실제 사용 환경 재현',
    'localStorage에 생년월일을 미리 주입 → 곧바로 메인 화면 진입',
    '화면의 버튼·텍스트를 코드가 눌러 각 기능으로 이동',
    '카드 뒤집기·점수 공개·타로 뽑기 등 상호작용까지 자동 수행',
    'AI 결과 화면은 분석 완료(‘메인으로’ 노출)까지 대기 후 촬영',
  ], 0.7, 2.25, 7.0, 15.5);
  K.codebox(s, [
    "// scripts/deck/capture-kit.mjs (요약)",
    "const b = await launchEdge();",
    "const ctx = await mobileContext(b,",
    "  { seed, geo });   // 생일·위치 주입",
    "await page.getByText('천문 식탁').click();",
    "await flip(page);   // 카드 뒤집기",
    "await shot(page, '26_food_back');",
  ], 8.0, 2.25, 4.7, 3.0);
  K.footer(s);
}

/* ── 4. 1단계 산출 예시 ── */
{
  const s = pptx.addSlide();
  K.header(s, 4, '1단계 · 결과', '자동 촬영된 화면 예시');
  const shots = ['03_hub.png', '13_card_front.png', '14_card_back.png', '24_tarot_result.png'].filter(K.has);
  const n = shots.length || 1, gap = 0.4, areaW = W - 1.4;
  const r0 = shots.length ? K.ratio(shots[0]) : 0.45;
  let w = (areaW - gap * (n - 1)) / n, h = w / r0;
  if (h > 4.4) { h = 4.4; w = h * r0; }
  let x = 0.7 + (areaW - (w * n + gap * (n - 1))) / 2;
  for (const f of shots) { s.addImage({ path: `screenshots/${f}`, x, y: 2.2, w, h, shadow: { type: 'outer', color: '9AA3B2', opacity: 0.4, blur: 6, offset: 2, angle: 90 } }); x += w + gap; }
  s.addText('메인 화면 · 카드(펼치기 전) · 카드(펼친 후) · 타로 결과 — 모두 사람 손 없이 자동 캡처', { x: 0.7, y: 6.75, w: W - 1.4, h: 0.4, align: 'center', fontFace: T.font, color: T.sub, fontSize: 12 });
  K.footer(s);
}

/* ── 5. 2~3단계 빌드 + 모듈 구조 ── */
{
  const s = pptx.addSlide();
  K.header(s, 5, '2·3단계 · 빌드', '이미지+대본을 PPTX로 조판');
  K.bullets(s, [
    'pptxgenjs로 슬라이드를 코드로 생성(공문서 양식 템플릿)',
    '이미지의 실제 해상도를 읽어 비율 보존 배치(세로/가로 자동)',
    '엔진과 내용 분리: deck/(범용 엔진) ↔ build-*.mjs(천문 대본)',
    '머리글·바닥글·쪽번호·괘선을 모든 면에 일관 적용',
    '발표자 노트까지 자동 삽입 → 발표 준비 시간 단축',
  ], 0.7, 2.25, 7.0, 15.5);
  K.codebox(s, [
    "// scripts/build-pptx.mjs (요약)",
    "import { newDeck, makeKit }",
    "  from './deck/pptx-kit.mjs';",
    "const K = makeKit(pptx, {...});",
    "for (const c of S)",
    "  K.content(pptx.addSlide(), c);",
    "await pptx.writeFile(",
    "  { fileName:'천문_발표자료.pptx' });",
  ], 8.0, 2.25, 4.7, 3.2);
  K.footer(s);
}

/* ── 6. 재사용성(다른 프로젝트로 추출) ── */
{
  const s = pptx.addSlide();
  K.header(s, 6, '재사용', '다른 프로젝트로 추출');
  K.bullets(s, [
    'scripts/deck/ 폴더만 복사하면 엔진 이식 완료(프로젝트 의존 없음)',
    'pptx-kit.mjs : 공문서 PPTX 빌더(표지·본문·코드박스·흐름도)',
    'capture-kit.mjs : 브라우저 실행·캡처·대기·플립 공통 헬퍼',
    'imgsize.mjs : 이미지 해상도 판별(외부 의존 0)',
    '새 프로젝트는 셀렉터·대본만 새로 작성 → 즉시 발표자료 자동화',
  ], 0.7, 2.25, 8.3, 16);
  if (K.has('u_terminal.png')) {
    const r = K.ratio('u_terminal.png'); const w = 4.3, h = w / r;
    s.addImage({ path: 'screenshots/u_terminal.png', x: 8.4, y: 4.5, w, h, shadow: { type: 'outer', color: '9AA3B2', opacity: 0.4, blur: 6, offset: 2, angle: 90 } });
    s.addText('실제 생성 로그', { x: 8.4, y: 4.5 + h + 0.05, w: 4.3, align: 'center', fontFace: T.font, color: T.sub, fontSize: 10 });
  }
  K.footer(s);
}

/* ── 맺음 ── */
{
  const s = pptx.addSlide(); K.bumpPage();
  s.background = { color: 'FFFFFF' };
  s.addText('맺음', { x: 0.6, y: 0.42, w: 7, h: 0.6, fontFace: T.font, color: T.sub, fontSize: 12, charSpacing: 2, valign: 'middle' });
  K.line(s, 0.6, 1.12, W - 1.2, T.navy, 1.5);
  s.addText('“발표자료도 코드로 관리한다”', { x: 0.6, y: 2.4, w: W - 1.2, h: 0.9, fontFace: T.font, color: T.navy, fontSize: 30, bold: true });
  s.addText([
    { text: '화면 → 캡처 → 발표자료', options: { bold: true, color: T.gold } },
    { text: ' 의 전 과정을 자동화하여,\n제품이 진화할 때마다 소개 자료가 손쉽게 함께 진화합니다.', options: { color: T.ink } },
  ], { x: 0.6, y: 3.5, w: W - 1.2, h: 1.5, fontFace: T.font, fontSize: 18, lineSpacingMultiple: 1.3 });
  K.footer(s);
}

await pptx.writeFile({ fileName: '천문_자동화_파이프라인.pptx' });
console.log('✓ 천문_자동화_파이프라인.pptx 생성 완료 (표지 + 6 + 맺음 = 8슬라이드)');
