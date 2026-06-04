/* ================================================================
   천문 — 프리미엄 리포트 PDF용 HTML (Chromium 렌더링 → PDF)
   하나의 공통 렌더러(renderReport)가 두 리포트를 같은 양식으로 만든다:
     · renderReportPdfHtml      → 인생 시그니처 리포트 (골드 테마)
     · renderStudyReportPdfHtml → 학습 상세 리포트   (에메랄드 테마)
   공유 크롬: 표지(오행 인장+코너 프레임)·명식 페이지(오각 레이더)·섹션 한자
   워터마크·드롭캡·인용·엔딩. 본문 섹션만 리포트별로 다르다.
   에셋은 전부 인라인 SVG/CSS (저작권 무관·인쇄 선명·네트워크 의존 없음).
================================================================ */
import { getReportPalette, reportElems, hexA } from './reportTheme.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const refine = (s) => String(s ?? '')
  .replace(/"([^"]*)"/g, '“$1”').replace(/'([^']*)'/g, '‘$1’')
  .replace(/--/g, '—').replace(/\.\.\./g, '…');

const PENTA = ['목', '화', '토', '금', '수'];       // 오각형 배치 순서(상→시계방향)
const STUDY_ACCENT   = { light: '#0f8a5f', dark: '#34d399' }; // 학습 리포트 1차 강조(에메랄드)
const GUNGHAP_ACCENT = { light: '#c0275e', dark: '#fb7185' };  // 궁합 리포트 1차 강조(로즈)

