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
  // 금빛 = 모든 리포트 공통의 장식 프레임/서브컬러(표지·코너·구분선 등).
  // 내용 강조색(PRI)은 리포트별 정체성을 유지하되, 장식 크롬은 금빛으로 톤을 통일한다.
  const GOLD = p.gold;
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
  // 인생 흐름·시간대 타임라인 행(시그니처/학습 공용 — builders로 주입)
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
    return `<svg width="232" height="244" viewBox="0 0 232 244" fill="none">
      <defs><radialGradient id="radarFill" cx="50%" cy="48%" r="62%">
        <stop offset="0%" stop-color="${hexA(PRI, 0.46)}"/><stop offset="70%" stop-color="${hexA(PRI, 0.18)}"/><stop offset="100%" stop-color="${hexA(SEC, 0.06)}"/>
      </radialGradient></defs>
      <circle cx="116" cy="120" r="86" fill="${hexA(PRI, 0.035)}"/>
      ${grid}${axes}
      <polygon points="${dataPoly}" fill="url(#radarFill)" stroke="${PRI}" stroke-width="2"/>
      ${dots}${labels}</svg>`;
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
  // 표지 선버스트 — 중심에서 뻗는 금빛 빛살(고급 인장 느낌)
  const coverSunburst = [...Array(48)].map((_, i) => {
    const a = i * 7.5 * Math.PI / 180, r1 = 66, r2 = i % 2 ? 92 : 112;
    const x1 = 210 + r1 * Math.cos(a), y1 = 210 + r1 * Math.sin(a);
    const x2 = 210 + r2 * Math.cos(a), y2 = 210 + r2 * Math.sin(a);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${hexA(GOLD, i % 2 ? 0.12 : 0.22)}" stroke-width="0.7"/>`;
  }).join('');
  // 표지에 흩뿌린 별 — 깊이감(좌표는 고정 시드로 결정적)
  const coverStars = [[38,58],[372,72],[58,330],[360,348],[120,40],[300,388],[28,200],[398,250],[180,30],[244,400],[90,118],[330,150],[150,392],[280,52]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.8 : 1.1}" fill="${i % 2 ? SEC : GOLD}" opacity="${i % 3 === 0 ? 0.7 : 0.4}"/>`).join('');
  const corners = `<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span><span class="corner-dot tl"></span><span class="corner-dot tr"></span><span class="corner-dot bl"></span><span class="corner-dot br"></span>`;

  /* ── 금빛 필리그리 구분선 — 표지·엔딩·섹션 공용 장식(SVG라 PDF에 선명) ── */
  const ornDivider = (w = 190, c = GOLD, c2 = SEC) => `
    <svg width="${w}" height="18" viewBox="0 0 ${w} 18" fill="none" style="display:block;margin:0 auto;">
      <line x1="10" y1="9" x2="${w / 2 - 30}" y2="9" stroke="${hexA(c, 0.45)}" stroke-width="1"/>
      <line x1="${w / 2 + 30}" y1="9" x2="${w - 10}" y2="9" stroke="${hexA(c, 0.45)}" stroke-width="1"/>
      <path d="M${w / 2 - 26} 9 Q${w / 2 - 13} 2.5 ${w / 2} 9 Q${w / 2 + 13} 15.5 ${w / 2 + 26} 9" stroke="${c}" stroke-width="1.1" fill="none"/>
      <path d="M${w / 2 - 26} 9 Q${w / 2 - 13} 15.5 ${w / 2} 9 Q${w / 2 + 13} 2.5 ${w / 2 + 26} 9" stroke="${hexA(c, 0.5)}" stroke-width="0.8" fill="none"/>
      <circle cx="${w / 2}" cy="9" r="2.8" fill="${c}"/>
      <circle cx="${w / 2 - 26}" cy="9" r="1.8" fill="${c2}"/><circle cx="${w / 2 + 26}" cy="9" r="1.8" fill="${c2}"/>
      <circle cx="10" cy="9" r="1.5" fill="${hexA(c, 0.7)}"/><circle cx="${w - 10}" cy="9" r="1.5" fill="${hexA(c, 0.7)}"/>
    </svg>`;

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
  /* PDF 본문 배경은 단색 — html2canvas가 화면 그라데이션을 캡처하면 섹션마다 색이 달라
     보이고(가운데 밝고 바깥 어두움) clientPdf 여백 단색과 어긋난다. 단색 pageBg 로 통일해
     이질감 제거. 표지·맺음말은 각자 .cover/.ending 에서 고유 배경을 유지한다. */
  html, body { background:${p.pageBg}; }
  body { font-family:'Noto Sans KR',sans-serif; color:${p.ink}; word-break:keep-all; overflow-wrap:break-word; line-height:1.65; font-size:13pt; orphans:4; widows:4; }
  .serif { font-family:'Noto Serif KR',serif; }
  b { font-weight:700; }

  /* ── 페이지 구분 — 한 섹션 = 한 페이지(분할 없음) ──
     섹션은 자연 높이로 흐르고, clientPdf가 각 .page 를 캔버스에서 잘라
     PDF 한 장에 '맞춰서' 그린다(길면 축소·짧으면 가운데). 절대 분할되지 않는다. */
  .page { position: relative; }
  .page.brk { break-before: page; page-break-before: always; }
  .flow { padding: 0; }

  /* ── 섹션 ── (좌우 여백은 섹션 자체에 — 섹션별 캡처 시 모든 페이지 폭이 동일하도록) */
  .sec { margin-bottom: 0; }
  .sec.page { padding: 22pt 22mm 18pt; position: relative; }
  .page-inner { width: 100%; }
  /* 섹션 상단 — 얇은 별 장식 띠 */
  .sec.page::before {
    content: ''; display: block; position: absolute; top: 0; left: 22mm; right: 22mm;
    height: 1px; background: linear-gradient(to right, transparent, ${hexA(PRI,0.35)}, ${hexA(SEC,0.25)}, transparent);
  }
  .sec.page::after { content:'✦ ✦ ✦'; display:block; text-align:center; margin-top:30pt; color:${PRI}; font-size:10pt; letter-spacing:0.55em; opacity:0.35; }

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
  /* 드롭캡 — 첫 글자를 크게(책 같은 소장감, 휑한 총평 채움) */
  .dropcap { float:left; font-family:'Noto Serif KR',serif; font-size:52pt; font-weight:900; line-height:0.8; margin:4pt 11pt 0 0; }
  /* 키워드 밴드 — 성격·재능 섹션 하단 칩 모음으로 여백 채움 */
  .chip-band { margin-top:22pt; padding-top:17pt; border-top:1px solid ${hexA(PRI, 0.16)}; break-inside:avoid; }
  .chip-band-k { font-size:9pt; font-weight:700; letter-spacing:0.22em; margin-bottom:12pt; text-transform:uppercase; }

  /* ── 소목차 블록 ── */
  .subsec { break-inside:avoid; margin-bottom:22pt; padding:16pt 20pt; border-radius:16px; background:linear-gradient(135deg, ${hexA(PRI,0.075)} 0%, ${hexA(PRI,0.02)} 70%); border-left:3pt solid ${hexA(PRI,0.55)}; box-shadow:0 3px 14px ${hexA(PRI,0.06)}; }
  .subsec-title { font-size:14pt; font-weight:700; color:${PRI}; margin-bottom:10pt; letter-spacing:0.01em; }
  .subsec-title::before { content:'✦ '; font-size:0.82em; color:${hexA(PRI,0.65)}; }
  .subsec .body { margin-bottom:0; }

  .chips { display:flex; flex-wrap:wrap; gap:8pt; margin:2pt 0 22pt; break-inside:avoid; }
  .chip { font-size:11.5pt; font-weight:600; padding:6pt 17pt; border-radius:999px; border:1px solid; }
  /* 한눈에 보기 요약 카드 안의 칩 — 행에 맞춰 여백 제거 */
  .summary-row .chips { margin:0; }

  /* ── 인용구 — 폭이 넓고 시각적으로 강하게 ── */
  .pquote {
    position:relative; font-size:17pt; line-height:1.85; font-weight:500; color:${p.ink};
    border-left:4px solid; padding:13pt 20pt 13pt 24pt; margin:4pt 0 26pt; break-inside:avoid;
    background:linear-gradient(135deg, ${hexA(PRI, 0.11)} 0%, ${hexA(PRI, 0.03)} 60%, ${hexA(SEC, 0.04)} 100%);
    border-radius:0 16px 16px 0;
    box-shadow: inset 0 0 0 1px ${hexA(PRI, 0.12)}, 0 4px 18px ${hexA(PRI, 0.08)};
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
  .corner.tl::before { top:0; left:0; right:0; height:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.tl::after  { top:0; left:0; bottom:0; width:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.tr { top:12mm; right:12mm; }
  .corner.tr::before { top:0; left:0; right:0; height:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.tr::after  { top:0; right:0; bottom:0; width:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.bl { bottom:12mm; left:12mm; }
  .corner.bl::before { bottom:0; left:0; right:0; height:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.bl::after  { top:0; left:0; bottom:0; width:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.br { bottom:12mm; right:12mm; }
  .corner.br::before { bottom:0; left:0; right:0; height:1.5pt; background:${hexA(GOLD,0.7)}; }
  .corner.br::after  { top:0; right:0; bottom:0; width:1.5pt; background:${hexA(GOLD,0.7)}; }
  /* 안쪽 작은 점 — 고급 인쇄물 느낌 */
  .corner-dot { position:absolute; width:5pt; height:5pt; border-radius:50%; background:${hexA(GOLD,0.6)}; z-index:4; }
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
  .cover .eyebrow { font-size:10.5pt; letter-spacing:0.72em; color:${GOLD}; font-weight:700; margin-bottom:16pt; opacity:0.9; }
  .cover .forwhom { font-size:12pt; color:${p.dim}; letter-spacing:0.06em; margin-bottom:18pt; }
  .cover .forwhom b { color:${p.ink}; font-weight:700; }
  .cover .logo { position:relative; font-size:56pt; font-weight:900; color:${p.logo}; letter-spacing:0.36em; text-shadow:${p.logoShadow}, 0 0 60px ${hexA(GOLD,0.35)}; margin:8pt 0 4pt; }
  .cover .logo::before { content:''; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:340pt; height:210pt; border-radius:50%; background:radial-gradient(ellipse, ${hexA(GOLD,0.32)} 0%, ${hexA(SEC,0.12)} 38%, transparent 64%); z-index:-1; pointer-events:none; }
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
    background:linear-gradient(to right,transparent,${GOLD},${SEC},${GOLD},transparent); opacity:0.8;
  }
  .cover .cover-bar::after {
    content:''; display:block; height:1.5pt;
    background:linear-gradient(to right,transparent,${hexA(GOLD,0.5)},transparent); opacity:0.6;
    margin-top:2pt;
  }

  /* ── 명식 ── */
  .myungsik.page { padding: 0 22mm; }
  .myungsik-hero { text-align:center; margin-bottom:24pt; padding:22pt 26pt; background:${hexA(PRI, 0.05)}; border-radius:20px; border:1px solid ${hexA(PRI, 0.24)}; box-shadow:0 4px 24px ${hexA(PRI,0.08)}; }
  .myungsik-hero .mh-name { font-size:23pt; font-weight:700; color:${p.ink}; }
  .myungsik-hero .mh-meta { margin-top:13pt; display:inline-flex; align-items:center; font-size:11pt; color:${p.dim};
    border:1px solid ${p.hair}; border-radius:999px; padding:8pt 20pt; background:${p.card}; }
  .myungsik-hero .mh-meta b { color:${p.ink}; }
  .mh-dot { display:inline-block; margin:0 10pt; color:${p.hair}; }

  .pillars { display:flex; gap:10pt; margin:6pt 0 10pt; break-inside:avoid; }
  .pcard { position:relative; flex:1; border:1.5px solid ${p.hair}; border-radius:18px; padding:17pt 4pt 14pt; text-align:center; background:${p.card}; }
  .pcard-hl { border-color:${hexA(PRI, 0.58)}; box-shadow:0 8px 30px ${hexA(PRI,0.22)},${p.shadowHi}; background:linear-gradient(165deg, ${hexA(PRI,0.16)} 0%, ${hexA(PRI,0.05)} 55%, ${hexA(SEC,0.05)} 100%); }
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
  .obar .otrack { flex:1; height:11pt; border-radius:999px; background:${hexA(p.ink, 0.07)}; overflow:hidden; box-shadow:inset 0 1px 2px ${hexA(p.ink,0.10)}; }
  .obar .ofill { height:100%; border-radius:999px; box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.28), 0 0 8px ${hexA(PRI,0.18)}; }
  .obar .oc { flex:0 0 18pt; text-align:right; font-size:10pt; font-weight:700; color:${p.dim}; }
  .balance-note { font-size:11pt; line-height:1.75; color:${p.body}; margin-top:17pt; padding:14pt 20pt; background:${hexA(SEC, 0.07)}; border-radius:14px; border:1px solid ${hexA(SEC, 0.20)}; }
  .ohaeng-read { margin-top:19pt; }
  .ohaeng-read .body { font-size:11pt; line-height:1.92; }

  /* ── 분기별 운세 (4개 카드 — 넉넉하고 가독성 좋게) ── */
  .months { display:flex; flex-direction:column; gap:13pt; }
  .mrow { display:flex; flex-direction:column; gap:8pt; padding:16pt 20pt; border-radius:16px; break-inside:avoid; }
  .m-header { display:flex; align-items:center; gap:11pt; }
  .m-med { flex:0 0 auto; width:34pt; height:34pt; border-radius:50%; border:1.5px solid ${hexA(PRI, 0.48)}; color:${PRI}; font-size:14pt; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .q-title { font-size:14pt; font-weight:700; color:${p.ink}; }
  .q-range { font-size:10pt; font-weight:400; color:${p.dim}; margin-left:7pt; }
  .m-theme { display:inline-block; font-size:10.5pt; font-weight:700; border-radius:20px; padding:3pt 12pt; }
  .m-text { font-size:12.5pt; line-height:1.75; color:${p.body}; }
  .m-tags { display:flex; gap:8pt; flex-wrap:wrap; margin-top:4pt; }
  .m-tag { font-size:10.5pt; font-weight:600; padding:2pt 10pt; background:${p.card}; border-radius:6px; color:${p.dim}; }

  /* ── 타임라인 ── */
  .tl-row { display:flex; gap:16pt; break-inside:avoid; }
  .tl-axis { flex:0 0 14pt; display:flex; flex-direction:column; align-items:center; }
  .tl-node { width:14pt; height:14pt; border-radius:50%; border:2.5px solid ${SEC}; background:${hexA(SEC, 0.22)}; margin-top:6pt; flex:0 0 auto; box-shadow:0 0 0 3pt ${hexA(SEC,0.12)}; }
  .tl-row:not(:last-child) .tl-axis::after { content:''; flex:1; width:1.5px; background:linear-gradient(to bottom,${hexA(SEC,0.4)},${hexA(SEC,0.1)}); margin:4pt 0; }
  .tl-body { flex:1; padding-bottom:17pt; }
  .tl-label { font-size:16.5pt; font-weight:700; color:${p.ink}; margin-bottom:9pt; }
  .tl-label .tl-sub { font-size:9.5pt; font-weight:400; color:${p.dim}; margin-left:7pt; }
  .tl-label .tl-mark { font-size:9pt; font-weight:700; color:${PRI}; background:${hexA(PRI, 0.12)}; border:1px solid ${hexA(PRI, 0.30)}; border-radius:20px; padding:2pt 11pt; margin-left:10pt; vertical-align:middle; }

  /* ── 운의 흐름(이번 분기 + 향후 3년) ── */
  .flow-sub { font-size:13pt; font-weight:700; color:${p.ink}; margin:24pt 0 16pt; padding-left:11pt; border-left:3px solid ${hexA(PRI, 0.55)}; }

  /* ── 케미 지표(궁합) ── */
  .chem { display:flex; flex-direction:column; gap:15pt; }
  .chem-row { padding:14pt 18pt; border-radius:16px; background:${p.card}; border:1px solid ${p.hair}; border-left:3px solid ${hexA(PRI, 0.5)}; break-inside:avoid; }
  .chem-head { display:flex; align-items:center; gap:11pt; margin-bottom:8pt; }
  .chem-label { font-size:13.5pt; font-weight:700; color:${p.ink}; flex:0 0 auto; }
  .cmeter { display:inline-flex; gap:5pt; margin-left:3pt; }
  .cdot { width:11pt; height:11pt; border-radius:50%; background:${hexA(PRI, 0.13)}; border:1px solid ${hexA(PRI, 0.26)}; display:inline-block; }
  .cdot.on { background:${PRI}; border-color:${PRI}; box-shadow:0 0 5px ${hexA(PRI, 0.5)}; }
  .chem-grade { margin-left:auto; font-size:10pt; font-weight:700; color:${PRI}; background:${hexA(PRI, 0.12)}; border:1px solid ${hexA(PRI, 0.28)}; border-radius:20px; padding:2pt 12pt; }
  .chem-text { font-size:12pt; line-height:1.7; color:${p.body}; margin:0; }

  /* ── 연도 카드 ── */
  .ycard { border:1.5px solid ${hexA(PRI,0.18)}; border-radius:18px; padding:15pt 20pt; margin-bottom:12pt; background:linear-gradient(135deg, ${hexA(PRI,0.07)} 0%, ${p.card} 60%); break-inside:avoid; border-left:4pt solid ${PRI}; box-shadow:0 4px 18px ${hexA(PRI,0.10)}; }
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
  .ending::before { content:''; position:absolute; top:0; left:0; right:0; height:4pt; background:linear-gradient(to right,transparent,${GOLD},${SEC},${GOLD},transparent); opacity:0.65; }
  .ending::after  { content:''; position:absolute; bottom:0; left:0; right:0; height:1.5pt; background:linear-gradient(to right,transparent,${hexA(GOLD,0.5)},transparent); opacity:0.5; }
  .ending .logo { font-size:48pt; font-weight:900; color:${p.logo}; letter-spacing:0.32em; margin-top:12pt; text-shadow:${p.logoShadow}, 0 0 50px ${hexA(GOLD,0.25)}; }
  .ending .eline { font-style:italic; font-size:15pt; color:${p.body}; line-height:2.1; margin-top:28pt; max-width:140mm; }
  .ending .eorn { color:${PRI}; font-size:12pt; margin:30pt 0 15pt; letter-spacing:0.6em; opacity:0.75; }
  .ending .efoot { font-size:8.5pt; letter-spacing:0.38em; color:${p.dim}; }
  /* 엔딩 서명선 */
  .ending .esign { margin-top:36pt; padding-top:18pt; border-top:1px solid ${hexA(PRI,0.22)}; font-size:9pt; color:${p.dim}; letter-spacing:0.22em; }
  /* ── 엔딩 '오늘 새길 한 구절' — 동양 고전 명구(금빛 인장 블록) ── */
  .classic { margin:26pt auto 6pt; max-width:148mm; padding:20pt 24pt; border-radius:18px;
    background:linear-gradient(160deg, ${hexA(GOLD,0.14)} 0%, ${hexA(GOLD,0.03)} 100%);
    border:1px solid ${hexA(GOLD,0.36)}; box-shadow:0 8px 30px ${hexA(GOLD,0.15)}, inset 0 0 0 1px ${hexA(GOLD,0.10)}; }
  .classic-k { font-size:9pt; font-weight:700; letter-spacing:0.28em; color:${GOLD}; margin-bottom:14pt; }
  .classic-hanja { font-size:36pt; font-weight:900; letter-spacing:0.2em; color:${GOLD}; line-height:1.18; text-shadow:0 2px 14px ${hexA(GOLD,0.28)}; }
  .classic-eum { font-size:11pt; font-weight:600; letter-spacing:0.34em; color:${hexA(p.ink,0.72)}; margin-top:8pt; }
  .classic-meaning { font-size:14.5pt; font-weight:500; font-style:italic; color:${p.ink}; margin-top:14pt; line-height:1.7; }
  .classic-why { font-size:11pt; color:${p.body}; margin-top:11pt; line-height:1.65; }
  .classic-source { font-size:9.5pt; font-weight:700; letter-spacing:0.06em; color:${hexA(GOLD,0.92)}; margin-top:11pt; }
</style></head>
<body>

  <!-- 표지 -->
  <section class="cover page">
    ${corners}
    <svg class="constel" width="420" height="420" viewBox="0 0 420 420" fill="none">
      ${coverSunburst}
      ${coverStars}
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
      <div class="mark">${ornDivider(210)}</div>
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
        <div class="mh-meta"><span>${esc(d.birthText)}</span>${d.tti ? `<span class="mh-dot">|</span><span>${esc(d.tti)}띠</span>` : ''}<span class="mh-dot">|</span><span>일주 <b>${esc(d.ilju)}</b></span></div>
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
    ${d.classic && d.classic.hanja ? `
    <div class="classic">
      <div class="classic-k">✦ 오늘 새길 한 구절 ✦</div>
      <div class="classic-hanja serif">${esc(d.classic.hanja)}</div>
      ${d.classic.eum ? `<div class="classic-eum">${esc(d.classic.eum)}</div>` : ''}
      <div class="classic-meaning serif">“${esc(refine(d.classic.meaning || ''))}”</div>
      ${d.classic.why ? `<div class="classic-why">${esc(refine(d.classic.why))}</div>` : ''}
      ${d.classic.source ? `<div class="classic-source">— ${esc(d.classic.source)}</div>` : ''}
    </div>` : ''}
    <div class="eline serif">“${esc(refine(cfg.closing))}”</div>
    <div class="eorn">${ornDivider(180)}</div>
    <div class="efoot">${esc(cfg.foot)}</div>
    <div class="esign">${esc(d.nickname || '')}님을 위해 · ${esc(d.date || '')}</div>
  </section>


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
      const { paras, chips, textSec, area, phase, cards, ELEM, PRI, SEC, d, domKey, lackKey, domPlain, lackPlain } = b;
      // 휑한 텍스트 섹션 보강 — 드롭캡(총평) + 키워드/적성 칩 밴드(성격·재능)
      const dropcapParas = (t, accent) => {
        const arr = String(t ?? '').split(/\n{2,}|\n/).map(x => x.trim()).filter(Boolean);
        if (!arr.length) return '';
        const f = arr[0];
        const head = `<p class="body lead"><span class="dropcap serif" style="color:${accent}">${esc(f.charAt(0))}</span>${esc(refine(f.slice(1)))}</p>`;
        return head + arr.slice(1).map(x => `<p class="body">${esc(refine(x))}</p>`).join('');
      };
      const chipBand = (label, arr, accent) => (arr && arr.length)
        ? `<div class="chip-band"><div class="chip-band-k" style="color:${accent}">${esc(label)}</div>${chips(arr, accent)}</div>` : '';
      // 한눈에 보기 — 명식 다음 단독 페이지. 일주 히어로 + 한 줄 요약 + 핵심 요약 카드로 페이지를 채운다.
      // (타원형 칩은 한눈에 보기에만 — 본문 섹션에는 쓰지 않는다)
      const keyLine = (d.keywords && d.keywords.length)
        ? `<div class="summary-row"><div class="summary-label">핵심 키워드</div><div class="summary-val">${chips(d.keywords, SEC)}</div></div>` : '';
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
      // 운의 흐름 = '이번 분기' 카드 1개 + 향후 3년 타임라인 (한 페이지에 담긴다)
      const cq = d.currentQuarter || (d.quarters || [])[0] || null;
      const curQuarterCard = cq ? `
        <div class="mrow" style="background:${hexA(PRI, 0.11)};border-left:3px solid ${hexA(PRI, 0.5)}">
          <div class="m-header">
            <span class="m-med serif">季</span>
            <span class="q-title serif">이번 분기 · ${esc(cq.label)}<span class="q-range">${esc(cq.range || '')}</span></span>
            ${cq.theme ? `<span class="m-theme" style="color:${PRI};background:${hexA(PRI, 0.12)};border:1px solid ${hexA(PRI, 0.28)};margin-left:auto">${esc(cq.theme)}</span>` : ''}
          </div>
          <span class="m-text">${esc(refine(cq.text))}</span>
          ${(cq.focus || cq.luckyKeyword) ? `<div class="m-tags">
            ${cq.focus ? `<span class="m-tag" style="color:${PRI}">✦ ${esc(cq.focus)}</span>` : ''}
            ${cq.luckyKeyword ? `<span class="m-tag" style="color:${SEC}">★ ${esc(cq.luckyKeyword)}</span>` : ''}
          </div>` : ''}
        </div>` : '';
      const yearTimeline = `<div class="timeline">${(d.years || []).map(y => `
        <div class="tl-row">
          <div class="tl-axis"><span class="tl-node"${y.mark ? ` style="border-color:${PRI};background:${hexA(PRI, 0.32)};box-shadow:0 0 0 3pt ${hexA(PRI, 0.16)}"` : ''}></span></div>
          <div class="tl-body">
            <div class="tl-label serif">${esc(y.label)}<span class="tl-sub">${esc(y.keyword)}</span>${y.mark ? `<span class="tl-mark">★ ${esc(y.mark)}</span>` : ''}</div>
            <p class="body" style="margin-bottom:0">${esc(refine(y.text))}</p>
          </div>
        </div>`).join('')}</div>`;
      const flow = `${curQuarterCard}<div class="flow-sub serif">향후 3년의 흐름</div>${yearTimeline}`;
      const adviceTips = [['재물', d.wealth], ['애정', d.love], ['직업', d.career], ['건강', d.health]]
        .map(([k, a]) => [k, a && a.tip]).filter(x => x[1]);
      const checklistBox = adviceTips.length ? `
        <div class="checklist"><div class="checklist-k">오늘부터의 실천 체크리스트</div>
          ${adviceTips.map(([k, t]) => `<div class="check-item"><div class="check-box">✓</div><div class="check-text"><span class="check-area">${esc(k)}</span>${esc(refine(t))}</div></div>`).join('')}
        </div>` : '';
      return [
        textSec('', '한눈에 보기', overviewInner, PRI, '覽'),
        textSec('I', '사주 총평', dropcapParas(d.sajuReading, PRI), PRI, '命'),
        textSec('II', '타고난 성격', `${paras(d.personality, true)}${chipBand('성향 키워드', d.keywords, SEC)}`, SEC, '性'),
        textSec('III', '재능과 적성', `${paras(d.talent, true)}${chipBand('어울리는 분야', d.talentFields, PRI)}`, PRI, '才'),
        area('IV', '재물운', d.wealth, ELEM['금'].color, '財'),
        area('V', '애정과 인연', d.love, ELEM['화'].color, '緣'),
        area('VI', '직업과 사회운', d.career, ELEM['목'].color, '職'),
        area('VII', '건강운', d.health, ELEM['수'].color, '健'),
        textSec('VIII', '초년 · 중년 · 말년 인생 흐름', `<div class="timeline">${phase('초년', '태어나서 30대까지', d.lifeEarly)}${phase('중년', '40~60대', d.lifeMid)}${phase('말년', '60대 이후', d.lifeLate)}</div>`, SEC, '流'),
        textSec('IX', `${esc(d.year)}년, 그리고 앞으로의 흐름`, flow, PRI, '運'),
        textSec('X', `${esc(d.nickname)}님을 위한 조언`, `${paras(d.advice, true)}${checklistBox}`, SEC, '言'),
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

      // 케미 지표 — 5축을 점수 미터 + 한 줄로 (막연한 미래 예언 대신 스캔 가능한 진단)
      const ch = d.chemistry || {};
      const CHEM = [['affection', '애정 표현'], ['talk', '대화 호흡'], ['values', '가치관'], ['rhythm', '생활 리듬'], ['recovery', '갈등 회복력']];
      const lvOf = (v) => Math.max(0, Math.min(5, Math.round(Number(v) || 0)));
      const meter = (lv) => `<span class="cmeter">${Array.from({ length: 5 }, (_, i) => `<span class="cdot${i < lv ? ' on' : ''}"></span>`).join('')}</span>`;
      const chemGrade = (lv) => lv >= 5 ? '찰떡' : lv >= 4 ? '좋음' : lv >= 3 ? '무난' : lv >= 2 ? '노력 필요' : '주의';
      const chemistry = `<div class="chem">${CHEM.map(([k, label]) => {
        const c = ch[k] || {}; const lv = lvOf(c.level);
        return `<div class="chem-row">
          <div class="chem-head"><span class="chem-label serif">${label}</span>${meter(lv)}<span class="chem-grade">${chemGrade(lv)}</span></div>
          <p class="chem-text">${esc(refine(c.text || ''))}</p>
        </div>`;
      }).join('')}</div>`;

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
        textSec('VII', '두 사람의 케미 지표',  chemistry,                                        SEC, '診'),
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
      const { paras, chips, textSec, phase, cards, PRI, SEC, d } = b;
      const bt = d.bestTime || {};
      // 한눈에 보기 — 명식 다음 단독 페이지. 두뇌 유형 히어로 + 핵심 요약 카드로 페이지를 채운다.
      // (타원형 칩은 한눈에 보기에만)
      const ovKeyLine = (d.brainKeywords && d.brainKeywords.length)
        ? `<div class="summary-row"><div class="summary-label">핵심 강점</div><div class="summary-val">${chips(d.brainKeywords, SEC)}</div></div>` : '';
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
