/* ================================================================
   천문(天文) — '모듈 독립형 자동화' 안내 PPTX (1~2장)
   메시지 ① 캡처+PPT 제작 기능은 프로젝트 비의존 모듈 → 타 프로그램에 그대로 이식·재사용
          ② 이 발표자료 전문(全文)이 바로 이 기능으로 제작됨(자기참조).
   이 파일 자체도 DeckKit 엔진으로 생성된다.
   출력: 천문_자동화모듈_안내.pptx   ·   실행: npm run pptx:module
================================================================ */
import { newDeck, makeKit } from './deck/pptx-kit.mjs';

const pptx = newDeck({ title: '천문 — 모듈 독립형 발표자료 자동화' });
const K = makeKit(pptx, { imageDir: 'screenshots', docName: '천문(天文) · 모듈 독립형 발표자료 자동화' });
const { theme: T } = K;
const W = T.W;

/* ── 1면: 모듈 독립 · 어디서나 재사용 ── */
{
  const s = pptx.addSlide();
  K.header(s, 1, '재사용 가능한 자산', '모듈 독립형 — 어디서나 그대로 이식');

  // 좌: 두 핵심 기능 카드
  K.stepBox(s, 0.7, 2.3, 3.0, 2.0, { n: 'A', title: '기능별 자동 촬영', sub: '앱을 코드로 열어\n화면·상호작용을 캡처\n(capture-kit)' });
  K.stepBox(s, 0.7, 4.5, 3.0, 2.0, { n: 'B', title: 'PPT 자동 제작', sub: '캡처+대본을\n공문서 PPTX로 조판\n(pptx-kit)', color: T.gold });

  // 우: 설명
  K.bullets(s, [
    '두 기능(촬영·제작)은 특정 프로젝트에 종속되지 않는 독립 모듈입니다.',
    'scripts/deck/ 폴더만 복사하면 다른 프로그램에 그대로 이식됩니다.',
    '구성: capture-kit(촬영) · pptx-kit(제작) · imgsize(이미지) — 외부 의존 최소.',
    '새 앱에서는 "무엇을 누르고 찍을지(셀렉터)"와 "대본"만 새로 쓰면 끝.',
    '브라우저는 시스템 Edge를 사용 → 별도 설치 없이 동작.',
    '결과: 어떤 웹 프로젝트든 화면 → 캡처 → 발표자료를 자동화할 수 있습니다.',
  ], 4.1, 2.3, W - 0.6 - 4.1, 15);
  K.footer(s);
}

/* ── 2면: 자기참조(이 자료가 그 증거) ── */
{
  const s = pptx.addSlide();
  K.header(s, 2, '자기참조 · Dogfooding', '이 발표자료 전문은 이 기능으로 제작되었습니다');

  K.bullets(s, [
    '지금 보시는 모든 슬라이드는 사람이 캡처·편집한 것이 아닙니다.',
    '코드가 앱을 직접 열어 촬영하고, 그 이미지로 PPTX를 자동 조판했습니다.',
    '본편 「천문_발표자료.pptx」 23면 + 부속 「천문_자동화_파이프라인.pptx」 8면,',
    '그리고 이 안내 자료까지 — 전부 동일한 DeckKit 모듈의 산출물입니다.',
    "명령 한 줄(npm run deck)로 촬영 → 최신화 → 발표자료 생성이 끝납니다.",
    '제품이 바뀌면 같은 명령으로 발표자료 전체가 항상 최신으로 갱신됩니다.',
  ], 0.7, 2.3, 7.1, 15);

  K.codebox(s, [
    '# 이 자료를 만든 그 명령',
    'npm run deck',
    '',
    '#  촬영(capture) → 최신화',
    '#  → PPTX 자동 생성(build)',
  ], 8.0, 2.3, 4.7, 1.9);

  if (K.has('u_terminal.png')) {
    const r = K.ratio('u_terminal.png'); const w = 4.7, h = w / r;
    s.addImage({ path: 'screenshots/u_terminal.png', x: 8.0, y: 4.4, w, h, shadow: { type: 'outer', color: '9AA3B2', opacity: 0.4, blur: 6, offset: 2, angle: 90 } });
    s.addText('실제 생성 로그 — “생성 완료”', { x: 8.0, y: 4.4 + h + 0.05, w, align: 'center', fontFace: T.font, color: T.sub, fontSize: 10 });
  }
  K.footer(s);
}

await pptx.writeFile({ fileName: '천문_자동화모듈_안내.pptx' });
console.log('✓ 천문_자동화모듈_안내.pptx 생성 완료 (2슬라이드)');
