/* ================================================================
   천문 — 이메일 HTML 템플릿 (사용자 리포트 / 관리자 알림)
   이메일 클라이언트 호환을 위해 인라인 스타일 + 테이블 레이아웃 사용.
   미리보기 스크립트와 향후 서버리스 발송 함수가 함께 재사용한다.
================================================================ */
import { getReportPalette, reportElems } from './reportTheme.js';

const FONT = `'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',-apple-system,BlinkMacSystemFont,sans-serif`;
// 라이트(프리미엄) 팔레트 — reportTheme.js 단일 소스(PDF와 토큰 통일, 드리프트 제거)
const T = getReportPalette('light');
const GOLD = T.gold, VIOLET = T.violet, PAGE = T.bgCanvas, CARD = T.bgPrimary;
const INK = T.textMain, BODY = T.textBody, DIM = T.textMuted, LINE = T.line;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 오행 색 — reportTheme(라이트=print)로 PDF와 통일
const ELEM = reportElems('light');

const section = (title, bodyHtml, accent = GOLD) => `
  <tr><td style="padding:26px 30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td style="padding-bottom:10px;border-bottom:1px solid ${LINE};">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${accent};vertical-align:middle;margin-right:8px;"></span>
        <span style="font-size:16px;font-weight:700;color:${INK};letter-spacing:-0.01em;">${esc(title)}</span>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:14px 30px 0;font-size:14px;line-height:1.85;color:${BODY};">${bodyHtml}</td></tr>`;

const paras = (text) => String(text ?? '').split(/\n+/).filter(Boolean)
  .map(p => `<p style="margin:0 0 10px;">${esc(p)}</p>`).join('');

