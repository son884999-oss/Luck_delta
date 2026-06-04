/* ================================================================
   천문 — 시그니처 리포트 디자인 토큰 (Single Source of Truth)
   라이트(인쇄·메일용 흰/아이보리) · 다크(화면용 네이비) 듀얼 테마.
   PDF(reportPdf.js)와 메일(emailTemplate.js)이 같은 토큰을 소비해
   두 산출물의 팔레트 드리프트를 제거한다.

   모든 구조 텍스트·브랜드 토큰은 WCAG 대비비 검증을 통과(대부분 AAA).
   오행(element) 색은 '대형 표시/그래픽' 액세서리 — 큰 글자(≥24px)·막대
   채움·번호에만 쓰고 작은 본문 텍스트에는 쓰지 않는다(라이트에서 소형
   본문 사용 시 AA 미달). 자세한 규칙은 SIGNATURE_REPORT_DESIGN.md 참조.
================================================================ */
import { OHAENG } from './saju.js';

const hexA = (hex, a) => {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ── 시맨틱 디자인 토큰 ────────────────────────────────────────
   doc 토큰명 → JS 키
   color-bg-canvas   → bgCanvas   (바깥 매트 / 메일 배경)
   color-bg-primary  → bgPrimary  (주 읽기 표면 / 종이)
   color-bg-surface  → bgSurface  (카드 채움)
   color-bg-highlight→ bgHighlight(일주·강조 카드 채움)
   color-text-main   → textMain   (제목·키)
   color-text-body   → textBody   (본문 단락)
   color-text-muted  → textMuted  (캡션·메타)
   color-brand-gold  → gold       (시그니처 1차 강조·텍스트 안전)
   color-brand-violet→ violet     (2차 강조)
   color-line        → line       (헤어라인·테두리)
   color-logo        → logo / logoShadow
   color-cta-bg / color-cta-text / color-cta-ring → CTA 버튼
*/
export const REPORT_TOKENS = {
  light: {
    bgCanvas: '#f1ede4',     // 따뜻한 아이보리 매트
    bgPrimary: '#ffffff',    // 흰 종이 — text-main 16.5:1 (AAA)
    bgSurface: '#fbfaf8',
    bgHighlight: hexA('#9a6a24', 0.06),
    textMain: '#211d2b',     // 16.47:1 AAA
    textBody: '#474350',     // 9.60:1 AAA
    textMuted: '#6f6b7d',    // 5.15:1 AA (캡션 소형 가독)
    gold: '#9a6a24',         // 4.71:1 AA(텍스트)·대형 AAA
    violet: '#6741c9',       // 6.61:1 AA
    line: 'rgba(0,0,0,0.09)',
    logo: '#211d2b',
    logoShadow: 'none',
    ctaBg: '#211d2b',        // 잉크 버튼(흰 글자 16.5:1)
    ctaText: '#ffffff',
    ctaRing: '#9a6a24',
    shadowHi: '0 6px 22px rgba(154,106,36,0.12)',
  },
  dark: {
    bgCanvas: '#070b16',
    bgPrimary: '#0b1020',    // 딥 네이비 — text-main 17:1 (AAA)
    bgSurface: 'rgba(255,255,255,0.045)',
    bgHighlight: hexA('#e7b94f', 0.10),
    textMain: '#F4F2FB',     // 17.08:1 AAA
    textBody: '#D9D6EA',     // 13.30:1 AAA
    textMuted: '#A7A3BE',    // 7.78:1 AAA
    gold: '#e7b94f',         // 10.32:1 AAA
    violet: '#b39cf8',       // 8.14:1 AAA
    line: 'rgba(255,255,255,0.10)',
    logo: '#ffffff',
    logoShadow: '0 0 40px rgba(167,139,250,0.40)',
    ctaBg: 'linear-gradient(135deg,#e7b94f,#c9a24b)',
    ctaText: '#1a1205',      // 잉크 on 골드 10.1:1 AAA
    ctaRing: 'rgba(231,185,79,0.5)',
    shadowHi: '0 6px 22px rgba(231,185,79,0.18)',
  },
};

/* 오행 색 — 테마별로 자동 선택: 라이트=print(흰 배경용 진한색), 다크=color(네이비용 밝은색).
   plain/hanja는 saju.js OHAENG 단일 소스에서 파생. */
export function reportElems(theme = 'light') {
  const pick = theme === 'dark' ? 'color' : 'print';
  return Object.fromEntries(
    Object.entries(OHAENG).map(([k, v]) => [k, { plain: v.plain, hanja: v.hanja, color: v[pick] }])
  );
}

/* reportPdf.js 호환 팔레트 키(pageBg/ink/body/dim/gold/violet/logo/logoShadow/hair/card)로 변환 */
export function getReportPalette(theme = 'light') {
  const t = REPORT_TOKENS[theme] || REPORT_TOKENS.light;
  return {
    ...t,
    // 레거시 별칭 (reportPdf 기존 변수명과 1:1)
    pageBg: t.bgPrimary,
    ink: t.textMain,
    body: t.textBody,
    dim: t.textMuted,
    hair: t.line,
    card: t.bgSurface,
  };
}

export { hexA };
