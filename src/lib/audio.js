/* ================================================================
   천문 — Web Audio 사운드 시스템 (저작권 없는 절차적 생성)
   설계 원칙: 동양 의식(ritual) 분위기. 퀴즈쇼·알림음 완전 배제.
   - 수정 발우(singing bowl): 432Hz 기반 긴 여음, 배음이 퍼지다 사라짐
   - 징(gong): 저음 임팩트 + 빠른 어택, 느린 감쇠
   - 먹방울: 낮고 짧은 울림(터치 피드백)
   - 배경: 편안한 카페 — 따뜻한 일렉트릭 피아노 코드 진행 + 낮은 베이스
================================================================ */

let ctx = null;
let ambientMasterGain = null;
let _isAmbientPlaying = false;
let _ambientTimer = null;

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

/* ── 유틸: 부드러운 단음 ── */
function tone(ac, { freq, dur, peak, attack = 0.01, decay = null, type = 'sine', cutoff = 2000, delay = 0, detune = 0 }) {
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.3;
  osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
  osc.connect(lp); lp.connect(gain); gain.connect(ac.destination);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  osc.start(t); osc.stop(t + attack + dur + 0.1);
}

/* ── 수정 발우(singing bowl) — 432Hz 울림, 배음 2·3배음이 따라 퍼짐 ──
   터치·탭 피드백에 사용. 퀴즈음 대신 조용한 "딩~" */
function bowl(ac, { baseFreq = 432, dur = 1.4, peak = 0.06, delay = 0 } = {}) {
  const harmonics = [1, 2.756, 5.404]; // 실제 singing bowl 배음비
  const decays   = [dur, dur * 0.55, dur * 0.28];
  const peaks    = [peak, peak * 0.28, peak * 0.12];
  harmonics.forEach((ratio, i) => {
    tone(ac, { freq: baseFreq * ratio, dur: decays[i], peak: peaks[i],
      attack: 0.006, cutoff: 4000, delay });
  });
}

/* ── 징(gong) — 저음 임팩트 + 긴 여음 ── 성공·공개 순간 */
function gong(ac, { freq = 108, dur = 2.8, peak = 0.10, delay = 0 } = {}) {
  // 저음 바디
  tone(ac, { freq, dur, peak, attack: 0.003, cutoff: 800, delay });
  // 임팩트 금속 배음
  tone(ac, { freq: freq * 3.11, dur: dur * 0.35, peak: peak * 0.22,
    attack: 0.001, cutoff: 2400, delay });
  // 높은 시머
  tone(ac, { freq: freq * 5.87, dur: dur * 0.18, peak: peak * 0.10,
    attack: 0.001, cutoff: 3600, delay });
}

/* ── 먹방울(ink drop) — 낮고 짧은 터치 피드백 ── */
function inkDrop(ac, { freq = 220, delay = 0 } = {}) {
  tone(ac, { freq, dur: 0.22, peak: 0.04, attack: 0.004,
    cutoff: 900, delay });
  // 아주 낮은 서브 한 방
  tone(ac, { freq: freq * 0.5, dur: 0.14, peak: 0.025, attack: 0.002,
    cutoff: 500, delay });
}

/* ── 별빛 수정(crystal star) — 높고 맑은 단음 ── */
function crystal(ac, { freq = 1080, delay = 0 } = {}) {
  tone(ac, { freq, dur: 1.8, peak: 0.022, attack: 0.04, cutoff: 5000, delay });
  tone(ac, { freq: freq * 1.5, dur: 0.9, peak: 0.009, attack: 0.06, cutoff: 6000, delay: delay + 0.08 });
}

/* ── 일렉트릭 피아노 음(Rhodes풍) — 카페 배경음용 ──
   배음 몇 개를 부드러운 어택 + 지수 감쇠로 쳐서 포근한 건반 느낌.
   dest로 라우팅(배경음 마스터 게인)해 일괄 페이드/정지 가능. */
function epNote(ac, freq, { dur = 2.6, peak = 0.04, delay = 0, dest } = {}) {
  const t = ac.currentTime + delay;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.4;
  lp.connect(dest || ac.destination);
  [[1, peak], [2, peak * 0.16], [3, peak * 0.06]].forEach(([ratio, p]) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = freq * ratio;
    osc.connect(g); g.connect(lp);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  });
}
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ── 로파이 하이햇 — 짧은 하이패스 노이즈 'tss' (카페 그루브용, 아주 작게) ── */
function hat(ac, { peak = 0.01, delay = 0, dur = 0.045, dest } = {}) {
  const t = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
  const g = ac.createGain();
  src.connect(hp); hp.connect(g); g.connect(dest || ac.destination);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t); src.stop(t + dur + 0.02);
}

/* ================================================================
   내보내기 — 앱 전체 사운드 인터페이스
================================================================ */

/* 점수 공개 순간 — 점수에 반응하는 별빛 수정음(높을수록 밝고 높게).
   결과 화면 ScoreRing이 숫자를 다 채운 '공개' 순간에 호출(의식의 정점). */