/* 사용자에게 가는 프리미엄 리포트 메일 (라이트) */
export function renderUserReportEmail(d) {
  const s = d.saju || {};

  // 명식 네 기둥 (한자 위/아래 + 한글 + 오행 색)
  const pillars = (s.pillars || []);
  const pillarCells = ['년주', '월주', '일주', '시주'].map(k => {
    const pl = pillars.find(x => x.kind === k);
    if (!pl) {
      if (k === '시주') return `<td align="center" width="25%" style="padding:0 3px;"><div style="border:1px solid ${LINE};border-radius:12px;padding:11px 2px;"><div style="font-size:10px;color:${DIM};">시주</div><div style="font-size:20px;color:${DIM};font-family:serif;padding:7px 0;">—</div><div style="font-size:10px;color:${DIM};">시간 미상</div></div></td>`;
      return '';
    }
    const gc = (ELEM[pl.ganElem] || {}).color || INK, jc = (ELEM[pl.jiElem] || {}).color || INK;
    const hl = pl.kind === '일주';
    return `<td align="center" width="25%" style="padding:0 3px;">
      <div style="border:1px solid ${hl ? 'rgba(168,118,42,0.45)' : LINE};border-radius:12px;padding:11px 2px;background:${hl ? 'rgba(168,118,42,0.06)' : '#fff'};">
        <div style="font-size:10px;font-weight:700;color:${INK};">${esc(pl.kind)}</div>
        <div style="font-family:'Noto Serif KR',serif;font-size:24px;font-weight:700;line-height:1.15;padding:6px 0 4px;">
          <span style="color:${gc};">${esc(pl.ganHanja)}</span> <span style="color:${jc};">${esc(pl.jiHanja)}</span>
        </div>
        <div style="font-size:11px;color:${DIM};">${esc(pl.ganji)}</div>
      </div>
    </td>`;
  }).join('');

  const distText = (s.dist || []).map(x => `<span style="color:${(ELEM[x.key] || {}).color};font-weight:700;">${(ELEM[x.key] || {}).plain} ${x.count}</span>`).join('<span style="color:#cfcbd6;"> · </span>');
  const domPlain = (s.dominant || []).map(k => (ELEM[k] || {}).plain).join('·');
  const lackPlain = (s.lacking || []).map(k => (ELEM[k] || {}).plain).join('·');

  const myungsikBlock = pillars.length ? `
    <tr><td style="padding:8px 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${pillarCells}</tr></table>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:${BODY};">오행 분포 &nbsp; ${distText}</div>
      <div style="text-align:center;margin-top:6px;font-size:12px;color:${DIM};">가장 강한 기운 <b style="color:${INK};">${esc(domPlain || '고른 편')}</b>${lackPlain ? ` · 부족한 기운 <b style="color:${INK};">${esc(lackPlain)}</b>` : ''}</div>
    </td></tr>` : '';

  const chips = (arr, accent) => (arr && arr.length) ? `<div style="margin:2px 0 12px;">${arr.map(k => `<span style="display:inline-block;font-size:12px;font-weight:500;color:${accent};border:1px solid ${accent}55;background:${accent}12;border-radius:999px;padding:4px 11px;margin:0 6px 6px 0;">${esc(k)}</span>`).join('')}</div>` : '';

  // 분야별 핵심 한 줄
  const areaItem = (label, a, color) => {
    a = a || {};
    if (!a.highlight && !a.text) return '';
    return `<tr>
      <td width="64" style="padding:9px 0;vertical-align:top;"><span style="font-size:13px;font-weight:700;color:${color};">${label}</span></td>
      <td style="padding:9px 0 9px 12px;font-size:13px;line-height:1.7;color:${BODY};border-bottom:1px solid ${LINE};">${esc(a.highlight || String(a.text).split(/(?<=[.!?])\s/)[0])}</td>
    </tr>`;
  };
  const areasBlock = (d.wealth || d.love || d.career || d.health) ? `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${areaItem('재물운', d.wealth, '#5b7186')}${areaItem('애정과 인연', d.love, '#d6536d')}${areaItem('직업·사회', d.career, '#2f9e6b')}${areaItem('건강운', d.health, '#5a5fd0')}
    </table>` : '';

  const months = (d.months || []).map(m => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${LINE};width:40px;vertical-align:top;">
        <span style="font-size:13px;font-weight:700;color:${GOLD};">${esc(m.label)}</span>
      </td>
      ${m.theme ? `<td style="padding:9px 0;border-bottom:1px solid ${LINE};width:62px;vertical-align:top;"><span style="font-size:10px;font-weight:700;color:${VIOLET};background:${VIOLET}14;border-radius:5px;padding:2px 7px;">${esc(m.theme)}</span></td>` : ''}
      <td style="padding:9px 0 9px 10px;border-bottom:1px solid ${LINE};font-size:12.5px;line-height:1.65;color:${BODY};">${esc(m.text)}</td>
    </tr>`).join('');

  const lifeRow = (label, text) => `
    <tr>
      <td style="padding:8px 0;width:60px;vertical-align:top;"><span style="font-size:13px;font-weight:700;color:${VIOLET};">${esc(label)}</span></td>
      <td style="padding:8px 0 8px 12px;font-size:13px;line-height:1.7;color:${BODY};">${esc(text)}</td>
    </tr>`;

  // 향후 5년 (years 배열 우선, 없으면 next5years 문자열)
  const yearsBlock = (d.years && d.years.length)
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${d.years.map(y => `
        <tr>
          <td width="52" style="padding:9px 0;vertical-align:top;"><span style="font-size:14px;font-weight:700;color:${GOLD};font-family:'Noto Serif KR',serif;">${esc(y.label)}</span></td>
          <td style="padding:9px 0 9px 12px;border-bottom:1px solid ${LINE};font-size:13px;line-height:1.7;color:${BODY};">${y.keyword ? `<b style="color:${INK};">${esc(y.keyword)}</b> · ` : ''}${esc(y.text)}</td>
        </tr>`).join('')}</table>`
    : paras(d.next5years);

  // CTA — 호스팅된 리포트/PDF 링크가 있을 때만 노출(죽은 링크 방지). 토큰 기반 잉크 버튼.
  const cta = d.ctaUrl ? `
      <tr><td style="padding:10px 30px 2px;text-align:center;">
        <a href="${esc(d.ctaUrl)}" style="display:inline-block;background:${T.ctaBg};color:${T.ctaText};text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.02em;padding:14px 32px;border-radius:999px;border:1px solid ${T.ctaRing};box-shadow:${T.shadowHi};">전체 리포트 PDF 열기 →</a>
      </td></tr>` : '';

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${PAGE};word-break:keep-all;overflow-wrap:break-word;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(d.nickname)}님의 시그니처 사주 리포트가 도착했어요.&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PAGE};padding:24px 0;word-break:keep-all;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:92%;background:${CARD};border-radius:20px;overflow:hidden;border:1px solid ${LINE};font-family:${FONT};">

      <!-- 헤더 -->
      <tr><td style="padding:40px 30px 26px;text-align:center;background:linear-gradient(160deg,#faf6ee,#ffffff);">
        <div style="font-size:11px;letter-spacing:0.5em;color:${VIOLET};font-weight:700;">SIGNATURE REPORT</div>
        <div style="font-size:46px;font-weight:900;color:${INK};letter-spacing:0.3em;margin:10px 0 6px;">天文</div>
        <div style="width:48px;height:1px;background:${GOLD};margin:8px auto;"></div>
        <div style="font-size:14px;color:${DIM};">시그니처 사주 리포트</div>
      </td></tr>

      <!-- 인사 -->
      <tr><td style="padding:26px 30px 14px;text-align:center;">
        <p style="margin:0 0 12px;font-size:16px;color:${INK};line-height:1.7;">${esc(d.nickname)}님, 하늘의 문장이 도착했어요.</p>
        <span style="display:inline-block;font-size:13px;color:${DIM};border:1px solid ${LINE};border-radius:999px;padding:7px 15px;">
          ${esc(d.birthText)}${d.tti ? ` · ${esc(d.tti)}띠` : ''} · 일주 <b style="color:${INK};">${esc(d.ilju)}</b>
        </span>
      </td></tr>

      ${myungsikBlock}

      ${section('사주 총평', paras(d.sajuReading || d.sajuOverview))}
      ${section('타고난 성격과 재능', `${chips(d.keywords, VIOLET)}${paras([d.personality, d.talent].filter(Boolean).join('\n\n'))}`, VIOLET)}
      ${areasBlock ? section('재물 · 애정 · 직업 · 건강', areasBlock, GOLD) : ''}
      ${section(`${esc(d.year)}년 월별 운세`, `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${months}</table>`)}
      ${section('초년 · 중년 · 말년 인생 흐름', `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${lifeRow('초년', d.lifeEarly)}${lifeRow('중년', d.lifeMid)}${lifeRow('말년', d.lifeLate)}</table>`, VIOLET)}
      ${section('향후 5년 운세', yearsBlock)}
      ${section(esc(d.nickname) + '님을 위한 조언', paras(d.advice), VIOLET)}
      ${cta}

      <!-- 클로징 -->
      <tr><td style="padding:30px;text-align:center;">
        <p style="margin:0;font-size:14px;font-style:italic;color:${BODY};line-height:1.8;">"${esc(d.closing)}"</p>
      </td></tr>

      <!-- 푸터 -->
      <tr><td style="padding:22px 30px;text-align:center;background:#faf6ee;border-top:1px solid ${LINE};">
        <div style="font-size:12px;letter-spacing:0.3em;color:${DIM};">天文 AI · 한국형 정밀 운세 리포트</div>
        <div style="font-size:11px;color:#b0adb8;margin-top:6px;">본 메일은 발신 전용입니다 · 전체 리포트는 첨부된 PDF에서 보실 수 있어요</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/* 표지 전용 메일 — 본문(전체 내용)은 첨부 PDF로, 메일에는 표지 + 안내만.
   word-break:keep-all 전역 적용으로 한국어 단어가 음절 중간에서 끊기지 않게 한다.
   설계: ① 프리헤더(받은편지함 미리보기) ② 일관된 수직 리듬·구역 분리
        ③ '담긴 내용'을 2열 체크리스트로 스캔 가능하게 ④ 모바일 미디어쿼리. */
