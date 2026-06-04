/* ================================================================
   DeckKit · PPTX 엔진 [범용]
   공문서 스타일(흰 배경·괘선·머리글/바닥글·쪽번호) 슬라이드 빌더.
   특정 프로젝트에 의존하지 않는다 — 테마/이미지 폴더만 주입하면 어디서나 동작.

   사용 예:
     import { THEME, newDeck, makeKit } from './deck/pptx-kit.mjs';
     const pptx = newDeck({ title: '소개서' });
     const K = makeKit(pptx, { imageDir: 'screenshots' });
     K.cover(pptx.addSlide(), { kicker, headline, hanja, subtitle, image });
     K.content(pptx.addSlide(), { no, tag, title, bullets, images, note, wide });
     await pptx.writeFile({ fileName: 'out.pptx' });

   커스텀 슬라이드는 K.header/K.footer/K.placeImages/K.codebox/K.stepBox 등
   하위 헬퍼를 직접 조합해 만들 수 있다(파이프라인 설명서가 이를 사용).
================================================================ */
import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { imgSize } from './imgsize.mjs';

/* 기본 테마 — 한국 공문서 톤. 다른 브랜드는 일부 키만 덮어쓰면 됨. */
export const THEME = {
  font: 'Malgun Gothic', mono: 'Consolas',
  navy: '1F3A5F', ink: '1A1A2E', sub: '5A5A6E', gold: 'B7892F',
  rule: 'D7DBE3', panel: 'F4F6FA', codeBg: '0E1530',
  W: 13.333, H: 7.5,           // 16:9
  docName: '',                 // 바닥글 문서명(makeKit 옵션으로 주입)
};

export function newDeck({ title = '', author = '', company = '', theme = THEME } = {}) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'DK', width: theme.W, height: theme.H });
  pptx.layout = 'DK';
  pptx.title = title; pptx.author = author; pptx.company = company;
  return pptx;
}

