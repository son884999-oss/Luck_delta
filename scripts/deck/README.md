# DeckKit — 스크린샷 자동 캡처 → PPTX 자동 생성 (범용 모듈)

웹앱 화면을 자동으로 촬영하고, 그 이미지를 공문서 스타일 PowerPoint로 자동 조판하는
**프로젝트 비의존** 엔진입니다. 이 폴더(`scripts/deck/`)만 복사하면 다른 프로젝트에서도 씁니다.

## 구성
| 파일 | 역할 | 의존성 |
|------|------|--------|
| `imgsize.mjs` | PNG/JPEG 헤더에서 픽셀 크기 추출(비율 보존용) | 없음 (Node 내장) |
| `capture-kit.mjs` | 브라우저 실행·모바일 컨텍스트·캡처·텍스트 클릭·플립 헬퍼 | `playwright-core` + 시스템 브라우저 |
| `pptx-kit.mjs` | 공문서 PPTX 빌더(표지·본문·코드박스·흐름도·머리글/바닥글) | `pptxgenjs` |

## 다른 프로젝트에서 재사용하는 법
1. `scripts/deck/` 폴더를 통째로 복사한다.
2. 의존성 설치: `npm i -D pptxgenjs playwright-core` (브라우저는 시스템 Edge 사용 → 별도 설치 불필요).
3. **캡처 설정 파일**(앱 전용)을 하나 작성한다 — 무엇을 누르고 무엇을 찍을지:
   ```js
   import { launchEdge, mobileContext, makeShooter, byText, flip } from './deck/capture-kit.mjs';
   const b = await launchEdge();
   const ctx = await mobileContext(b, { seed: { myKey: 'val' } });   // localStorage 시드(선택)
   const page = await ctx.newPage();
   const { shot } = makeShooter('screenshots');
   await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
   await shot(page, '01_home');
   await byText(page, '시작').click();
   await shot(page, '02_next');
   await b.close();
   ```
4. **빌드 설정 파일**(앱 전용)을 하나 작성한다 — 이미지 + 대본:
   ```js
   import { newDeck, makeKit } from './deck/pptx-kit.mjs';
   const pptx = newDeck({ title: '소개서' });
   const K = makeKit(pptx, { imageDir: 'screenshots', docName: '제품 소개서' });
   K.cover(pptx.addSlide(), { kicker:'소개', headline:'제품명', subtitle:'한 줄 소개', image:'01_home.png' });
   K.content(pptx.addSlide(), { no:1, tag:'기능', title:'첫 화면',
     images:['02_next.png'], bullets:['핵심 1','핵심 2'], note:'발표 노트' });
   await pptx.writeFile({ fileName: '소개서.pptx' });
   ```

## 테마 변경
`pptx-kit.mjs`의 `THEME`(색·폰트·문서명)를 `makeKit(pptx, { theme: {...} })`로 일부만 덮어쓰면
브랜드에 맞게 바뀝니다. 기본은 한국 공문서 톤(흰 배경·네이비/골드 괘선).

## 천문 프로젝트에서의 사용 예
- 캡처 설정: `scripts/capture-screens.mjs`  (→ `npm run shots`)
- 메인 덱: `scripts/build-pptx.mjs`           (→ `npm run pptx`)
- 파이프라인 설명 덱: `scripts/build-pptx-pipeline.mjs` (→ `npm run pptx:pipeline`)
- 한 번에: `npm run deck`

## 참고
- 이미지는 실제 해상도를 읽어 비율을 보존(세로 폰샷·가로 터미널 모두 자동 대응).
- pptxgenjs 글머리표는 `bullet: { code: '25AA' }` 형태(유니코드 16진수, `characterCode` 아님).
- 시각 미리보기에 PowerPoint/LibreOffice가 필요. 없으면 ZIP 시그니처·슬라이드 수로 검증.