/* ================================================================
   공통 렌더러 — cfg로 리포트별 차이(테마/표지/본문/맺음말)만 주입
================================================================ */
function renderReport(d, theme, cfg) {
  const p = getReportPalette(theme);
  const ELEM = reportElems(theme);
  const PRI = cfg.variant === 'study' ? STUDY_ACCENT[theme]
            : cfg.variant === 'gunghap' ? GUNGHAP_ACCENT[theme]
            : p.gold;                                                  // 1차 강조
  const SEC = cfg.variant === 'study' ? p.gold
            : cfg.variant === 'gunghap' ? p.violet
            : p.violet;                                                // 2차 강조
  const s = d.saju || {};

  /* ── 빌더 ── */
  const head = (no, title, accent = PRI, glyph = '✦') => `
    <div class="sec-head">
      <span class="sec-glyph serif">${esc(glyph)}</span>
      ${no ? `<div class="sec-badge serif" style="border-color:${hexA(accent, 0.45)};color:${accent}">${esc(no)}</div>` : ''}
      <h2 class="serif">${esc(title)}</h2>
      <div class="rule" style="background:${accent}"></div>
    </div>`;
  const paras = (t, lead) => {
    const arr = String(t ?? '').split(/\n{2,}|\n/).map(x => x.trim()).filter(Boolean);
    return arr.map((x, i) => `<p class="body${lead && i === 0 ? ' lead' : ''}">${esc(refine(x))}</p>`).join('');
  };
  const chips = (arr, accent = PRI) => (arr && arr.length)
    ? `<div class="chips">${arr.map(k => `<span class="chip" style="color:${accent};border-color:${hexA(accent, 0.32)};background:${hexA(accent, 0.07)}">${esc(k)}</span>`).join('')}</div>`
    : '';
  const quote = (text, accent = PRI) => text
    ? `<div class="pquote serif" style="border-color:${accent}"><span class="qm" style="color:${accent}">“</span>${esc(refine(text))}<span class="qm" style="color:${accent}">”</span></div>`
    : '';
  const textSec = (no, title, body, accent = PRI, glyph = '✦') =>
    `<section class="sec page brk"><div class="page-inner">${head(no, title, accent, glyph)}${body}</div></section>`;
  const area = (no, title, a, accent, glyph) => {
    a = a || {};
    // 소목차 배열이 있으면 소목차 구조로, 없으면(구버전 캐시) 기존 text로 폴백
    const body = (a.sections && a.sections.length)
      ? a.sections.map(s => `
          <div class="subsec">
            <div class="subsec-title serif">${esc(s.title)}</div>
            ${paras(s.text)}
          </div>`).join('')
      : paras(a.text, true);
    return textSec(no, title, `${quote(a.highlight, accent)}${body}`, accent, glyph);
  };
  const phase = (label, sub, text) => `
    <div class="tl-row">
      <div class="tl-axis"><span class="tl-node"></span></div>
      <div class="tl-body"><div class="tl-label serif">${esc(label)} <span class="tl-sub">${esc(sub)}</span></div>${paras(text)}</div>
    </div>`;
  // 카드 리스트(향후 5년 / 시험 단계별 공용)
  const cards = (items) => items.map(it => `
    <div class="ycard">
      <div class="yhead"><span class="yy serif">${esc(it.label)}</span>${it.kw ? `<span class="ykw">${esc(it.kw)}</span>` : ''}</div>
      <p class="body">${esc(refine(it.text))}</p>
    </div>`).join('');

  /* ── 명식 (두 리포트 공유) ── */
  const kindMap = { 년주: '태어난 해', 월주: '태어난 달', 일주: '태어난 날', 시주: '태어난 시' };
  const pillarCard = (pl) => {
    if (!pl) return `<div class="pcard pcard-empty">
      <div class="pk">시주 <span class="pk-sub">태어난 시</span></div><div class="phan">—</div>
      <div class="pn">시간 미상</div><div class="pe">시간을 알면 더 정밀해져요</div></div>`;
    const gc = ELEM[pl.ganElem].color, jc = ELEM[pl.jiElem].color;
    const hl = pl.kind === '일주' ? ' pcard-hl' : '';
    return `<div class="pcard${hl}">
      ${pl.kind === '일주' ? '<div class="pcard-tag">중심</div>' : ''}
      <div class="pk">${esc(pl.kind)} <span class="pk-sub">${kindMap[pl.kind] || ''}</span></div>
      <div class="phan serif"><span style="color:${gc}">${pl.ganHanja}</span><span style="color:${jc}">${pl.jiHanja}</span></div>
      <div class="pn">${esc(pl.ganji)}</div>
      <div class="pe"><span style="color:${gc}">${ELEM[pl.ganElem].plain}</span><span class="dotsep">·</span><span style="color:${jc}">${ELEM[pl.jiElem].plain}</span></div>
    </div>`;
  };
  const pillars = (s.pillars || []);
  const pillarCards = ['년주', '월주', '일주', '시주'].map(k => {
    const found = pillars.find(x => x.kind === k);
    return pillarCard(k === '시주' ? (found || null) : found);
  }).join('');
  const ohaengBars = (s.dist || []).map(x => {
    const e = ELEM[x.key];
    return `<div class="obar">
      <div class="ol"><span class="oh serif" style="color:${e.color}">${e.hanja}</span><span class="op">${e.plain}</span></div>
      <div class="otrack"><div class="ofill" style="width:${Math.max(x.pct, 2)}%;background:linear-gradient(to right,${hexA(e.color, 0.7)},${e.color})"></div></div>
      <div class="oc">${x.count}</div>
    </div>`;
  }).join('');
  const ohaengRadar = (() => {
    const dist = s.dist || [];
    const cx = 116, cy = 120, R = 84;
    const counts = PENTA.map(k => (dist.find(x => x.key === k) || {}).count || 0);
    const max = Math.max(...counts, 1);
    const pt = (i, r) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const poly = (r) => PENTA.map((_, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
    const grid = [R, R * 0.66, R * 0.33].map(r => `<polygon points="${poly(r)}" fill="none" stroke="${hexA(p.ink, 0.13)}" stroke-width="0.6"/>`).join('');
    const axes = PENTA.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${hexA(p.ink, 0.13)}" stroke-width="0.6"/>`; }).join('');
    const dataPoly = counts.map((c, i) => pt(i, Math.max(c / max, 0.08) * R).map(n => n.toFixed(1)).join(',')).join(' ');
    const dots = counts.map((c, i) => { const [x, y] = pt(i, Math.max(c / max, 0.08) * R); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${ELEM[PENTA[i]].color}"/>`; }).join('');
    const labels = PENTA.map((k, i) => { const [x, y] = pt(i, R + 18); const e = ELEM[k]; return `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-family="'Noto Serif KR',serif" font-size="15" font-weight="700" fill="${e.color}">${e.hanja}</text>`; }).join('');
    return `<svg width="232" height="244" viewBox="0 0 232 244" fill="none">${grid}${axes}<polygon points="${dataPoly}" fill="${hexA(PRI, 0.16)}" stroke="${PRI}" stroke-width="1.6"/>${dots}${labels}</svg>`;
  })();

  const domKey = (s.dominant || ['토'])[0], lackKey = (s.lacking || [])[0];
  const domPlain = (s.dominant || []).map(k => ELEM[k].plain).join('·');
  const lackPlain = (s.lacking || []).map(k => ELEM[k].plain).join('·');
  const balanceNote = `가장 강한 기운은 <b style="color:${ELEM[domKey].color}">${domPlain || '고른 편'}</b>${lackKey ? `, 부족한 기운은 <b style="color:${ELEM[lackKey].color}">${lackPlain}</b>입니다.` : '으로, 다섯 기운이 비교적 고르게 자리합니다.'}`;

  const builders = { head, paras, chips, quote, textSec, area, phase, cards, ELEM, PRI, SEC, d, domKey, lackKey, domPlain, lackPlain };

  /* ── 표지 오행 인장 점 ── */
  const sealDots = PENTA.map((k, i) => {
    const a = (-90 + i * 72) * Math.PI / 180, r = 180;
    const x = 210 + r * Math.cos(a), y = 210 + r * Math.sin(a);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${ELEM[k].color}"/>`;
  }).join('');
  const corners = `<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span><span class="corner-dot tl"></span><span class="corner-dot tr"></span><span class="corner-dot bl"></span><span class="corner-dot br"></span>`;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700;900&family=Noto+Sans+KR:wght@300;400;500;700&display=swap">
<style>
  @page { size: A4; margin: 0; }
  @media print {
    html, body { background: ${p.pageBg} !important; }
    .cover, .ending { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page.brk { break-before: page; page-break-before: always; }
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html, body { background:${theme === 'dark'
    ? `radial-gradient(ellipse at 18% 0%, ${hexA(SEC, 0.16)} 0%, transparent 38%),
       radial-gradient(ellipse at 82% 100%, ${hexA(PRI, 0.13)} 0%, transparent 40%),
       linear-gradient(180deg, #090d22 0%, ${p.pageBg} 48%, #05080f 100%)`
    : p.pageBg}; background-attachment: fixed; }
  body { font-family:'Noto Sans KR',sans-serif; color:${p.ink}; word-break:keep-all; overflow-wrap:break-word; line-height:1.65; font-size:13pt; orphans:4; widows:4; }
  .serif { font-family:'Noto Serif KR',serif; }
  b { font-weight:700; }

  /* ── 페이지 시스템 — 한 섹션 = 한 페이지(분할 없음) ──
     각 .page 는 A4 한 장(297mm) 높이의 고정 박스. 내부 .page-inner 를
     세로 가운데로 모으고, 로드 후 JS(fitPages)가 내용을 페이지의 약 70~90%로
     자동 스케일해 '한 분야 = 한 페이지'가 넘치지도 비지도 않게 채운다. */
  .page { position: relative; height: 297mm; overflow: hidden; }
  .page.brk { break-before: page; page-break-before: always; }
  .flow { padding: 0; }

  /* 본문 섹션 페이지 — 내용을 세로 가운데로 모아 한 장에 담는다 */
  .sec { margin-bottom: 0; }
  .sec.page { display: flex; align-items: center; justify-content: center; padding: 0 22mm; }
  .page-inner { width: 100%; transform-origin: center center; }
  /* 섹션 상단 — 얇은 별 장식 띠 (스케일과 무관하게 페이지 상단 고정) */
  .sec.page::before {
    content: ''; position: absolute; top: 16mm; left: 22mm; right: 22mm;
    height: 1px; background: linear-gradient(to right, transparent, ${hexA(PRI,0.35)}, ${hexA(SEC,0.25)}, transparent);
  }
  .sec.page::after { content:'✦ ✦ ✦'; position:absolute; bottom:12mm; left:0; right:0; text-align:center; color:${PRI}; font-size:10pt; letter-spacing:0.55em; opacity:0.35; }

  /* ── 섹션 헤더 ── */
  .sec-head { margin:0 0 26pt; break-inside:avoid; break-after:avoid; position:relative; }
  .sec-head::before {
    content:''; display:block; width:100%; height:1pt;
    background:linear-gradient(to right,${PRI},${hexA(SEC,0.55)},transparent);
    margin-bottom:20pt;
  }
  .sec-glyph { position:absolute; top:4pt; right:0; font-size:68pt; font-weight:900; color:${hexA(p.ink, 0.045)}; line-height:1; pointer-events:none; font-family:'Noto Serif KR',serif; }
  .sec-badge {
    display:inline-flex; align-items:center; justify-content:center;
    width:44pt; height:44pt; border-radius:50%; border:1.5px solid;
    font-size:14pt; font-weight:700; margin-bottom:14pt;
    box-shadow: 0 0 0 4pt ${hexA(PRI, 0.08)};
  }
  .sec-head h2 { font-size:27pt; font-weight:700; margin:0 0 13pt; letter-spacing:-0.01em; color:${p.ink}; }
  .sec-head .rule { height:3px; width:54pt; border-radius:2px; margin-bottom:7pt; }

  /* ── 본문 ── */
  .body { font-size:13pt; line-height:1.82; color:${p.body}; margin-bottom:13pt; font-weight:400; letter-spacing:-0.003em; orphans:4; widows:4; word-break:keep-all; overflow-wrap:break-word; break-inside:avoid; }
  .lead { orphans:4; widows:4; break-inside:avoid; }

  /* ── 소목차 블록 ── */
  .subsec { break-inside:avoid; margin-bottom:22pt; padding:16pt 20pt; border-radius:16px; background:${hexA(PRI,0.04)}; border-left:3pt solid ${hexA(PRI,0.45)}; }
  .subsec-title { font-size:14pt; font-weight:700; color:${PRI}; margin-bottom:10pt; letter-spacing:0.01em; }
  .subsec .body { margin-bottom:0; }

  .chips { display:flex; flex-wrap:wrap; gap:8pt; margin:2pt 0 22pt; break-inside:avoid; }
  .chip { font-size:11.5pt; font-weight:600; padding:6pt 17pt; border-radius:999px; border:1px solid; }

  /* ── 인용구 — 폭이 넓고 시각적으로 강하게 ── */
  .pquote {
    font-size:17pt; line-height:1.85; font-weight:500; color:${p.ink};
    border-left:4px solid; padding:10pt 18pt 10pt 22pt; margin:4pt 0 26pt; break-inside:avoid;
    background:${hexA(PRI, 0.06)}; border-radius:0 16px 16px 0;
    box-shadow: inset 0 0 0 1px ${hexA(PRI, 0.10)};
  }
  .pquote .qm { font-size:21pt; font-weight:700; }

  /* ── 한눈에 보기(개요) 페이지 — 명식 다음 단독 페이지, 히어로로 화면을 채운다 ── */
  .ov { text-align:center; margin-bottom:26pt; }
  .ov-heroes { display:flex; align-items:center; justify-content:center; gap:30pt; }
  .ov-one { display:flex; flex-direction:column; align-items:center; }
  .ov-hanja { font-size:64pt; font-weight:900; line-height:1; letter-spacing:0.08em; }
  .ov-name { font-size:15pt; font-weight:700; color:${p.ink}; letter-spacing:0.04em; margin-top:10pt; }
  .ov-name .ov-sub { display:block; font-size:10.5pt; font-weight:400; color:${p.dim}; margin-top:4pt; }
  .ov-amp { font-size:26pt; color:${hexA(PRI, 0.6)}; }
  .ov-line { font-size:16pt; font-weight:500; font-style:italic; color:${hexA(p.ink, 0.8)}; line-height:1.85; max-width:150mm; margin:24pt auto 0; padding:15pt 0; border-top:1px solid ${hexA(PRI, 0.25)}; border-bottom:1px solid ${hexA(PRI, 0.25)}; }
  .ov-score { margin:20pt 0 0; }
  .ov-score .ov-num { font-family:'Noto Serif KR',serif; font-size:48pt; font-weight:900; line-height:1; color:${PRI}; }
  .ov-score .ov-num .ov-u { font-size:17pt; }
  .ov-score .ov-grade { font-size:13pt; font-weight:700; color:${PRI}; margin-top:7pt; letter-spacing:0.12em; }

  /* ── 요약 박스 ── */
  .summary {
    background:${hexA(PRI, 0.07)}; border:1.5px solid ${hexA(PRI, 0.35)};
    border-radius:20px; padding:22pt 26pt; margin:0 0 24pt;
    break-inside:avoid; box-shadow: 0 6px 28px ${hexA(PRI, 0.12)}, ${p.shadowHi};
  }
  .summary-k { font-size:9pt; font-weight:700; letter-spacing:0.26em; color:${PRI}; margin-bottom:15pt; text-transform:uppercase; }
  .summary-row { display:flex; align-items:baseline; gap:14pt; padding:10pt 0; border-top:1px solid ${hexA(PRI, 0.16)}; }
  .summary-row:first-of-type { border-top:none; padding-top:0; }
  .summary-label { flex:0 0 68pt; font-size:10.5pt; font-weight:700; color:${p.dim}; }
  .summary-val { flex:1; font-size:12.5pt; font-weight:500; color:${p.ink}; line-height:1.65; }
  .summary-val.serif { font-size:13pt; }

  /* ── 체크리스트 ── */
  .checklist { background:${hexA(SEC, 0.06)}; border:1.5px solid ${hexA(SEC, 0.30)}; border-radius:20px; padding:22pt 26pt; margin-top:24pt; break-inside:avoid; box-shadow: 0 4px 20px ${hexA(SEC, 0.10)}; }
  .checklist-k { font-size:9pt; font-weight:700; letter-spacing:0.26em; color:${SEC}; margin-bottom:17pt; text-transform:uppercase; }
  .check-item { display:flex; gap:13pt; padding:11pt 0; border-top:1px solid ${hexA(SEC, 0.15)}; align-items:flex-start; }
  .check-item:first-of-type { border-top:none; padding-top:0; }
  .check-box { flex:0 0 auto; width:17pt; height:17pt; border:1.5px solid ${SEC}; border-radius:5px; margin-top:2pt; text-align:center; line-height:15pt; color:${SEC}; font-size:10.5pt; font-weight:700; }
  .check-text { flex:1; font-size:12pt; line-height:1.68; color:${p.body}; }
  .check-text .check-area { font-weight:700; color:${p.ink}; margin-right:4pt; }

  /* ── 코너 장식 (표지·엔딩) — 이중 선으로 고급감 ── */
  .corner { position:absolute; width:32pt; height:32pt; z-index:3; }
  .corner::before, .corner::after { content:''; position:absolute; }
  .corner.tl { top:12mm; left:12mm; }
  .corner.tl::before { top:0; left:0; right:0; height:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.tl::after  { top:0; left:0; bottom:0; width:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.tr { top:12mm; right:12mm; }
  .corner.tr::before { top:0; left:0; right:0; height:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.tr::after  { top:0; right:0; bottom:0; width:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.bl { bottom:12mm; left:12mm; }
  .corner.bl::before { bottom:0; left:0; right:0; height:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.bl::after  { top:0; left:0; bottom:0; width:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.br { bottom:12mm; right:12mm; }
  .corner.br::before { bottom:0; left:0; right:0; height:1.5pt; background:${hexA(PRI,0.7)}; }
  .corner.br::after  { top:0; right:0; bottom:0; width:1.5pt; background:${hexA(PRI,0.7)}; }
  /* 안쪽 작은 점 — 고급 인쇄물 느낌 */
  .corner-dot { position:absolute; width:5pt; height:5pt; border-radius:50%; background:${hexA(PRI,0.55)}; z-index:4; }
  .corner-dot.tl { top:14.5mm; left:14.5mm; }
  .corner-dot.tr { top:14.5mm; right:14.5mm; }
  .corner-dot.bl { bottom:14.5mm; left:14.5mm; }
  .corner-dot.br { bottom:14.5mm; right:14.5mm; }

  /* ── 표지 ── */
  .cover {
    min-height:297mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
    text-align:center; position:relative; padding:0 20mm; overflow:hidden;
    background:
      radial-gradient(ellipse at 28% 16%, ${hexA(SEC, 0.22)} 0%, transparent 52%),
      radial-gradient(ellipse at 74% 84%, ${hexA(PRI, 0.20)} 0%, transparent 52%),
      radial-gradient(ellipse at 50% 50%, ${hexA(PRI, 0.06)} 0%, transparent 70%),
      ${p.pageBg};
  }
  .cover .constel { position:absolute; top:50%; left:50%; transform:translate(-50%,-54%); opacity:0.65; }
  .cover .inner { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; }
  .cover .eyebrow { font-size:10.5pt; letter-spacing:0.72em; color:${SEC}; font-weight:700; margin-bottom:16pt; opacity:0.9; }
  .cover .forwhom { font-size:12pt; color:${p.dim}; letter-spacing:0.06em; margin-bottom:18pt; }
  .cover .forwhom b { color:${p.ink}; font-weight:700; }
  .cover .logo { font-size:56pt; font-weight:900; color:${p.logo}; letter-spacing:0.36em; text-shadow:${p.logoShadow}, 0 0 60px ${hexA(PRI,0.3)}; margin:8pt 0 4pt; }
  .cover .mark { font-size:12pt; color:${PRI}; margin:9pt 0; letter-spacing:0.6em; opacity:0.8; }
  .cover .sub { font-size:17pt; font-weight:700; color:${p.ink}; letter-spacing:0.20em; margin-bottom:5pt; }
  .cover .sub2 { font-size:9.5pt; color:${p.dim}; letter-spacing:0.32em; margin-top:26pt; padding-top:17pt; border-top:1px solid ${hexA(PRI,0.22)}; }
  .cover .ilju-hanja { font-size:78pt; font-weight:900; color:${hexA(PRI,0.16)}; letter-spacing:0.14em; line-height:1; margin:4pt 0 0; pointer-events:none; }
  .cover .ilju-line {
    font-size:13pt; font-weight:500; color:${hexA(p.ink,0.72)}; letter-spacing:0.05em;
    margin-top:14pt; padding:11pt 24pt;
    border-top:1px solid ${hexA(PRI,0.25)}; border-bottom:1px solid ${hexA(PRI,0.25)};
    font-style:italic; max-width:190mm; text-align:center; line-height:1.72;
  }
  /* 표지 하단 — 굵은 이중 바 */
  .cover .cover-bar {
    position:absolute; bottom:0; left:0; right:0; z-index:3;
  }
  .cover .cover-bar::before {
    content:''; display:block; height:5pt;
    background:linear-gradient(to right,transparent,${PRI},${SEC},${PRI},transparent); opacity:0.75;
  }
  .cover .cover-bar::after {
    content:''; display:block; height:1.5pt;
    background:linear-gradient(to right,transparent,${hexA(PRI,0.5)},transparent); opacity:0.6;
    margin-top:2pt;
  }

  /* ── 명식 ── */
  .myungsik.page { display: flex; align-items: center; justify-content: center; padding: 0 22mm; }
  .myungsik-hero { text-align:center; margin-bottom:24pt; padding:22pt 26pt; background:${hexA(PRI, 0.05)}; border-radius:20px; border:1px solid ${hexA(PRI, 0.24)}; box-shadow:0 4px 24px ${hexA(PRI,0.08)}; }
  .myungsik-hero .mh-name { font-size:23pt; font-weight:700; color:${p.ink}; }
  .myungsik-hero .mh-meta { margin-top:13pt; display:inline-flex; align-items:center; font-size:11pt; color:${p.dim};
    border:1px solid ${p.hair}; border-radius:999px; padding:8pt 20pt; background:${p.card}; }
  .myungsik-hero .mh-meta b { color:${p.ink}; }
  .mh-dot { display:inline-block; margin:0 10pt; color:${p.hair}; }

  .pillars { display:flex; gap:10pt; margin:6pt 0 10pt; break-inside:avoid; }
  .pcard { position:relative; flex:1; border:1.5px solid ${p.hair}; border-radius:18px; padding:17pt 4pt 14pt; text-align:center; background:${p.card}; }
  .pcard-hl { border-color:${hexA(PRI, 0.58)}; box-shadow:0 6px 28px ${hexA(PRI,0.18)},${p.shadowHi}; background:${p.bgHighlight}; }
  .pcard-tag { position:absolute; top:-9pt; left:50%; transform:translateX(-50%); font-size:8pt; font-weight:700; color:#fff; background:${PRI}; border-radius:999px; padding:2pt 11pt; letter-spacing:0.05em; box-shadow:0 3px 12px ${hexA(PRI,0.4)}; }
  .pcard .pk { font-size:9.5pt; font-weight:700; color:${p.ink}; }
  .pcard .pk-sub { display:block; font-size:7.5pt; font-weight:400; color:${p.dim}; margin-top:2pt; }
  .pcard .phan { font-size:37pt; font-weight:700; line-height:1.08; margin:10pt 0 7pt; letter-spacing:0.04em; }
  .pcard .pn { font-size:10.5pt; color:${p.dim}; }
  .pcard .pe { font-size:10pt; font-weight:500; margin-top:6pt; }
  .pcard .dotsep { color:${p.dim}; margin:0 4pt; }
  .pcard-empty .phan { font-size:24pt; color:${p.dim}; padding:8pt 0; }
  .pillar-cap { text-align:center; font-size:9.5pt; line-height:1.68; color:${p.dim}; margin-bottom:22pt; }

  .ohaeng-wrap { border-top:1.5px solid ${p.hair}; padding-top:22pt; break-inside:avoid; }
  .ohaeng-title { font-size:12pt; font-weight:700; color:${p.ink}; margin-bottom:15pt; letter-spacing:0.05em; }
  .ohaeng-grid { display:flex; gap:24pt; align-items:center; }
  .ohaeng-radar { flex:0 0 auto; }
  .ohaeng-bars { flex:1; }
  .obar { display:flex; align-items:center; gap:12pt; margin-bottom:12pt; }
  .obar .ol { flex:0 0 56pt; font-size:10.5pt; font-weight:500; color:${p.body}; }
  .obar .ol .oh { font-weight:700; margin-right:7pt; }
  .obar .otrack { flex:1; height:10pt; border-radius:999px; background:${hexA(p.ink, 0.07)}; overflow:hidden; }
  .obar .ofill { height:100%; border-radius:999px; }
  .obar .oc { flex:0 0 18pt; text-align:right; font-size:10pt; font-weight:700; color:${p.dim}; }
  .balance-note { font-size:11pt; line-height:1.75; color:${p.body}; margin-top:17pt; padding:14pt 20pt; background:${hexA(SEC, 0.07)}; border-radius:14px; border:1px solid ${hexA(SEC, 0.20)}; }
  .ohaeng-read { margin-top:19pt; }
  .ohaeng-read .body { font-size:11pt; line-height:1.92; }

  /* ── 월별 운세 (12개월 한 페이지에 담기 위해 행 간격을 조밀하게) ── */
  .months { display:flex; flex-direction:column; gap:6pt; }
  .mrow { display:flex; flex-direction:column; gap:5pt; padding:9pt 14pt; border-radius:12px; break-inside:avoid; }
  .m-header { display:flex; align-items:center; gap:9pt; }
  .m-med { flex:0 0 auto; width:28pt; height:28pt; border-radius:50%; border:1.5px solid ${hexA(PRI, 0.48)}; color:${PRI}; font-size:12pt; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .m-theme { display:inline-block; font-size:9.5pt; font-weight:700; border-radius:20px; padding:2pt 10pt; }
  .m-text { font-size:11pt; line-height:1.55; color:${p.body}; }
  .m-tags { display:flex; gap:8pt; flex-wrap:wrap; margin-top:2pt; }
  .m-tag { font-size:9.5pt; font-weight:600; padding:2pt 9pt; background:${p.card}; border-radius:6px; color:${p.dim}; }

  /* ── 타임라인 ── */
  .tl-row { display:flex; gap:16pt; break-inside:avoid; }
  .tl-axis { flex:0 0 14pt; display:flex; flex-direction:column; align-items:center; }
  .tl-node { width:14pt; height:14pt; border-radius:50%; border:2.5px solid ${SEC}; background:${hexA(SEC, 0.22)}; margin-top:6pt; flex:0 0 auto; box-shadow:0 0 0 3pt ${hexA(SEC,0.12)}; }
  .tl-row:not(:last-child) .tl-axis::after { content:''; flex:1; width:1.5px; background:linear-gradient(to bottom,${hexA(SEC,0.4)},${hexA(SEC,0.1)}); margin:4pt 0; }
  .tl-body { flex:1; padding-bottom:17pt; }
  .tl-label { font-size:16.5pt; font-weight:700; color:${p.ink}; margin-bottom:9pt; }
  .tl-label .tl-sub { font-size:9.5pt; font-weight:400; color:${p.dim}; margin-left:7pt; }

  /* ── 연도 카드 ── */
  .ycard { border:1.5px solid ${p.hair}; border-radius:18px; padding:15pt 20pt; margin-bottom:12pt; background:${p.card}; break-inside:avoid; border-left:4pt solid ${hexA(PRI, 0.55)}; box-shadow:0 2px 12px ${hexA(PRI,0.07)}; }
  .yhead { display:flex; align-items:center; gap:12pt; margin-bottom:9pt; }
  .yy { font-size:18pt; font-weight:700; color:${PRI}; }
  .ykw { font-size:9.5pt; font-weight:700; color:${SEC}; background:${hexA(SEC, 0.10)}; border-radius:8px; padding:3pt 12pt; border:1px solid ${hexA(SEC, 0.26)}; }
  .ycard .body { margin-bottom:0; font-size:12pt; line-height:1.90; }

  /* ── 엔딩 — 소장 욕구 극대화 ── */
  .ending {
    min-height:297mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
    text-align:center; padding:0 24mm; position:relative; overflow:hidden;
    background:
      radial-gradient(ellipse at 50% 36%, ${hexA(PRI, 0.16)} 0%, transparent 58%),
      radial-gradient(ellipse at 20% 80%, ${hexA(SEC, 0.10)} 0%, transparent 44%),
      ${p.pageBg};
  }
  .ending::before { content:''; position:absolute; top:0; left:0; right:0; height:4pt; background:linear-gradient(to right,transparent,${PRI},${SEC},${PRI},transparent); opacity:0.65; }
  .ending::after  { content:''; position:absolute; bottom:0; left:0; right:0; height:1.5pt; background:linear-gradient(to right,transparent,${hexA(PRI,0.5)},transparent); opacity:0.5; }
  .ending .logo { font-size:48pt; font-weight:900; color:${p.logo}; letter-spacing:0.32em; margin-top:12pt; text-shadow:${p.logoShadow}, 0 0 50px ${hexA(PRI,0.25)}; }
  .ending .eline { font-style:italic; font-size:15pt; color:${p.body}; line-height:2.1; margin-top:28pt; max-width:140mm; }
  .ending .eorn { color:${PRI}; font-size:12pt; margin:30pt 0 15pt; letter-spacing:0.6em; opacity:0.75; }
  .ending .efoot { font-size:8.5pt; letter-spacing:0.38em; color:${p.dim}; }
  /* 엔딩 서명선 */
  .ending .esign { margin-top:36pt; padding-top:18pt; border-top:1px solid ${hexA(PRI,0.22)}; font-size:9pt; color:${p.dim}; letter-spacing:0.22em; }
</style></head>
<body>

  <!-- 표지 -->
  <section class="cover page">
    ${corners}
    <svg class="constel" width="420" height="420" viewBox="0 0 420 420" fill="none">
      <circle cx="210" cy="210" r="180" stroke="${PRI}" stroke-width="0.5" opacity="0.3"/>
      <circle cx="210" cy="210" r="130" stroke="${SEC}" stroke-width="0.5" opacity="0.24"/>
      <circle cx="210" cy="210" r="76" stroke="${PRI}" stroke-width="0.5" opacity="0.2"/>
      <path d="M80 140 L155 92 L248 114 L334 82 L350 178" stroke="${SEC}" stroke-width="0.8" opacity="0.38" fill="none"/>
      <path d="M68 300 L142 346 L242 320 L330 360" stroke="${PRI}" stroke-width="0.8" opacity="0.32" fill="none"/>
      <circle cx="80" cy="140" r="2.8" fill="${SEC}"/><circle cx="155" cy="92" r="2.2" fill="${PRI}"/>
      <circle cx="248" cy="114" r="2.6" fill="${SEC}"/><circle cx="334" cy="82" r="2.2" fill="${PRI}"/>
      <circle cx="350" cy="178" r="2.4" fill="${SEC}"/><circle cx="68" cy="300" r="2.4" fill="${PRI}"/>
      <circle cx="142" cy="346" r="2.8" fill="${SEC}"/><circle cx="242" cy="320" r="2.2" fill="${PRI}"/>
      <circle cx="330" cy="360" r="2.6" fill="${PRI}"/>
      <circle cx="390" cy="210" r="3.2" fill="${PRI}"/><circle cx="210" cy="48" r="2.4" fill="${SEC}"/>
      ${sealDots}
    </svg>
    <div class="inner">
      <div class="eyebrow">${esc(cfg.eyebrow)}</div>
      <div class="sub serif">${esc(cfg.subtitle)}</div>
      ${d.nickname ? `<div class="forwhom"><b>${esc(d.nickname)}</b>님을 위한 ${esc(cfg.forwhom)}</div>` : ''}
      <div class="logo serif">天 文</div>
      ${d.ilju ? `<div class="ilju-hanja serif">${esc(d.ilju)}</div>` : ''}
      <div class="mark">✦ ✦ ✦</div>
      ${d.iljuLine ? `<div class="ilju-line serif">${esc(refine(d.iljuLine))}</div>` : ''}
      <div class="sub2">天文 AI · ${esc(d.date || '')}</div>
    </div>
    <div class="cover-bar"></div>
  </section>

  <!-- 사주 명식 (공유) -->
  <section class="myungsik page brk">
    <div class="page-inner">
      <div class="myungsik-hero">
        <div class="mh-name serif">${esc(d.nickname)}님의 사주 명식</div>
        <div class="mh-meta"><span>${esc(d.birthText)}</span><span class="mh-dot">|</span><span>${esc(d.tti || '')}띠</span><span class="mh-dot">|</span><span>일주 <b>${esc(d.ilju)}</b></span></div>
      </div>
      <div class="pillars">${pillarCards}</div>
      <div class="pillar-cap">네 기둥은 태어난 해·달·날·시의 하늘 기운(천간)과 땅 기운(지지)을 담습니다.<br>가운데 강조된 <b>일주</b>가 ${esc(d.nickname)}님의 중심이에요.</div>
      <div class="ohaeng-wrap">
        <div class="ohaeng-title">오행 분포 — 다섯 기운의 균형</div>
        <div class="ohaeng-grid">
          <div class="ohaeng-radar">${ohaengRadar}</div>
          <div class="ohaeng-bars">${ohaengBars}</div>
        </div>
        <div class="balance-note">${balanceNote}</div>
        ${d.ohaengReading ? `<div class="ohaeng-read">${paras(d.ohaengReading)}</div>` : ''}
      </div>
    </div>
  </section>

  <!-- 본문 (리포트별) -->
  <div class="flow">
    ${cfg.makeBody(builders)}
  </div>

  <!-- 엔딩 -->
  <section class="ending page brk">
    ${corners}
    <svg width="160" height="160" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="60" fill="none" stroke="${PRI}" stroke-width="0.6" opacity="0.4"/>
      <circle cx="75" cy="75" r="43" fill="none" stroke="${SEC}" stroke-width="0.6" opacity="0.38"/>
      <circle cx="75" cy="75" r="26" fill="none" stroke="${PRI}" stroke-width="0.6" opacity="0.3"/>
      <circle cx="135" cy="75" r="2.4" fill="${PRI}"/>
      <circle cx="75" cy="32" r="2" fill="${SEC}"/>
      <circle cx="49" cy="101" r="1.6" fill="${PRI}"/>
      <circle cx="108" cy="110" r="1.6" fill="${SEC}"/>
      <path d="M75 75 L135 75 M75 75 L75 32 M75 75 L49 101 M75 75 L108 110" stroke="${hexA(SEC, 0.25)}" stroke-width="0.5"/>
      <text x="75" y="84" text-anchor="middle" font-size="22" fill="${PRI}">✦</text>
    </svg>
    <div class="logo serif">天 文</div>
    <div class="eline serif">“${esc(refine(cfg.closing))}”</div>
    <div class="eorn">— ✦ —</div>
    <div class="efoot">${esc(cfg.foot)}</div>
    <div class="esign">${esc(d.nickname || '')}님을 위해 · ${esc(d.date || '')}</div>
  </section>

  <!-- 한 분야 = 한 페이지: 내용을 페이지의 약 70~90%로 자동 맞춤(넘치면 줄이고, 모자라면 살짝 키워 중앙 배치) -->
  <script>
  (function () {
    var TARGET = 0.86;   // 목표: 페이지 높이의 86%를 채운다
    var MAX_UP = 1.12;   // 일반 본문은 1.12배까지만 키운다(가독성 유지)
    var MAX_UP_OV = 1.5; // 한눈에 보기(개요)는 가벼우므로 더 키워 페이지를 채운다
    function fit() {
      var pages = document.querySelectorAll('.sec.page, .myungsik.page');
      for (var i = 0; i < pages.length; i++) {
        var pg = pages[i], inner = pg.querySelector('.page-inner');
        if (!inner) continue;
        inner.style.transform = 'none';
        var avail = pg.clientHeight;                 // A4 한 장(px)
        var h = inner.getBoundingClientRect().height; // 내용 자연 높이(px)
        if (!h) continue;
        var cap = inner.querySelector('.ov') ? MAX_UP_OV : MAX_UP;
        var s = (avail * TARGET) / h;
        if (s > cap) s = cap;                        // 과도한 확대 방지
        if (s * h > avail * 0.98) s = (avail * 0.98) / h; // 절대 넘치지 않게
        inner.style.transform = 'scale(' + s.toFixed(4) + ')';
      }
    }
    function run() { fit(); setTimeout(fit, 120); } // 폰트 적용 후 재보정
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  })();
  </script>

</body></html>`;
}

/* ================================================================
   인생 시그니처 리포트 (골드)
================================================================ */
export function renderReportPdfHtml(d, theme = 'dark') {
  return renderReport(d, theme, {
    variant: 'signature',
    eyebrow: 'SIGNATURE   REPORT',
    subtitle: '시그니처 사주 리포트',
    forwhom: '천문의 기록',
    closing: d.closing,
    foot: '天文 AI · 한국형 정밀 운세 리포트',
    makeBody: (b) => {
      const { paras, textSec, area, phase, cards, ELEM, PRI, SEC, d, domKey, lackKey, domPlain, lackPlain } = b;
      // 한눈에 보기 — 명식 다음 단독 페이지. 일주 히어로 + 한 줄 요약 + 핵심 요약 카드로 페이지를 채운다.
      const keyLine = (d.keywords && d.keywords.length)
        ? `<div class="summary-row"><div class="summary-label">핵심 키워드</div><div class="summary-val">${d.keywords.map(k => esc(k)).join(' · ')}</div></div>` : '';
      const summaryBox = `
        <div class="summary">
          <div class="summary-k">핵심 요약</div>
          <div class="summary-row"><div class="summary-label">중심 기운</div><div class="summary-val">강한 기운 <b style="color:${ELEM[domKey].color}">${esc(domPlain || '고른 편')}</b>${lackKey ? ` · 보완할 기운 <b style="color:${ELEM[lackKey].color}">${esc(lackPlain)}</b>` : ''}</div></div>
          ${keyLine}
        </div>`;
      const overviewInner = `
        <div class="ov">
          <div class="ov-heroes">
            <div class="ov-one">
              <div class="ov-hanja serif" style="color:${ELEM[domKey].color}">${esc(d.ilju)}</div>
              <div class="ov-name">${esc(d.ilju)} 일주<span class="ov-sub">${d.tti ? esc(d.tti) + '띠' : ''}</span></div>
            </div>
          </div>
          ${d.iljuLine ? `<div class="ov-line serif">“${esc(refine(d.iljuLine))}”</div>` : ''}
        </div>
        ${summaryBox}`;
      const monthRows = (d.months || []).map((m, idx) => {
        const num = String(m.label).replace(/[^0-9]/g, '') || m.label;
        const isEven = idx % 2 === 0;
        const accentOpacity = isEven ? '0.12' : '0.08';
        return `<div class="mrow" style="background:${hexA(PRI, parseFloat(accentOpacity))};border-left:3px solid ${hexA(PRI, 0.5)}">
          <div class="m-header">
            <span class="m-med serif">${esc(num)}</span>
            ${m.theme ? `<span class="m-theme" style="color:${PRI};background:${hexA(PRI, 0.12)};border:1px solid ${hexA(PRI, 0.28)}">${esc(m.theme)}</span>` : ''}
          </div>
          <span class="m-text">${esc(refine(m.text))}</span>
          ${(m.focus || m.luckyKeyword) ? `<div class="m-tags">
            ${m.focus ? `<span class="m-tag" style="color:${PRI}">✦ ${esc(m.focus)}</span>` : ''}
            ${m.luckyKeyword ? `<span class="m-tag" style="color:${SEC}">★ ${esc(m.luckyKeyword)}</span>` : ''}
          </div>` : ''}
        </div>`;
      });
      // 12개월 한 페이지(자동 맞춤이 한 장에 담는다)
      const months = `<div class="months">${monthRows.join('')}</div>`;
      const adviceTips = [['재물', d.wealth], ['애정', d.love], ['직업', d.career], ['건강', d.health]]
        .map(([k, a]) => [k, a && a.tip]).filter(x => x[1]);
      const checklistBox = adviceTips.length ? `
        <div class="checklist"><div class="checklist-k">오늘부터의 실천 체크리스트</div>
          ${adviceTips.map(([k, t]) => `<div class="check-item"><div class="check-box">✓</div><div class="check-text"><span class="check-area">${esc(k)}</span>${esc(refine(t))}</div></div>`).join('')}
        </div>` : '';
      const yearItems = (d.years || []).map(y => ({ label: y.label, kw: y.keyword, text: y.text }));
      // 향후 5년 한 페이지(자동 맞춤이 한 장에 담는다)
      const years = `<div class="years">${cards(yearItems)}</div>`;
      return [
        textSec('', '한눈에 보기', overviewInner, PRI, '覽'),
        textSec('I', '사주 총평', paras(d.sajuReading, true), PRI, '命'),
        textSec('II', '타고난 성격', paras(d.personality, true), SEC, '性'),
        textSec('III', '재능과 적성', paras(d.talent, true), PRI, '才'),
        area('IV', '재물운', d.wealth, ELEM['금'].color, '財'),
        area('V', '애정과 인연', d.love, ELEM['화'].color, '緣'),
        area('VI', '직업과 사회운', d.career, ELEM['목'].color, '職'),
        area('VII', '건강운', d.health, ELEM['수'].color, '健'),
        textSec('VIII', `${esc(d.year)}년 월별 운세`, months, PRI, '月'),
        textSec('IX', '초년 · 중년 · 말년 인생 흐름', `<div class="timeline">${phase('초년', '태어나서 30대까지', d.lifeEarly)}${phase('중년', '40~60대', d.lifeMid)}${phase('말년', '60대 이후', d.lifeLate)}</div>`, SEC, '流'),
        textSec('X', '향후 5년 운세', years, PRI, '年'),
        textSec('XI', `${esc(d.nickname)}님을 위한 조언`, `${paras(d.advice, true)}${checklistBox}`, SEC, '言'),
      ].join('');
    },
  });
}

/* ================================================================
   궁합 심층 리포트 (로즈) — 두 사람의 인연 심층 분석
================================================================ */
export function renderGunghapReportPdfHtml(d, theme = 'dark') {
  return renderReport(d, theme, {
    variant: 'gunghap',
    eyebrow: 'LOVE   REPORT',
    subtitle: '궁합 심층 리포트',
    forwhom: `${esc(d.nickname)} ♥ ${esc(d.partnerName)}`,
    closing: d.closing,
    foot: '天文 AI · 궁합 심층 리포트',
    makeBody: (b) => {
      const { paras, textSec, phase, PRI, SEC, ELEM, d } = b;

      const oh1color = ELEM[d.saju?.dayElem]?.color || PRI;
      const oh2color = ELEM[d.saju2?.dayElem]?.color || SEC;

      // 궁합 점수 / 등급
      const score = d.compatibilityScore || null;
      const grade = !score ? '' : score >= 85 ? '천생연분' : score >= 70 ? '좋은 궁합' : score >= 55 ? '노력하는 사랑' : '성장하는 인연';

      // 한눈에 보기 — 명식 다음 단독 페이지. 두 사람 히어로 + 궁합 점수 + 기운 요약으로 채운다.
      const coupleRows = `
        <div class="summary">
          <div class="summary-k">두 사람의 기운</div>
          <div class="summary-row">
            <div class="summary-label" style="color:${oh1color}">♠ ${esc(d.nickname)}</div>
            <div class="summary-val"><b>${esc(d.ilju)}</b> · ${esc(d.ohaengPlain)} 기운 · ${esc(d.birthText)}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label" style="color:${oh2color}">♥ ${esc(d.partnerName)}</div>
            <div class="summary-val"><b>${esc(d.ilju2)}</b> · ${esc(d.ohaengPlain2)} 기운 · ${esc(d.birthText2)}</div>
          </div>
        </div>`;
      const overviewInner = `
        <div class="ov">
          <div class="ov-heroes">
            <div class="ov-one">
              <div class="ov-hanja serif" style="color:${oh1color}">${esc(d.ilju)}</div>
              <div class="ov-name">${esc(d.nickname)}<span class="ov-sub">${esc(d.ohaengPlain)} 기운</span></div>
            </div>
            <div class="ov-amp serif">♥</div>
            <div class="ov-one">
              <div class="ov-hanja serif" style="color:${oh2color}">${esc(d.ilju2)}</div>
              <div class="ov-name">${esc(d.partnerName)}<span class="ov-sub">${esc(d.ohaengPlain2)} 기운</span></div>
            </div>
          </div>
          ${score ? `<div class="ov-score"><div class="ov-num">${score}<span class="ov-u">점</span></div><div class="ov-grade">${esc(grade)} · 궁합 지수</div></div>` : ''}
        </div>
        ${coupleRows}`;

      // 1·3·5년 타임라인
      const km = d.keyMoments || {};
      const futureTimeline = `<div class="timeline">
        ${phase('1년 후', '가까운 미래', km.y1)}
        ${phase('3년 후', '관계의 성숙', km.y3)}
        ${phase('5년 후', '깊어진 인연', km.y5)}
      </div>`;

      // 각자에 대한 조언
      const adviceBox = `
        <div class="summary">
          <div class="summary-k">각자에게 전하는 말</div>
          <div class="summary-row"><div class="summary-label" style="color:${oh1color}">${esc(d.nickname)}</div><div class="summary-val">${esc(refine(d.adviceForA || ''))}</div></div>
          <div class="summary-row"><div class="summary-label" style="color:${oh2color}">${esc(d.partnerName)}</div><div class="summary-val">${esc(refine(d.adviceForB || ''))}</div></div>
        </div>`;

      // 분야별 caution 추가 (fortune 리포트와 달리 궁합은 관계에 특화)
      return [
        textSec('',    '한눈에 보기',         overviewInner,                                    PRI, '覽'),
        textSec('I',   '관계의 본질',         paras(d.overview, true),                          PRI, '緣'),
        textSec('II',  '애정의 역학',           paras(d.loveDynamic, true),                       SEC, '愛'),
        textSec('III', '소통 방식',             paras(d.communicationStyle, true),                PRI, '話'),
        textSec('IV',  '갈등 패턴과 해소',      `${paras(d.conflictPattern, true)}${paras(d.conflictSolution)}`, SEC, '和'),
        d.relationshipStrength ? textSec('V', '이 관계만의 강점', paras(d.relationshipStrength, true), PRI, '光') : '',
        textSec('VI',  '함께 성장하는 방향',   paras(d.growthTogether, true),                    PRI, '共'),
        textSec('VII', '1년·3년·5년 후 전망',  futureTimeline,                                   SEC, '來'),
        textSec('VIII',`${esc(d.nickname)}님과 ${esc(d.partnerName)}님께`, adviceBox,            PRI, '言'),
      ].filter(Boolean).join('');
    },
  });
}

/* ================================================================
   학습 상세 리포트 (에메랄드) — 시그니처와 같은 양식
================================================================ */
export function renderStudyReportPdfHtml(d, theme = 'dark') {
  return renderReport(d, theme, {
    variant: 'study',
    eyebrow: 'STUDY   REPORT',
    subtitle: '학습 상세 리포트',
    forwhom: '학습의 지도',
    closing: d.closingQuote || d.closing,
    foot: '天文 AI · 학습 상세 리포트',
    makeBody: (b) => {
      const { paras, textSec, phase, cards, PRI, SEC, d } = b;
      const bt = d.bestTime || {};
      // 한눈에 보기 — 명식 다음 단독 페이지. 두뇌 유형 히어로 + 핵심 요약 카드로 페이지를 채운다.
      const ovKeyLine = (d.brainKeywords && d.brainKeywords.length)
        ? `<div class="summary-row"><div class="summary-label">핵심 강점</div><div class="summary-val">${d.brainKeywords.map(k => esc(k)).join(' · ')}</div></div>` : '';
      const overviewInner = `
        <div class="ov">
          <div class="ov-heroes">
            <div class="ov-one">
              <div class="ov-hanja serif" style="color:${PRI}">${esc(d.ilju)}</div>
              <div class="ov-name">${esc(d.brainType || (d.ilju + ' 일주'))}<span class="ov-sub">${esc(d.ilju)} 일주${d.tti ? ' · ' + esc(d.tti) + '띠' : ''}</span></div>
            </div>
          </div>
          ${d.iljuLine ? `<div class="ov-line serif">“${esc(refine(d.iljuLine))}”</div>` : ''}
        </div>
        <div class="summary">
          <div class="summary-k">핵심 요약</div>
          ${d.brainType ? `<div class="summary-row"><div class="summary-label">두뇌 유형</div><div class="summary-val serif"><b style="color:${PRI};font-size:14pt;">${esc(d.brainType)}</b></div></div>` : ''}
          <div class="summary-row"><div class="summary-label">일주</div><div class="summary-val"><b>${esc(d.ilju)}</b>${d.tti ? ` · ${esc(d.tti)}띠` : ''}</div></div>
          ${ovKeyLine}
        </div>`;
      const ex = d.examStrategy || {};
      const examCards = cards([
        ['D-100 이상', '기초·체력', ex.d100], ['D-60', '실전 감각', ex.d60],
        ['D-30', '약점 보완', ex.d30], ['D-7', '컨디션·정리', ex.d7],
      ].filter(([, , t]) => t).map(([label, kw, text]) => ({ label, kw, text })));
      const distractionBox = d.distractionPatterns ? paras(d.distractionPatterns, true) : '';
      return [
        textSec('', '한눈에 보기', overviewInner, PRI, '覽'),
        textSec('I', '타고난 두뇌 유형', paras(d.brainTypeDesc, true), PRI, '腦'),
        textSec('II', '잘 맞는 과목과 적성', paras(d.subjectStrengths, true), SEC, '才'),
        textSec('III', '최적의 공부법', paras(d.studyMethod, true), PRI, '學'),
        textSec('IV', '집중이 잘 되는 시간대', `<div class="timeline">${phase('오전', '아침의 기운', bt.morning)}${phase('오후', '한낮의 집중', bt.afternoon)}${phase('저녁', '밤의 몰입', bt.evening)}</div>`, SEC, '時'),
        textSec('V', '나에게 맞는 학습 환경', paras(d.environment, true), PRI, '境'),
        textSec('VI', '기억력 강화와 슬럼프 극복', `${paras(d.memoryTips, true)}${d.slumpRecovery ? `<div class="checklist"><div class="checklist-k">슬럼프가 올 때</div><div class="check-text" style="padding:0;">${paras(d.slumpRecovery)}</div></div>` : ''}`, SEC, '憶'),
        textSec('VII', '나를 방해하는 패턴', distractionBox, SEC, '障'),
        textSec('VIII', '이번 시기 학습 에너지', paras(d.monthlyEnergy, true), PRI, '氣'),
        textSec('IX', '시험 단계별 전략', `<div class="years">${examCards}</div>`, SEC, '略'),
        textSec('X', `${esc(d.nickname)}님을 위한 응원`, paras(d.finalAdvice, true), PRI, '勉'),
      ].join('');
    },
  });
}