export function makeKit(pptx, { theme = THEME, imageDir = 'screenshots', docName = '', date } = {}) {
  const T = { ...THEME, ...theme, docName: docName || theme.docName };
  const { W, H, font } = T;
  const DATE = date || (() => { const t = new Date(); return `${t.getFullYear()}. ${String(t.getMonth() + 1).padStart(2, '0')}. ${String(t.getDate()).padStart(2, '0')}.`; })();
  let pageNo = 0;

  const path = (f) => `${imageDir}/${f}`;
  const has = (f) => existsSync(path(f));
  const ratio = (f) => { const d = imgSize(path(f)); return d.w / d.h; };

  function footer(s) {
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.06, w: W - 1.2, h: 0, line: { color: T.rule, width: 1 } });
    if (T.docName) s.addText(T.docName, { x: 0.6, y: 7.08, w: 9, h: 0.32, fontFace: font, color: T.sub, fontSize: 9, valign: 'middle' });
    if (pageNo > 0) s.addText(`- ${pageNo} -`, { x: W - 2.6, y: 7.08, w: 2, h: 0.32, align: 'right', fontFace: font, color: T.sub, fontSize: 9, valign: 'middle' });
  }

  /* 이미지 묶음을 패널 안에 비율 보존하며 가로 균등 배치(contain) */
  function placeImages(s, files, px, py, pw, ph) {
    const imgs = (files || []).filter(has);
    if (!imgs.length) { s.addText('(이미지 없음)', { x: px, y: py + ph / 2 - 0.2, w: pw, align: 'center', fontFace: font, color: T.sub, fontSize: 13 }); return; }
    const n = imgs.length, gap = 0.22;
    const cellW = (pw - gap * (n - 1)) / n;
    const dims = imgs.map((f) => { const r = ratio(f); let w = cellW, h = w / r; if (h > ph) { h = ph; w = h * r; } return { f, w, h }; });
    const totalW = dims.reduce((a, d) => a + d.w, 0) + gap * (n - 1);
    let x = px + (pw - totalW) / 2;
    for (const d of dims) {
      s.addImage({ path: path(d.f), x, y: py + (ph - d.h) / 2, w: d.w, h: d.h, shadow: { type: 'outer', color: '9AA3B2', opacity: 0.45, blur: 6, offset: 2, angle: 90 } });
      x += d.w + gap;
    }
  }

  function header(s, no, tag, title) {
    s.background = { color: 'FFFFFF' };
    pageNo++;
    s.addText(`${String(no).padStart(2, '0')}`, { x: 0.6, y: 0.42, w: 0.9, h: 0.6, fontFace: font, color: T.gold, fontSize: 30, bold: true, valign: 'middle' });
    s.addText(tag, { x: 1.5, y: 0.42, w: 8.5, h: 0.6, fontFace: font, color: T.sub, fontSize: 12, charSpacing: 2, valign: 'middle' });
    if (T.docName) s.addText(T.docName, { x: W - 4.1, y: 0.42, w: 3.5, h: 0.6, align: 'right', fontFace: font, color: T.sub, fontSize: 10, valign: 'middle' });
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.12, w: W - 1.2, h: 0, line: { color: T.navy, width: 1.5 } });
    s.addText(title, { x: 0.6, y: 1.28, w: W - 1.2, h: 0.7, fontFace: font, color: T.navy, fontSize: 25, bold: true, valign: 'middle' });
  }

  function cover(s, { org = '', kicker = '', headline = '', hanja = '', subtitle = '', image, footnote } = {}) {
    s.background = { color: 'FFFFFF' };
    if (org) s.addText(org, { x: 0.9, y: 0.7, w: W - 1.8, h: 0.4, fontFace: font, color: T.sub, fontSize: 13, charSpacing: 2 });
    s.addShape(pptx.ShapeType.line, { x: 0.9, y: 1.18, w: W - 1.8, h: 0, line: { color: T.navy, width: 2.25 } });
    if (kicker) s.addText(kicker, { x: 0, y: 2.5, w: '100%', align: 'center', fontFace: font, color: T.gold, fontSize: 15, charSpacing: 6, bold: true });
    s.addText([
      { text: headline + (hanja ? '  ' : ''), options: { fontSize: 54, bold: true, color: T.navy } },
      ...(hanja ? [{ text: hanja, options: { fontSize: 40, color: T.gold } }] : []),
    ], { x: 0, y: 2.95, w: '100%', align: 'center', fontFace: font });
    if (subtitle) s.addText(subtitle, { x: 0, y: 4.35, w: '100%', align: 'center', fontFace: font, color: T.sub, fontSize: 17 });
    if (image && has(image)) { const r = ratio(image); s.addImage({ path: path(image), x: (W - 1.6 * r) / 2, y: 4.95, h: 1.6, w: 1.6 * r }); }
    s.addShape(pptx.ShapeType.line, { x: 4.5, y: 6.62, w: 4.33, h: 0, line: { color: T.rule, width: 1 } });
    s.addText(footnote || `발표자료  ·  ${DATE}`, { x: 0, y: 6.7, w: '100%', align: 'center', fontFace: font, color: T.sub, fontSize: 12 });
  }

  /* 본문 슬라이드 —
     · 이미지 1장(폰 캡처): 세로 거의 전체로 '크게' 좌측 배치 + 우측 머리글/글머리(이미지 작게 보이던 문제 해결)
     · 이미지 2장 이상: 좌측 패널에 비교 배치 + 우측 글머리 */
  function content(s, { no, tag, title, bullets: items = [], images = [], note, wide = false } = {}) {
    const imgs = (images || []).filter(has);

    if (imgs.length >= 2) {
      header(s, no, tag, title);
      const PX = 0.6, PY = 2.1, PW = wide ? 7.7 : 5.6, PH = 4.8;
      s.addShape(pptx.ShapeType.roundRect, { x: PX, y: PY, w: PW, h: PH, rectRadius: 0.06, fill: { color: T.panel }, line: { color: T.rule, width: 1 } });
      placeImages(s, imgs, PX + 0.18, PY + 0.18, PW - 0.36, PH - 0.36);
      const TX = PX + PW + 0.45, TW = W - 0.6 - (PX + PW + 0.45);
      s.addText('□ 주요 내용', { x: TX, y: 2.2, w: TW, h: 0.4, fontFace: font, color: T.navy, fontSize: 14, bold: true });
      bullets(s, items, TX, 2.7, TW, wide ? 14 : 14.5);
      footer(s);
      if (note) s.addNotes(note);
      return;
    }

    // 0~1장 — 단일 스크린샷 대형 배치
    s.background = { color: 'FFFFFF' };
    pageNo++;
    const ix = 0.7, iy = 0.55, IH = 6.35;
    let imgRight = ix + 3.0;
    if (imgs.length === 1) {
      const r = ratio(imgs[0]); let h = IH, w = h * r;
      const MAXW = 4.7; if (w > MAXW) { w = MAXW; h = w / r; }
      s.addImage({ path: path(imgs[0]), x: ix, y: iy + (IH - h) / 2, w, h, shadow: { type: 'outer', color: '9AA3B2', opacity: 0.45, blur: 7, offset: 2, angle: 90 } });
      imgRight = ix + w;
    } else {
      s.addText('(이미지 없음)', { x: ix, y: 3.4, w: 3.0, align: 'center', fontFace: font, color: T.sub, fontSize: 13 });
    }
    const TX = imgRight + 0.6, TW = W - 0.6 - TX;
    s.addText(String(no).padStart(2, '0'), { x: TX, y: 0.55, w: 1.0, h: 0.6, fontFace: font, color: T.gold, fontSize: 28, bold: true, valign: 'middle' });
    s.addText(tag, { x: TX + 0.92, y: 0.55, w: Math.max(1, TW - 0.92), h: 0.6, fontFace: font, color: T.sub, fontSize: 12, charSpacing: 1.5, valign: 'middle' });
    s.addShape(pptx.ShapeType.line, { x: TX, y: 1.2, w: TW, h: 0, line: { color: T.navy, width: 1.5 } });
    s.addText(title, { x: TX, y: 1.36, w: TW, h: 0.95, fontFace: font, color: T.navy, fontSize: 23, bold: true, valign: 'top' });
    s.addText('□ 주요 내용', { x: TX, y: 2.55, w: TW, h: 0.4, fontFace: font, color: T.navy, fontSize: 14, bold: true });
    bullets(s, items, TX, 3.05, TW, 15);
    footer(s);
    if (note) s.addNotes(note);
  }

  function bullets(s, items, x, y, w, fontSize = 15) {
    s.addText((items || []).map((b, i) => ({ text: b, options: { bullet: { code: '25AA', indent: 18 }, color: T.ink, fontFace: font, fontSize, paraSpaceAfter: 11, paraSpaceBefore: i === 0 ? 6 : 0, lineSpacingMultiple: 1.12 } })), { x, y, w, h: 4.3, valign: 'top' });
  }

  function codebox(s, lines, x, y, w, h) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.05, fill: { color: T.codeBg }, line: { color: T.navy, width: 1 } });
    s.addText(lines.map((ln) => ({ text: ln + '\n', options: { color: /^\s*(#|\/\/)/.test(ln) ? '7E8AA6' : 'D7E0F5', fontFace: T.mono, fontSize: 11.5, breakLine: true } })), { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: h - 0.3, valign: 'top' });
  }

  function stepBox(s, x, y, w, h, { n, title, sub, color = T.navy } = {}) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: T.panel }, line: { color, width: 1.5 } });
    s.addText(`${n}`, { x: x + 0.12, y: y + 0.12, w: 0.6, h: 0.5, fontFace: font, color: T.gold, fontSize: 20, bold: true });
    s.addText(title, { x: x + 0.12, y: y + 0.6, w: w - 0.24, h: 0.5, fontFace: font, color: T.navy, fontSize: 14.5, bold: true, valign: 'top' });
    s.addText(sub, { x: x + 0.12, y: y + 1.05, w: w - 0.24, h: h - 1.1, fontFace: font, color: T.sub, fontSize: 10.5, valign: 'top', lineSpacingMultiple: 1.05 });
  }

  const arrow = (s, x, y) => s.addText('▶', { x, y, w: 0.4, h: 0.4, align: 'center', fontFace: font, color: T.gold, fontSize: 16, valign: 'middle' });
  const line = (s, x, y, w, color = T.rule, width = 1) => s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color, width } });

  return {
    theme: T, path, has, ratio,
    get pageNo() { return pageNo; }, bumpPage() { return ++pageNo; }, setPage(n) { pageNo = n; },
    footer, placeImages, header, cover, content, bullets, codebox, stepBox, arrow, line,
  };
}
