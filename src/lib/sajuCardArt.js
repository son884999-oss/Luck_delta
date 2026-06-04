/* ================================================================
   천문 — 사주 카드 이미지 '생성'기 (자체 앱 내 절차적 생성, 외부 API 불필요)
   일주(日柱)·오행을 시드로 사람마다 고유한 별자리 만다라를 캔버스에 그려
   PNG data URL로 반환한다. 키·네트워크·과금 없이 오프라인에서 즉시 동작하고
   같은 사주는 항상 같은 그림이 나온다(결정적). CardResult가 기존 SVG 대신 사용.
================================================================ */
import { OHAENG } from './saju.js';

const SIZE = 720; // 정사각 캔버스(레티나 대비 큼)

/* 문자열 → 32bit 시드 해시 (결정적) */
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
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

function hexA(hex, alpha) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/*
  사주 카드 이미지 생성
  @param {object} opts
    ilju      : '갑자' 등 일주(2자) — 시드 + 중앙 글자
    ohaeng    : '목'|'화'|'토'|'금'|'수' — 색·중앙 한자
  @returns {string} PNG data URL
*/
export function generateSajuCardImage({ ilju = '', ohaeng = '토' } = {}) {
  const meta = OHAENG[ohaeng] || OHAENG['토'];
  const accent = meta.color;
  const seed = hashSeed(`${ilju}|${ohaeng}`);
  const rand = rng(seed);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const cx = SIZE / 2, cy = SIZE / 2;

  /* ── 배경: 깊은 밤하늘 그라데이션 ── */
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE);
  bg.addColorStop(0, '#120e26');
  bg.addColorStop(0.55, '#0c0a1c');
  bg.addColorStop(1, '#070611');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, SIZE, SIZE);

  /* ── 오행 색 성운(nebula) 글로우 ── */
  const neb = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy - 30, SIZE * 0.62);
  neb.addColorStop(0, hexA(accent, 0.34));
  neb.addColorStop(0.4, hexA(accent, 0.12));
  neb.addColorStop(1, 'transparent');
  ctx.fillStyle = neb; ctx.fillRect(0, 0, SIZE, SIZE);

  /* ── 흩뿌려진 성진(별가루): 시드 기반 ── */
  const dust = 150;
  for (let i = 0; i < dust; i++) {
    const x = rand() * SIZE, y = rand() * SIZE;
    const r = rand() * 1.6 + 0.2;
    ctx.globalAlpha = rand() * 0.6 + 0.08;
    ctx.fillStyle = rand() > 0.78 ? accent : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* ── 궤도 링 ── */
  ctx.lineWidth = 1.2;
  [SIZE * 0.40, SIZE * 0.30, SIZE * 0.21].forEach((r, i) => {
    ctx.strokeStyle = hexA('#ffffff', 0.06 + i * 0.015);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  });

  /* ── 운명의 별자리: 시드로 별을 배치하고 호(arc)를 따라 선으로 잇는다 ── */
  const starCount = 6 + Math.floor(rand() * 4); // 6~9개
  const baseR = SIZE * 0.30;
  const startAng = rand() * Math.PI * 2;
  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const ang = startAng + (i / starCount) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const rr = baseR * (0.62 + rand() * 0.5);
    stars.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, m: rand() * 4 + 2 });
  }
  // 잇는 선
  ctx.strokeStyle = hexA(accent, 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  stars.forEach((s, i) => { i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y); });
  ctx.closePath(); ctx.stroke();
  // 별점
  stars.forEach(s => {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.m * 3.2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, accent); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.m * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.m * 0.7, 0, Math.PI * 2); ctx.fill();
  });

  /* ── 중앙 만다라: 꽃잎 수/회전은 시드 기반 ── */
  const petals = 8 + Math.floor(rand() * 7); // 8~14
  const petalR = SIZE * 0.155;
  const rot = rand() * Math.PI;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  for (let i = 0; i < petals; i++) {
    ctx.rotate((Math.PI * 2) / petals);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(petalR * 0.42, -petalR * 0.5, 0, -petalR);
    ctx.quadraticCurveTo(-petalR * 0.42, -petalR * 0.5, 0, 0);
    ctx.fillStyle = hexA(accent, 0.07);
    ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.22);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  /* ── 중심 글로우 + 오행 한자 ── */
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.14);
  core.addColorStop(0, hexA(accent, 0.5));
  core.addColorStop(1, 'transparent');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(cx, cy, SIZE * 0.14, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = hexA(accent, 0.9);
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 132px "Noto Serif KR", serif';
  ctx.fillText(meta.hanja, cx, cy + 4);
  ctx.shadowBlur = 0;

  /* ── 일주(日柱) 라벨 — 하단 ── */
  if (ilju) {
    ctx.fillStyle = hexA('#ffffff', 0.55);
    ctx.font = '500 30px "Noto Sans KR", sans-serif';
    ctx.fillText(`日柱  ${ilju}`, cx, SIZE - 64);
  }

  /* ── 외곽 프레임 ── */
  ctx.strokeStyle = hexA('#ffffff', 0.10);
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, SIZE - 48, SIZE - 48, 36);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/* 폰트 로드를 보장한 뒤 이미지를 생성한다(한자·한글 깨짐 방지). */
export async function generateSajuCardImageAsync(opts) {
  try {
    await Promise.all([
      document.fonts.load('900 132px "Noto Serif KR"'),
      document.fonts.load('500 30px "Noto Sans KR"'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* 폰트 실패 시 시스템 폰트로 진행 */ }
  return generateSajuCardImage(opts);
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
