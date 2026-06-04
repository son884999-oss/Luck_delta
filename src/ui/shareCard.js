/* ================================================================
   천문 — 공유 이미지 카드 (캔버스 렌더 → JPEG/PNG Blob)
   결과(점수/사주카드/타로)를 SNS 공유용 세로 카드(1080×1350)로.
   저작권 무관(전부 직접 그림) · 폰트는 웹폰트 로드 후 그린다.

   [별자리 만다라 통일]
   sajuCardArt와 같은 시각 언어 — 결과를 시드로 사람마다/결과마다 고유한
   성운·별자리·꽃잎 만다라를 배경에 절차적으로 그린다(결정적: 같은 결과=같은 그림).
   메인 키워드(점수/제목)와 한 줄만 텍스트로 두고 나머지 여백은 전부 시각 요소.

   navigator.share({files}) 미지원 환경은 shareImage가 다운로드로 폴백.
================================================================ */
import { OHAENG, OHAENG_ORDER } from '../lib/saju.js';

const W = 1080, H = 1350;
const CX = W / 2;          // 중앙 정렬 기준
const ART_CY = 430;        // 성운·별자리·만다라·점수링의 공통 중심

// accent 색 → 가장 가까운 오행 추론(호출부가 element를 안 넘길 때 폴백)
function nearestElement(accent) {
  const t = rgb(accent);
  let best = '토', bestD = Infinity;
  for (const k of OHAENG_ORDER) {
    const c = rgb(OHAENG[k].color);
    const d = (t[0] - c[0]) ** 2 + (t[1] - c[1]) ** 2 + (t[2] - c[2]) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}
function rgb(hex) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* 문자열 → 32bit 시드 해시 (결정적) */
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || '천문');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/* mulberry32 — 시드 기반 결정적 난수 [0,1) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 한국어 공백 단위 줄바꿈 (어절 보존)
function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildShareCard({ headline, score = null, sub = '', ilju = '', accent = '#a78bfa', tags = [], element = null, seed = null, format = 'image/jpeg', quality = 0.92 }) {
  // 웹폰트 로드 보장 (없으면 시스템 폰트로 폴백)
  try {
    await Promise.all([
      document.fonts.load('900 120px "Noto Serif KR"'),
      document.fonts.load('700 44px "Noto Sans KR"'),
      document.fonts.load('500 40px "Noto Sans KR"'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* 폰트 로드 실패 시 기본 폰트로 진행 */ }

  // 결과를 시드로 — 같은 결과는 항상 같은 별자리/만다라(결정적)
  const rand = rng(hashSeed(seed ?? `${headline}|${ilju}|${sub}|${score}`));
  const el = element || nearestElement(accent);   // 오행(질감 변주의 기준)

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  drawBackdrop(ctx, accent);          // 밤하늘 + 성운 글로우
  drawElementTexture(ctx, el, accent, rand); // 오행 고유 질감(火 불티 / 水 물결 / 木 잎맥 / 金 광택 / 土 지층)
  drawStardust(ctx, accent, rand);    // 흩뿌려진 별가루(시드)
  drawOrbits(ctx);                    // 궤도 링
  drawConstellation(ctx, accent, rand); // 고유 별자리(텍스트 뒤 배경)
  drawMandala(ctx, accent, rand);     // 꽃잎 만다라(중심 뒤)
  drawCorners(ctx, accent, rand);     // 네 모서리 문양
  drawFrames(ctx);                    // 더블 헤어라인 프레임

  ctx.textAlign = 'center';

  // 브랜드
  ctx.fillStyle = accent; ctx.font = '700 28px "Noto Sans KR", sans-serif';
  ctx.fillText('天 文   ·   AI 명리학 운세', CX, 150);

  if (typeof score === 'number') {
    drawScoreRing(ctx, accent, Math.max(0, Math.min(100, score)));
    ctx.fillStyle = '#fff'; ctx.font = '900 150px "Noto Serif KR", serif';
    ctx.shadowColor = hexA(accent, 0.7); ctx.shadowBlur = 28;
    ctx.fillText(String(score), CX, ART_CY + 52);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '700 26px "Noto Sans KR", sans-serif';
    ctx.fillText('SCORE', CX, ART_CY + 108);
  } else {
    // 타이틀(사주카드/타로/식탁 등) — 중심 글로우 위에 얹는다
    const core = ctx.createRadialGradient(CX, ART_CY, 0, CX, ART_CY, 220);
    core.addColorStop(0, hexA(accent, 0.30)); core.addColorStop(1, 'transparent');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(CX, ART_CY, 220, 0, Math.PI * 2); ctx.fill();
    if (ilju) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 30px "Noto Sans KR", sans-serif';
      ctx.fillText(`일주 ${ilju}`, CX, ART_CY - 110);
    }
    ctx.fillStyle = '#fff'; ctx.font = '900 96px "Noto Serif KR", serif';
    ctx.shadowColor = hexA(accent, 0.6); ctx.shadowBlur = 24;
    wrapLines(ctx, headline, W - 240).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, CX, ART_CY + 30 + i * 110));
    ctx.shadowBlur = 0;
  }

  // 구분 장식 — 작은 다이아몬드 한 줄
  drawDivider(ctx, accent, 640);

  // 한 줄(oneliner/quote)
  if (sub) {
    ctx.fillStyle = 'rgba(240,238,250,0.92)'; ctx.font = '500 46px "Noto Serif KR", serif';
    const lines = wrapLines(ctx, `“${sub}”`, W - 200);
    const startY = 740;
    lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, CX, startY + i * 70));
  }

  // 일주 (점수 모드일 때 하단에)
  if (typeof score === 'number' && ilju) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '500 32px "Noto Sans KR", sans-serif';
    ctx.fillText(`일주 ${ilju}`, CX, 1080);
  }

  // 해시태그 — 알약 칩으로
  if (tags && tags.length) drawTagChips(ctx, accent, tags.slice(0, 3), 1170);

  // 푸터
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '700 26px "Noto Sans KR", sans-serif';
  ctx.fillText('천문에서 내 운세 보기  ✦', CX, H - 90);

  // 배경이 완전 불투명이라 JPEG가 안전 — PNG 대비 4~6배 작아 공유/업로드가 빠르다.
  return await new Promise(resolve => canvas.toBlob(resolve, format, quality));
}