export function renderCoverEmail(d) {
  const meta = `${esc(d.birthText)}${d.tti ? ` · ${esc(d.tti)}띠` : ''} · 일주 ${esc(d.ilju)}`;
  const preheader = `${esc(d.nickname)}님의 시그니처 사주 리포트가 도착했어요 — 전체 내용은 첨부된 PDF에 담겨 있습니다.`;

  // 담긴 내용 — 2열 체크리스트(스캔성↑). [제목, 보조설명]
  const contents = [
    ['사주 명식', '네 기둥 · 오행 분포'],
    ['타고난 성격과 재능', null],
    ['재물운', null],
    ['애정과 인연', null],
    ['직업과 사회운', null],
    ['건강운', null],
    ['월별 운세', '한 해의 결'],
    ['인생의 흐름', '초년 · 중년 · 말년'],
    ['향후 5년', null],
  ];
  const cell = (it) => it ? `<td class="cm-col" valign="top" width="50%" style="padding:9px 6px;">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td valign="top" style="padding:1px 10px 0 0;"><span style="font-size:14px;font-weight:700;color:${GOLD};">✓</span></td>
          <td style="font-size:15px;line-height:1.5;color:${INK};font-weight:600;">${esc(it[0])}${it[1] ? `<br><span style="font-size:12px;color:${DIM};font-weight:400;line-height:1.5;">${esc(it[1])}</span>` : ''}</td>
        </tr></table></td>` : `<td class="cm-col" width="50%"></td>`;
  let checklist = '';
  for (let i = 0; i < contents.length; i += 2) checklist += `<tr>${cell(contents[i])}${cell(contents[i + 1])}</tr>`;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<style>
  @media only screen and (max-width:480px){
    .cm-card{ width:100% !important; max-width:100% !important; border-radius:0 !important; }
    .cm-cover{ padding:44px 22px 36px !important; }
    .cm-word{ font-size:48px !important; }
    .cm-pad{ padding-left:22px !important; padding-right:22px !important; }
    .cm-col{ display:block !important; width:100% !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:${PAGE};word-break:keep-all;overflow-wrap:break-word;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PAGE};padding:28px 0;word-break:keep-all;">
  <tr><td align="center">
    <table class="cm-card" width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:92%;background:${CARD};border-radius:20px;overflow:hidden;border:1px solid ${LINE};box-shadow:${T.shadowHi};font-family:${FONT};word-break:keep-all;">

      <!-- 표지 (PDF 표지와 동일 무드) -->
      <tr><td class="cm-cover" style="padding:56px 30px 46px;text-align:center;background:linear-gradient(160deg,#faf6ee,#ffffff);border-bottom:1px solid ${LINE};">
        <div style="font-size:12px;letter-spacing:0.5em;color:${VIOLET};font-weight:700;">SIGNATURE REPORT</div>
        <div class="cm-word" style="font-size:60px;font-weight:900;color:${INK};letter-spacing:0.22em;margin:18px 0 0;">天文</div>
        <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="margin:16px auto 14px;"><tr>
          <td style="width:54px;height:1px;background:${LINE};font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding:0 12px;font-size:15px;color:${GOLD};line-height:1;">✦</td>
          <td style="width:54px;height:1px;background:${LINE};font-size:0;line-height:0;">&nbsp;</td>
        </tr></table>
        <div style="font-size:16px;font-weight:700;color:${INK};letter-spacing:0.08em;">시그니처 사주 리포트</div>
        <div style="font-size:12px;color:${DIM};letter-spacing:0.18em;margin-top:22px;">天文 AI · ${esc(d.date || '')}</div>
      </td></tr>

      <!-- 받는 분 (Hook) -->
      <tr><td class="cm-pad" style="padding:36px 36px 0;text-align:center;word-break:keep-all;">
        <p style="margin:0 0 16px;font-size:18px;color:${INK};line-height:1.6;">${esc(d.nickname)}님, 하늘의 문장이 도착했어요.</p>
        <span style="display:inline-block;font-size:13px;color:${DIM};border:1px solid ${LINE};border-radius:999px;padding:9px 18px;">${meta}</span>
      </td></tr>

      <!-- PDF 안내 + 담긴 내용 체크리스트 (Key Insights / Highlight Box) -->
      <tr><td class="cm-pad" style="padding:28px 36px 0;word-break:keep-all;">
        <div style="background:#faf7f2;border:1px solid ${LINE};border-radius:16px;padding:26px 24px;">
          <div style="text-align:center;">
            <span style="display:inline-block;font-size:22px;line-height:1;vertical-align:middle;margin-right:8px;">📎</span>
            <span style="font-size:16px;font-weight:700;color:${INK};vertical-align:middle;">전체 리포트는 첨부 PDF에 담겨 있어요</span>
          </div>
          <div style="text-align:center;font-size:13px;color:${DIM};line-height:1.6;margin:9px 0 18px;">아래 9개 영역을 깊이 있게 풀어냈습니다</div>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid ${LINE};padding-top:8px;">${checklist}</table>
        </div>
      </td></tr>

      <!-- 클로징 (Closing) -->
      <tr><td class="cm-pad" style="padding:30px 42px 8px;text-align:center;word-break:keep-all;">
        <p style="margin:0;font-size:16px;font-style:italic;color:${BODY};line-height:1.8;">"${esc(d.closing)}"</p>
      </td></tr>

      <!-- 푸터 -->
      <tr><td class="cm-pad" style="padding:24px 30px;text-align:center;background:#faf6ee;border-top:1px solid ${LINE};">
        <div style="font-size:12px;letter-spacing:0.3em;color:${DIM};">天文 AI · 한국형 정밀 운세 리포트</div>
        <div style="font-size:11px;color:#b0adb8;margin-top:6px;">본 메일은 발신 전용입니다 · 전체 리포트는 첨부 PDF에서 보실 수 있어요</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/* 사용자에게 가는 학습 상세 리포트 메일 (에메랄드 테마) */
export function renderStudyReportEmail(d) {
  const EMER = '#0f9d6b';
  const chips = (arr) => (arr && arr.length) ? `<div style="margin:2px 0 12px;">${arr.map(k => `<span style="display:inline-block;font-size:12px;font-weight:500;color:${EMER};border:1px solid ${EMER}55;background:${EMER}12;border-radius:999px;padding:4px 11px;margin:0 6px 6px 0;">${esc(k)}</span>`).join('')}</div>` : '';
  const bt = d.bestTime || {};
  const timeRow = (label, text) => text ? `<tr>
      <td width="56" style="padding:8px 0;vertical-align:top;"><span style="font-size:13px;font-weight:700;color:${EMER};">${esc(label)}</span></td>
      <td style="padding:8px 0 8px 12px;border-bottom:1px solid ${LINE};font-size:13px;line-height:1.7;color:${BODY};">${esc(text)}</td>
    </tr>` : '';
  const ex = d.examStrategy || {};
  const examRow = (label, text) => text ? `<tr>
      <td width="76" style="padding:9px 0;vertical-align:top;"><span style="font-size:12px;font-weight:700;color:#fff;background:${EMER};border-radius:6px;padding:3px 9px;">${esc(label)}</span></td>
      <td style="padding:9px 0 9px 12px;border-bottom:1px solid ${LINE};font-size:13px;line-height:1.7;color:${BODY};">${esc(text)}</td>
    </tr>` : '';

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${PAGE};word-break:keep-all;overflow-wrap:break-word;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(d.nickname)}님의 학습 상세 리포트가 도착했어요.&#8203;&zwnj;&nbsp;&#8203;&zwnj;&nbsp;</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PAGE};padding:24px 0;word-break:keep-all;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:92%;background:${CARD};border-radius:20px;overflow:hidden;border:1px solid ${LINE};font-family:${FONT};">

      <!-- 헤더 -->
      <tr><td style="padding:40px 30px 26px;text-align:center;background:linear-gradient(160deg,#eefaf4,#ffffff);">
        <div style="font-size:11px;letter-spacing:0.5em;color:${EMER};font-weight:700;">STUDY REPORT</div>
        <div style="font-size:46px;font-weight:900;color:${INK};letter-spacing:0.3em;margin:10px 0 6px;">天文</div>
        <div style="width:48px;height:1px;background:${EMER};margin:8px auto;"></div>
        <div style="font-size:14px;color:${DIM};">학습 상세 리포트</div>
      </td></tr>

      <!-- 인사 -->
      <tr><td style="padding:26px 30px 14px;text-align:center;">
        <p style="margin:0 0 12px;font-size:16px;color:${INK};line-height:1.7;">${esc(d.nickname)}님의 학습 기질을 사주로 읽어드려요.</p>
        <span style="display:inline-block;font-size:13px;color:${DIM};border:1px solid ${LINE};border-radius:999px;padding:7px 15px;">
          ${esc(d.birthText)}${d.tti ? ` · ${esc(d.tti)}띠` : ''} · 일주 <b style="color:${INK};">${esc(d.ilju)}</b>
        </span>
      </td></tr>

      ${section('타고난 두뇌 유형', `${d.brainType ? `<div style="text-align:center;margin-bottom:12px;"><span style="font-size:22px;font-weight:800;color:${EMER};font-family:'Noto Serif KR',serif;">${esc(d.brainType)}</span></div>` : ''}${chips(d.brainKeywords)}${paras(d.brainTypeDesc)}`, EMER)}
      ${section('잘 맞는 과목 · 적성', `${chips(d.subjectList)}${paras(d.subjectStrengths)}`, EMER)}
      ${section('최적 공부법', paras(d.studyMethod), EMER)}
      ${(bt.morning || bt.afternoon || bt.evening) ? section('집중이 잘 되는 시간대', `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${timeRow('오전', bt.morning)}${timeRow('오후', bt.afternoon)}${timeRow('저녁', bt.evening)}</table>`, EMER) : ''}
      ${section('학습 환경', paras(d.environment), EMER)}
      ${section('기억력 강화 & 슬럼프 극복', `${paras(d.memoryTips)}${d.slumpRecovery ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed ${LINE};">${paras(d.slumpRecovery)}</div>` : ''}`, EMER)}
      ${section('이번 시기 학습 에너지', paras(d.monthlyEnergy), EMER)}
      ${(ex.d100 || ex.d60 || ex.d30 || ex.d7) ? section('시험 단계별 전략', `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${examRow('D-100↑', ex.d100)}${examRow('D-60', ex.d60)}${examRow('D-30', ex.d30)}${examRow('D-7', ex.d7)}</table>`, EMER) : ''}
      ${section(esc(d.nickname) + '님을 위한 응원', paras(d.finalAdvice), EMER)}

      <!-- 클로징 -->
      <tr><td style="padding:30px;text-align:center;">
        <p style="margin:0;font-size:14px;font-style:italic;color:${BODY};line-height:1.8;">"${esc(d.closingQuote)}"</p>
      </td></tr>

      <!-- 푸터 -->
      <tr><td style="padding:22px 30px;text-align:center;background:#eefaf4;border-top:1px solid ${LINE};">
        <div style="font-size:12px;letter-spacing:0.3em;color:${DIM};">天文 AI · 학습 상세 리포트</div>
        <div style="font-size:11px;color:#b0adb8;margin-top:6px;">본 메일은 발신 전용입니다</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/* 관리자에게 가는 신청 알림 메일 */
export function renderAdminEmail(d) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f4f7;font-family:${FONT};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px 0;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="width:520px;max-width:92%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e5ea;">
      <tr><td style="padding:20px 24px;background:#15131f;color:#fff;font-size:15px;font-weight:700;">📜 천문 — 새 리포트 신청</td></tr>
      <tr><td style="padding:22px 24px;font-size:14px;color:#1c1c22;line-height:1.9;">
        <b>이메일</b> ${esc(d.email)}<br>
        <b>닉네임</b> ${esc(d.nickname)}<br>
        <b>생년월일</b> ${esc(d.birthText)} (일주 ${esc(d.ilju)})<br>
        <b>모드</b> ${esc(d.mode)}<br>
        <b>신청 시각</b> ${esc(d.at)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
