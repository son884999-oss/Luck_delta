/* ================================================================
   천문 — 절차적 사운드를 실제 MP3 파일로 내보내기
   src/lib/audio.js 의 Web Audio 신스를 오프라인(수식)으로 재현해
   public/audio/*.mp3 로 저장한다. (mono, 44.1kHz, 음원 파일 형태로 확인용)

   실행:  node scripts/export-audio.mjs
================================================================ */
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'audio');
const SR = 44100;       // 샘플레이트
const TAU = Math.PI * 2;

/* ── Web Audio 자동화(setValueAtTime / linearRamp / exponentialRamp) 재현 ── */
class Param {
  constructor(initial) { this.initial = initial; this.ev = []; }
  set(t, v)  { this.ev.push({ t, type: 'set', v }); return this; }
  lin(t, v)  { this.ev.push({ t, type: 'lin', v }); return this; }
  exp(t, v)  { this.ev.push({ t, type: 'exp', v }); return this; }
  at(t) {
    let cv = this.initial, ct = this.ev[0]?.t ?? 0;
    for (const e of this.ev) {
      if (t < e.t) {
        if (e.type === 'set') return cv;
        const frac = (t - ct) / (e.t - ct);
        if (e.type === 'lin') return cv + (e.v - cv) * frac;
        return cv * Math.pow(Math.max(e.v, 1e-6) / Math.max(cv, 1e-6), frac); // exp
      }
      cv = e.v; ct = e.t;
    }
    return cv;
  }
}

/* ── 오실레이터: 가변 주파수(글리산도) 위상 누적 + 게인 엔벨로프 ── */
function osc({ buf, start, dur, freq, gain, lfoRate = 0, lfoDepth = 0 }) {
  const n0 = Math.floor(start * SR);
  const n1 = Math.min(buf.length, Math.floor((start + dur) * SR));
  let phase = 0;
  for (let n = n0; n < n1; n++) {
    const t = n / SR;          // 절대 시간
    const lt = t - start;      // 노트 내 로컬 시간
    const f = (typeof freq === 'function' ? freq(t) : freq)
      + (lfoDepth ? lfoDepth * Math.sin(TAU * lfoRate * t) : 0);
    phase += (TAU * f) / SR;
    const g = typeof gain === 'function' ? gain(t) : gain;
    buf[n] += Math.sin(phase) * g;
  }
}

/* ── 사운드 정의 (audio.js 와 동일 파라미터) ── */
function renderClick() {
  const buf = new Float32Array(Math.ceil(0.16 * SR));
  const g = new Param(0.10).set(0, 0.10).exp(0.12, 0.001);
  const f = new Param(900).set(0, 900).exp(0.10, 450);
  osc({ buf, start: 0, dur: 0.13, freq: (t) => f.at(t), gain: (t) => g.at(t) });
  return buf;
}
function renderTap() {
  const buf = new Float32Array(Math.ceil(0.11 * SR));
  const g = new Param(0.07).set(0, 0.07).exp(0.08, 0.001);
  osc({ buf, start: 0, dur: 0.09, freq: 660, gain: (t) => g.at(t) });
  return buf;
}
function renderSuccess() {
  const buf = new Float32Array(Math.ceil(0.95 * SR));
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const t0 = i * 0.09;
    const g = new Param(0).set(t0, 0).lin(t0 + 0.05, 0.07).exp(t0 + 0.55, 0.001);
    osc({ buf, start: t0, dur: 0.56, freq, gain: (t) => g.at(t) });
  });
  return buf;
}
function renderEntrance() {
  const buf = new Float32Array(Math.ceil(1.9 * SR));
  [216, 432, 648].forEach((freq, i) => {
    const t0 = i * 0.18;
    const f = new Param(freq * 0.8).set(t0, freq * 0.8).exp(t0 + 0.4, freq);
    const g = new Param(0).set(t0, 0).lin(t0 + 0.2, 0.06 / (i + 1)).exp(t0 + 1.2, 0.001);
    osc({ buf, start: t0, dur: 1.3, freq: (t) => f.at(t), gain: (t) => g.at(t) });
  });
  return buf;
}
function renderAmbient(seconds = 30) {
  const buf = new Float32Array(Math.ceil(seconds * SR));
  const baseFreqs = [108, 216, 324, 432, 540];
  const gains = [0.018, 0.012, 0.008, 0.006, 0.004];
  // 3초 페이드인 + 마지막 2초 페이드아웃(루프 매끄럽게)
  const master = (t) => {
    const fin = Math.min(1, t / 3);
    const fout = Math.min(1, (seconds - t) / 2);
    return Math.max(0, Math.min(fin, fout));
  };
  baseFreqs.forEach((freq, i) => {
    osc({
      buf, start: 0, dur: seconds, freq,
      lfoRate: 0.04 + i * 0.015, lfoDepth: 1.5 + i * 0.5,
      gain: (t) => gains[i] * master(t),
    });
  });
  // 별빛 트위클 — 5초 이후 4~12초 간격(결정적 시드)
  const noteFreqs = [864, 1080, 1296, 1728];
  let tw = 5, k = 0;
  while (tw < seconds - 2.2) {
    const freq = noteFreqs[k % noteFreqs.length];
    const t0 = tw;
    const g = new Param(0).set(t0, 0).lin(t0 + 0.3, 0.012).exp(t0 + 2, 0.001);
    osc({ buf, start: t0, dur: 2.1, freq, gain: (t) => g.at(t) * master(t) });
    tw += 4 + ((k * 2.7) % 8);  // 4~12초 의사난수 간격
    k++;
  }
  return buf;
}

/* ── Float32 → MP3(Int16, mono) ── */
function toMp3(float, kbps = 160) {
  const enc = new Mp3Encoder(1, SR, kbps);
  const pcm = new Int16Array(float.length);
  for (let i = 0; i < float.length; i++) {
    const s = Math.max(-1, Math.min(1, float[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const out = [];
  const block = 1152;
  for (let i = 0; i < pcm.length; i += block) {
    const chunk = pcm.subarray(i, i + block);
    const mp3 = enc.encodeBuffer(chunk);
    if (mp3.length) out.push(Buffer.from(mp3));
  }
  const end = enc.flush();
  if (end.length) out.push(Buffer.from(end));
  return Buffer.concat(out);
}

/* ── 실행 ── */
mkdirSync(OUT_DIR, { recursive: true });
const files = {
  'click.mp3': renderClick(),
  'tap.mp3': renderTap(),
  'success.mp3': renderSuccess(),
  'entrance.mp3': renderEntrance(),
  'ambient.mp3': renderAmbient(30),
};
for (const [name, float] of Object.entries(files)) {
  const mp3 = toMp3(float);
  writeFileSync(join(OUT_DIR, name), mp3);
  console.log(`✓ ${name}  ${(mp3.length / 1024).toFixed(1)} KB  (${(float.length / SR).toFixed(2)}s)`);
}
console.log(`\n완료 → ${OUT_DIR}`);