/* ─────────────────────────  레이어별 드로잉  ───────────────────────── */

function drawBackdrop(ctx, accent) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#120e26'); bg.addColorStop(0.55, '#0c0a1c'); bg.addColorStop(1, '#070611');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 오행 색 성운(nebula)
  const neb = ctx.createRadialGradient(CX, ART_CY, 0, CX, ART_CY, 620);
  neb.addColorStop(0, hexA(accent, 0.30)); neb.addColorStop(0.42, hexA(accent, 0.10)); neb.addColorStop(1, 'transparent');
  ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
}

function drawStardust(ctx, accent, rand) {
  for (let i = 0; i < 220; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 1.8 + 0.2;
    ctx.globalAlpha = rand() * 0.6 + 0.06;
    ctx.fillStyle = rand() > 0.78 ? accent : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* 오행별 고유 질감 — 같은 색이라도 결마다 다르게 보이도록 배경에 은은히 깐다.
   전부 alpha 낮게(텍스트/중심 가독성 보호) · 시드 기반(결정적). */
function drawElementTexture(ctx, el, accent, rand) {
  ctx.save();
  switch (el) {
    case '화': { // 火 — 아래에서 떠오르는 불티/잔불
      for (let i = 0; i < 90; i++) {
        const x = rand() * W;
        const y = H - rand() * rand() * H;          // 하단에 밀집(상승하는 느낌)
        const r = rand() * 3 + 0.6;
        ctx.globalAlpha = (1 - y / H) * 0.5 + 0.05;
        ctx.fillStyle = rand() > 0.5 ? accent : '#ffd27a';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case '수': { // 水 — 흐르는 물결/달빛 사인파
      ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4;
      for (let row = 0; row < 7; row++) {
        const baseY = 120 + row * 170, amp = 14 + rand() * 26, ph = rand() * Math.PI * 2;
        ctx.strokeStyle = hexA(accent, 0.10 + rand() * 0.06);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = baseY + Math.sin(x / 90 + ph) * amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case '목': { // 木 — 중심에서 뻗는 잎맥/덩굴
      ctx.translate(CX, ART_CY);
      const branches = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < branches; i++) {
        const a = rand() * Math.PI * 2, len = 300 + rand() * 240;
        ctx.strokeStyle = hexA(accent, 0.16); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a + 0.4) * len * 0.5, Math.sin(a + 0.4) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
        // 잔가지
        for (let j = 1; j <= 3; j++) {
          const t = j / 4, bx = Math.cos(a) * len * t, by = Math.sin(a) * len * t, bl = 40 + rand() * 50;
          const ba = a + (rand() > 0.5 ? 0.6 : -0.6);
          ctx.strokeStyle = hexA(accent, 0.11); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl); ctx.stroke();
        }
      }
      break;
    }
    case '금': { // 金 — 사선으로 가르는 금속 광택 빛줄기
      ctx.translate(CX, H / 2);
      ctx.rotate(-Math.PI / 5);
      for (let i = 0; i < 9; i++) {
        const x = -W + i * (W * 1.6 / 9) + rand() * 40;
        const g = ctx.createLinearGradient(x, -H, x, H);
        g.addColorStop(0, 'transparent'); g.addColorStop(0.5, hexA(accent, 0.10 + rand() * 0.06)); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(x, -H, 2 + rand() * 3, H * 2);
      }
      break;
    }
    default: { // 土 — 쌓인 지층 띠 + 모래 입자
      for (let i = 0; i < 6; i++) {
        const y = 200 + i * 180 + (rand() - 0.5) * 40;
        const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
        g.addColorStop(0, 'transparent'); g.addColorStop(0.5, hexA(accent, 0.07 + rand() * 0.04)); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(0, y - 30, W, 60);
      }
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = hexA(accent, rand() * 0.3);
        ctx.fillRect(rand() * W, rand() * H, 2, 2);
      }
    }
  }
  ctx.restore();
}

function drawOrbits(ctx) {
  ctx.lineWidth = 1.2;
  [460, 350, 240].forEach((r, i) => {
    ctx.strokeStyle = hexA('#ffffff', 0.05 + i * 0.012);
    ctx.beginPath(); ctx.arc(CX, ART_CY, r, 0, Math.PI * 2); ctx.stroke();
  });
}

// 점수링/제목 뒤로 깔리는 고유 별자리 — 중앙 안전지대(SAFE)를 비워 키워드 가독성 보호.
// 별은 항상 링 바깥쪽 고리(baseR 이상)에만 배치하고, 연결선/별빛은 어둡게 깐다.
function drawConstellation(ctx, accent, rand) {
  const SAFE = 210;                          // 이 반경 안에는 별을 두지 않음(점수링 R=150·제목 영역)
  const n = 6 + Math.floor(rand() * 4);      // 6~9개
  const baseR = 360, start = rand() * Math.PI * 2;
  const stars = [];
  for (let i = 0; i < n; i++) {
    const ang = start + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const rr = Math.max(SAFE + 30, baseR * (0.78 + rand() * 0.42));
    stars.push({ x: CX + Math.cos(ang) * rr, y: ART_CY + Math.sin(ang) * rr, m: rand() * 3.5 + 2 });
  }
  // 연결선: 중앙 안전지대를 가로지르는 구간은 건너뛴다(텍스트 위 겹침 방지)
  ctx.strokeStyle = hexA(accent, 0.28); ctx.lineWidth = 1.3;
  for (let i = 0; i < stars.length; i++) {
    const a = stars[i], b = stars[(i + 1) % stars.length];
    if (segDistToCenter(a, b) < SAFE) continue;   // 중앙을 침범하는 변은 생략
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // 별빛: 뒤로 깔리도록 어둡게
  stars.forEach(s => {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.m * 3.2);
    g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.4, hexA(accent, 0.7)); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.m * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.m * 0.6, 0, Math.PI * 2); ctx.fill();
  });
}