export const playScoreReveal = (score = 80) => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    const t = Math.max(0, Math.min(1, (Number(score) - 50) / 50)); // 50~100 → 0~1
    const base = 720 + t * 540;                                     // 720~1260Hz (높을수록 밝게)
    crystal(ac, { freq: base });
    crystal(ac, { freq: base * 1.5, delay: 0.12 });
    if (Number(score) >= 88) crystal(ac, { freq: base * 2, delay: 0.24 }); // 고득점 한 겹 더 반짝
  } catch (_) {}
};

/* 일반 탭/클릭 — 먹방울 (가볍고 조용) */
export const playClick = () => {
  if (!getSoundPref()) return;
  try { const ac = getCtx(); if (ac.state === 'suspended') ac.resume(); inkDrop(ac, { freq: 264 }); } catch (_) {}
};

/* 더 가벼운 탭 — 아주 낮은 먹방울 */
export const playTap = () => {
  if (!getSoundPref()) return;
  try { const ac = getCtx(); if (ac.state === 'suspended') ac.resume(); inkDrop(ac, { freq: 198 }); } catch (_) {}
};

/* 성공·결과 공개 — 징 울림 */
export const playSuccess = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    gong(ac, { freq: 108, dur: 3.2, peak: 0.09 });
    // 0.6초 뒤 수정 발우 화답
    bowl(ac, { baseFreq: 432, dur: 2.0, peak: 0.045, delay: 0.65 });
  } catch (_) {}
};

/* 장면 입장 — 수정 발우 환영 */
export const playOpen = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    bowl(ac, { baseFreq: 324, dur: 1.6, peak: 0.038 });
    bowl(ac, { baseFreq: 432, dur: 1.2, peak: 0.022, delay: 0.3 });
  } catch (_) {}
};

/* 카드 공개 — 베일 벗기는 순간, 저징 + 상승 수정 + 고별빛 (식탁·타로·사주카드 공개에 사용) */
export const playReveal = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    gong(ac, { freq: 108, dur: 2.4, peak: 0.065 });
    bowl(ac, { baseFreq: 432, dur: 1.8, peak: 0.04, delay: 0.25 });
    crystal(ac, { freq: 972, delay: 0.5 });
    crystal(ac, { freq: 1458, delay: 0.9 });
  } catch (_) {}
};

/* 앱 입장 — 깊은 징 + 별빛 수정 (처음 한 번) */
export const playEntrance = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    gong(ac, { freq: 81, dur: 4.5, peak: 0.07 });
    bowl(ac, { baseFreq: 324, dur: 3.0, peak: 0.04, delay: 0.4 });
    crystal(ac, { freq: 864, delay: 1.2 });
    crystal(ac, { freq: 1296, delay: 2.1 });
  } catch (_) {}
};

/* ── 배경음 — 편안한 카페(라운지) 음악
   따뜻한 일렉트릭 피아노로 포근한 코드 진행(Cmaj7-Am7-Dm7-G7)을 느리게
   반복 + 낮은 베이스 루트. 절차적 생성이라 저작권 없음. 아주 은은하게. */
const CAFE_PROGRESSION = [
  { bass: 36, chord: [60, 64, 67, 71] }, // Cmaj7
  { bass: 45, chord: [57, 60, 64, 67] }, // Am7
  { bass: 38, chord: [62, 65, 69, 72] }, // Dm7
  { bass: 43, chord: [55, 59, 62, 65] }, // G7
];
export const startAmbient = () => {
  if (_isAmbientPlaying || !getAmbientPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();

    ambientMasterGain = ac.createGain();
    ambientMasterGain.gain.setValueAtTime(0, ac.currentTime);
    ambientMasterGain.gain.linearRampToValueAtTime(1, ac.currentTime + 4); // 천천히 등장
    ambientMasterGain.connect(ac.destination);
    _isAmbientPlaying = true;

    // 느긋한 로파이 카페 그루브 — BPM 75. 한 마디(4박)마다 코드 진행 1단계.
    // 오프비트 코드 컴핑 + 움직이는 베이스 + 스윙 하이햇으로 '카페'다운 리듬감.
    const BEAT = 0.8;            // 60/75
    const BAR = BEAT * 4;        // 3.2초
    const SWING = 0.06;          // 8분음표 뒤박을 살짝 늦춰 스윙감
    const G = ambientMasterGain;
    let idx = 0;
    const playBar = () => {
      if (!_isAmbientPlaying) return;
      try {
        const a = getCtx();
        const { bass, chord } = CAFE_PROGRESSION[idx % CAFE_PROGRESSION.length];
        // 스윙 하이햇 — 8분음표, 뒤박을 조금 더 또렷하게
        for (let i = 0; i < 8; i++) {
          const off = (i % 2 ? SWING : 0);
          hat(a, { delay: i * (BEAT / 2) + off, peak: i % 2 ? 0.011 : 0.006, dest: G });
        }
        // 베이스 — 1박 루트(길게) + '2박 반' 5도(가볍게 바운스)
        epNote(a, MIDI(bass), { dur: 1.9, peak: 0.05, dest: G });
        epNote(a, MIDI(bass + 7), { dur: 0.8, peak: 0.022, delay: BEAT * 2.5 + SWING, dest: G });
        // 코드 컴핑 — 2박, '3박 반' 오프비트 스탭(짧게)
        const stab = (delay, peak) => chord.forEach((n, i) => epNote(a, MIDI(n), { dur: 1.0, peak, delay: delay + 0.02 * i, dest: G }));
        stab(BEAT * 1, 0.026);
        stab(BEAT * 2.5 + SWING, 0.02);
      } catch (_) {}
      idx++;
      _ambientTimer = setTimeout(playBar, BAR * 1000);
    };
    playBar();
  } catch (_) {}
};