// 선분(a–b)과 중앙(CX,ART_CY) 사이 최단거리 — 중앙 침범 변 판별용
function segDistToCenter(a, b) {
  const px = CX - a.x, py = ART_CY - a.y, dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = (px * dx + py * dy) / len2; t = Math.max(0, Math.min(1, t));
  const ex = a.x + t * dx - CX, ey = a.y + t * dy - ART_CY;
  return Math.hypot(ex, ey);
}

// 중심을 감싸는 꽃잎 만다라 — 점수/제목 바로 뒤, 은은하게
function drawMandala(ctx, accent, rand) {
  const petals = 10 + Math.floor(rand() * 7);   // 10~16
  const petalR = 190, rot = rand() * Math.PI;
  ctx.save(); ctx.translate(CX, ART_CY); ctx.rotate(rot);
  for (let i = 0; i < petals; i++) {
    ctx.rotate((Math.PI * 2) / petals);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(petalR * 0.42, -petalR * 0.5, 0, -petalR);
    ctx.quadraticCurveTo(-petalR * 0.42, -petalR * 0.5, 0, 0);
    ctx.fillStyle = hexA(accent, 0.05); ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.16); ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

// 점수 게이지 링
function drawScoreRing(ctx, accent, score) {
  const R = 150;
  ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(CX, ART_CY, R, 0, Math.PI * 2); ctx.stroke();
  const ring = ctx.createLinearGradient(CX - R, ART_CY - R, CX + R, ART_CY + R);
  ring.addColorStop(0, accent); ring.addColorStop(1, '#a78bfa');
  ctx.strokeStyle = ring;
  ctx.beginPath(); ctx.arc(CX, ART_CY, R, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2); ctx.stroke();
}

// 네 모서리 작은 별/꽃 문양 — 빈 코너 채움
function drawCorners(ctx, accent, rand) {
  const pts = [[120, 120], [W - 120, 120], [120, H - 120], [W - 120, H - 120]];
  pts.forEach(([x, y]) => {
    const spikes = 4, outer = 12 + rand() * 6, inner = 4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 ? inner : outer, a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = hexA(accent, 0.5); ctx.fill();
  });
}

// 더블 헤어라인 프레임(소장템 느낌)
function drawFrames(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, W - 80, H - 80, 28); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  roundRect(ctx, 54, 54, W - 108, H - 108, 22); ctx.stroke();
}

// 다이아몬드 구분선
function drawDivider(ctx, accent, y) {
  ctx.fillStyle = hexA(accent, 0.8);
  [-44, 0, 44].forEach((dx, i) => {
    const s = i === 1 ? 7 : 4;
    ctx.save(); ctx.translate(CX + dx, y); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
  });
}

// 해시태그를 알약 칩으로
function drawTagChips(ctx, accent, tags, y) {
  ctx.font = '700 28px "Noto Sans KR", sans-serif';
  const padX = 22, gap = 16, h = 52;
  const labels = tags.map(t => `#${t}`);
  const widths = labels.map(l => ctx.measureText(l).width + padX * 2);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let x = CX - total / 2;
  labels.forEach((l, i) => {
    const w = widths[i];
    ctx.fillStyle = hexA(accent, 0.16);
    roundRect(ctx, x, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.4); ctx.lineWidth = 1.5;
    roundRect(ctx, x, y - h / 2, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = hexA(accent, 0.95); ctx.textAlign = 'center';
    ctx.fillText(l, x + w / 2, y + 10);
    x += w + gap;
  });
}

/* ----------------------------------------------------------------
   공유 링크 — 결과별 OG 미리보기가 뜨는 랜딩(/api/share)으로.
   카톡/페북/트위터에 링크를 붙이면 봇이 결과별 og:image를 읽어 미리보기를 보여준다.
   사람이 누르면 즉시 앱으로 리다이렉트. 파라미터는 ogParams(api/_ogCard.js)와 동기화.
---------------------------------------------------------------- */
export function buildShareUrl({ headline, score = null, sub = '', ilju = '', element = '', accent = '' } = {}) {
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const q = new URLSearchParams();
  if (headline) q.set('t', headline);
  if (typeof score === 'number') q.set('s', String(score));
  if (sub) q.set('q', sub);
  if (ilju) q.set('i', ilju);
  if (element) q.set('e', element);
  const c = String(accent).replace('#', '');
  if (c) q.set('c', c);
  return `${origin}/api/share?${q.toString()}`;
}

/* ----------------------------------------------------------------
   공유 실행기 — canShare → 네이티브 공유 → 다운로드 → 클립보드 폴백.
   호출부 3곳(운세/사주카드/식탁)의 중복 제거 + 취소(AbortError) 처리.
   반환: 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'
   (호출부가 이 상태로 토스트/햅틱 안내를 줄 수 있다.)
---------------------------------------------------------------- */
export async function shareImage({ blob, filename, text }) {
  const file = blob ? new File([blob], filename, { type: blob.type || 'image/jpeg' }) : null;

  // 1) 이미지+텍스트 네이티브 공유
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; } // 사용자가 닫음 → 재프롬프트 금지
  }

  // 2) 폴백: 이미지 다운로드 + 텍스트 클립보드
  if (file) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      try { await navigator.clipboard?.writeText(text); } catch (e) { /* 권한 없음 무시 */ }
      return 'downloaded';
    } catch (e) { /* 다운로드 실패 → 텍스트 경로로 */ }
  }

  // 3) 이미지가 없거나 모두 실패 → 텍스트만 공유
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  try { await navigator.clipboard?.writeText(text); return 'copied'; } catch (e) { /* 무시 */ }
  return 'failed';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