export const stopAmbient = () => {
  if (!_isAmbientPlaying) return;
  try {
    const ac = getCtx();
    _isAmbientPlaying = false;
    if (_ambientTimer) { clearTimeout(_ambientTimer); _ambientTimer = null; }
    if (ambientMasterGain) {
      ambientMasterGain.gain.cancelScheduledValues(ac.currentTime);
      ambientMasterGain.gain.setValueAtTime(Math.max(0.0001, ambientMasterGain.gain.value), ac.currentTime);
      ambientMasterGain.gain.linearRampToValueAtTime(0, ac.currentTime + 2);
    }
  } catch (_) {}
};

export const isAmbientPlaying = () => _isAmbientPlaying;

/* ── 화면 전환 — 살짝 높아지는 단음 */
export const playNavigation = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    inkDrop(ac, { freq: 312 });
    tone(ac, { freq: 468, dur: 0.55, peak: 0.018, attack: 0.01, cutoff: 2200, delay: 0.06 });
  } catch (_) {}
};

/* ── 뒤로가기 — 살짝 낮아지는 단음 */
export const playBack = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    inkDrop(ac, { freq: 176 });
  } catch (_) {}
};

/* ── 삭제/취소 — 짧고 낮은 더블 탭 */
export const playDelete = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    inkDrop(ac, { freq: 148 });
    inkDrop(ac, { freq: 132, delay: 0.09 });
  } catch (_) {}
};

/* ── 토글 ON — 맑은 상승음 */
export const playToggleOn = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    tone(ac, { freq: 540, dur: 0.28, peak: 0.032, attack: 0.008, cutoff: 3200 });
    tone(ac, { freq: 720, dur: 0.22, peak: 0.018, attack: 0.012, cutoff: 3800, delay: 0.1 });
  } catch (_) {}
};

/* ── 토글 OFF — 하강음 */
export const playToggleOff = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    tone(ac, { freq: 360, dur: 0.28, peak: 0.028, attack: 0.008, cutoff: 1800 });
    tone(ac, { freq: 270, dur: 0.22, peak: 0.018, attack: 0.012, cutoff: 1200, delay: 0.1 });
  } catch (_) {}
};

/* ── 리포트 완성 — 웅장한 3단 상승 (징 + 발우 + 수정 연속) */
export const playReportDone = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    gong(ac, { freq: 81, dur: 5.0, peak: 0.12 });
    bowl(ac, { baseFreq: 324, dur: 3.0, peak: 0.06, delay: 0.5 });
    bowl(ac, { baseFreq: 432, dur: 2.5, peak: 0.04, delay: 1.0 });
    crystal(ac, { freq: 864, delay: 1.5 });
    crystal(ac, { freq: 1296, delay: 2.2 });
    crystal(ac, { freq: 1728, delay: 2.9 });
  } catch (_) {}
};

/* ── 에러/실패 — 낮고 무거운 단음 */
export const playError = () => {
  if (!getSoundPref()) return;
  try {
    const ac = getCtx(); if (ac.state === 'suspended') ac.resume();
    tone(ac, { freq: 108, dur: 0.6, peak: 0.055, attack: 0.005, type: 'triangle', cutoff: 600 });
    tone(ac, { freq: 96,  dur: 0.4, peak: 0.035, attack: 0.01,  type: 'triangle', cutoff: 400, delay: 0.12 });
  } catch (_) {}
};

export const SOUND_KEY = 'cm_sound';
export const getSoundPref = () => localStorage.getItem(SOUND_KEY) !== 'off';
export const setSoundPref = (on) => {
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
};

/* ── 배경음(ambient) 설정 — 효과음과 독립. 기본 ON.
   효과음 토글과 분리해 "조용히 효과음만 끄기 / 배경음만 끄기"를 각각 허용. */
export const AMBIENT_KEY = 'cm_ambient';
export const getAmbientPref = () => localStorage.getItem(AMBIENT_KEY) !== 'off';
export const setAmbientPref = (on) => {
  localStorage.setItem(AMBIENT_KEY, on ? 'on' : 'off');
  if (!on) stopAmbient();
};
