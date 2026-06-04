/* ================================================================
   천문 — 사주 엔진 (순수 계산 로직 / 외부 의존성 없음)
   원작의 명리학 계산 의도를 그대로 보존한다.
================================================================ */

// 60갑자
export const GANJI_60 = ['갑자','을축','병인','정묘','무진','기사','경오','신미','임신','계유','갑술','을해','병자','정축','무인','기묘','경진','신사','임오','계미','갑신','을유','병술','정해','무자','기축','경인','신묘','임진','계사','갑오','을미','병신','정유','무술','기해','경자','신축','임인','계묘','갑진','을사','병오','정미','무신','기유','경술','신해','임자','계축','갑인','을묘','병진','정사','무오','기미','경신','신유','임술','계해'];

// 천간 → 오행
export const CHEONGAN_OHAENG = {갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'};

// 오행 메타 — 오행 색·이름의 단일 소스(SSOT). 모든 화면/문서가 여기서 파생한다.
//   color : 화면(다크·보석톤)  ·  print : 인쇄/라이트 문서(흰 배경 대비 깊은 톤)
export const OHAENG = {
  목:{ color:'#34d399', soft:'rgba(52,211,153,0.14)', print:'#2f9e6b', hanja:'木', name:'목', plain:'나무', meaning:'성장·인내·생명력' },
  화:{ color:'#fb7185', soft:'rgba(251,113,133,0.14)', print:'#d6536d', hanja:'火', name:'화', plain:'불',   meaning:'열정·창의·변화' },
  토:{ color:'#f0b429', soft:'rgba(240,180,41,0.14)', print:'#c08a2e', hanja:'土', name:'토', plain:'흙',   meaning:'안정·신뢰·포용' },
  금:{ color:'#cbd5e1', soft:'rgba(203,213,225,0.14)', print:'#5b7186', hanja:'金', name:'금', plain:'쇠',   meaning:'결단·재물·논리' },
  수:{ color:'#818cf8', soft:'rgba(129,140,248,0.16)', print:'#5a5fd0', hanja:'水', name:'수', plain:'물',   meaning:'지혜·유연·직관' },
};
// 오행 순서 + 인쇄 팔레트 헬퍼 (reportPdf / emailTemplate / 공유 카드가 공유)
export const OHAENG_ORDER = ['목', '화', '토', '금', '수'];
export const elementMeta = (key) => OHAENG[key] || OHAENG['토'];
// 직관적 라벨: "나무 기운" 처럼 일상어로 (전문용어/한자 노출 최소화)
export const ohaengGiun = (key) => { const o = OHAENG[key]; return o ? `${o.plain} 기운` : ''; };

// 점수대 메타 (표시 점수 50~100 기준)
export const SCORE_META = [
  { max:63, label:'내면을 돌보는 날', desc:'조용히 나를 챙기는 하루예요', tone:'#94a3b8', emoji:'🌙' },
  { max:75, label:'고요한 흐름의 날', desc:'무리하지 않으면 괜찮아요', tone:'#38bdf8', emoji:'☁️' },
  { max:88, label:'순풍의 날',       desc:'좋은 기운이 감돕니다',   tone:'#818cf8', emoji:'🌤' },
  { max:95, label:'대길의 날',       desc:'적극적으로 행동하세요',  tone:'#f0b429', emoji:'☀️' },
  { max:100,label:'천운의 날',       desc:'하늘이 돕는 특별한 날',  tone:'#fde047', emoji:'✨' },
];

// 궁합 — 관계 아키타입 (점수대 기반). 시간 기반(대길의 날/흉) 대신 '관계의 결'을 묘사.
// 표시 점수(50~100) 기준. 채점 로직은 그대로 두고 라벨만 관계 중심으로.
export const RELATIONSHIP_ARCHETYPES = [
  { max: 62,  name: '마주 보는 거울', desc: '닮음과 다름을 비추며 서로를 알아가는 사이', tone: '#94a3b8' },
  { max: 74,  name: '잔잔한 동행',   desc: '시간이 쌓일수록 깊어지는 잔잔한 인연',   tone: '#38bdf8' },
  { max: 86,  name: '서로의 빈자리', desc: '부족함을 채워주는 보완의 힘이 흐르는 사이', tone: '#818cf8' },
  { max: 94,  name: '단단한 매듭',   desc: '안정과 신뢰로 결이 맞는 조화로운 사이',   tone: '#a78bfa' },
  { max: 100, name: '운명의 한 쌍',  desc: '깊은 이해와 끌림이 함께하는 인연',       tone: '#f0b429' },
];
export const getRelationshipArchetype = (score) =>
  RELATIONSHIP_ARCHETYPES.find(x => score <= x.max) || RELATIONSHIP_ARCHETYPES[4];

// 12지지 (시주 안내용)
export const JIJI_MAP = [
  { name:'자시', hanja:'子', range:'23:30~01:30' },
  { name:'축시', hanja:'丑', range:'01:30~03:30' },
  { name:'인시', hanja:'寅', range:'03:30~05:30' },
  { name:'묘시', hanja:'卯', range:'05:30~07:30' },
  { name:'진시', hanja:'辰', range:'07:30~09:30' },
  { name:'사시', hanja:'巳', range:'09:30~11:30' },
  { name:'오시', hanja:'午', range:'11:30~13:30' },
  { name:'미시', hanja:'未', range:'13:30~15:30' },
  { name:'신시', hanja:'申', range:'15:30~17:30' },
  { name:'유시', hanja:'酉', range:'17:30~19:30' },
  { name:'술시', hanja:'戌', range:'19:30~21:30' },
  { name:'해시', hanja:'亥', range:'21:30~23:30' },
];

// 띠 (지지 기반) — 출생 연도 → 12간지 동물
export const TTI = ['원숭이','닭','개','돼지','쥐','소','호랑이','토끼','용','뱀','말','양'];
export const getTti = (year) => {
  const y = parseInt(year);
  if (!y) return null;
  return TTI[y % 12];
};

/* ── 일주(日柱) 계산 — 원작 로직 보존 ───────────────────────── */
export const calculateIlju = (year, month, day, hour, minute) => {
  const target = new Date(
    parseInt(year) || 2000, (parseInt(month) || 1) - 1, parseInt(day) || 1,
    hour === '모름' ? 12 : parseInt(hour), minute === '모름' ? 0 : parseInt(minute)
  );
  target.setMinutes(target.getMinutes() - 32);
  if (target.getHours() >= 23) target.setDate(target.getDate() + 1);
  let idx = Math.round((target.getTime() - new Date(2024, 0, 1, 12).getTime()) / 86400000) % 60;
  return GANJI_60[idx < 0 ? idx + 60 : idx];
};

export const getOhaeng = (ilju) => CHEONGAN_OHAENG[ilju?.charAt(0)] || '토';
export const getScoreInfo = (score) => SCORE_META.find(x => score <= x.max) || SCORE_META[4];

/* ── 날짜/시각 유틸 ─────────────────────────────────────────── */
const WEEKDAYS = ['일','월','화','수','목','금','토'];
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
};
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
export const weekdayChar = (dateLike) => WEEKDAYS[new Date(dateLike).getDay()] ?? '';

// 이번 주(월~일) 범위 문자열
export const weekRangeStr = () => {
  const d = new Date();
  const day = d.getDay(); // 0=일
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(d); mon.setDate(d.getDate() + mondayOffset);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return `${mon.getMonth() + 1}.${mon.getDate()} ~ ${sun.getMonth() + 1}.${sun.getDate()}`;
};

// 생년월일·시각 표기 (요약 모달 등 공용) — 전문용어(시진) 없이 자연스러운 한국어
export const fmtBirthDate = (b) => `${b.y}년 ${parseInt(b.m)}월 ${parseInt(b.d)}일`;
export const fmtBirthTime = (b) => {
  if (b.h === '모름' || b.h === '' || b.h == null) return '태어난 시각 모름';
  const ch = parseInt(b.h);
  if (isNaN(ch)) return '태어난 시각 모름';
  // 시주는 12시진 단위 — 지지 시진 이름 + 구간으로 표기
  const ji = (ch >= 23 || ch < 1) ? 0 : Math.floor((ch + 1) / 2) % 12;
  const names = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
  const ranges = ['23–01시', '01–03시', '03–05시', '05–07시', '07–09시', '09–11시', '11–13시', '13–15시', '15–17시', '17–19시', '19–21시', '21–23시'];
  return `${names[ji]} (${ranges[ji]})`;
};
// 시계 시각 표기 (발송 도착 안내 등) — "오전 9시 18분" / 정각이면 "오전 9시"
export const fmtClock = (date) => {
  const h = date.getHours(), m = date.getMinutes();
  const base = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시`;
  return m === 0 ? base : `${base} ${m}분`;
};

export const vibrate = (ms) => { try { navigator?.vibrate?.(ms); } catch (e) {} };

// API 원점수(1~100) → 표시 점수(50~100) 변환 — 원작 보존
export const transformScore = (raw) => 50 + Math.round(Math.max(1, Math.min(100, raw)) / 2);

export const getJiji = (hour) => {
  const h = parseInt(hour);
  return JIJI_MAP.find((_, idx) => idx === 0 ? (h >= 23 || h < 2) : (h >= 1 + idx * 2 && h < 3 + idx * 2));
};

/* ================================================================
   사주 명식(命式) — 년·월·일·시 네 기둥 + 오행 분포
   ⚠️ 절기/입춘 경계는 근사값(연도별 ±1일 오차 가능). 일주는 원작 로직 보존.
   엔터테인먼트 등급 — 정밀 만세력이 아님을 전제로 한다.
================================================================ */
export const CHEONGAN = ['갑','을','병','정','무','기','경','신','임','계'];
export const CHEONGAN_HANJA = { 갑:'甲',을:'乙',병:'丙',정:'丁',무:'戊',기:'己',경:'庚',신:'辛',임:'壬',계:'癸' };
export const JIJI = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const JIJI_HANJA = { 자:'子',축:'丑',인:'寅',묘:'卯',진:'辰',사:'巳',오:'午',미:'未',신:'申',유:'酉',술:'戌',해:'亥' };
// 지지 → 오행 (자수·축토·인목·묘목·진토·사화·오화·미토·신금·유금·술토·해수)
export const JIJI_OHAENG = { 자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수' };
// 지지 → 띠 동물
export const JIJI_TTI = { 자:'쥐',축:'소',인:'호랑이',묘:'토끼',진:'용',사:'뱀',오:'말',미:'양',신:'원숭이',유:'닭',술:'개',해:'돼지' };

const makePillar = (kind, gan, ji) => ({
  kind, gan, ji, ganji: gan + ji,
  ganHanja: CHEONGAN_HANJA[gan], jiHanja: JIJI_HANJA[ji],
  ganElem: CHEONGAN_OHAENG[gan], jiElem: JIJI_OHAENG[ji],
  hanja: (CHEONGAN_HANJA[gan] || '') + (JIJI_HANJA[ji] || ''),
});

// 명리 월(月) 경계 — 절기 근사일. day 이상이면 해당 지지로 진입.
const SOLAR_TERMS = [
  { m:1,  d:6, ji:1  }, // 소한 → 축
  { m:2,  d:4, ji:2  }, // 입춘 → 인
  { m:3,  d:6, ji:3  }, // 경칩 → 묘
  { m:4,  d:5, ji:4  }, // 청명 → 진
  { m:5,  d:6, ji:5  }, // 입하 → 사
  { m:6,  d:6, ji:6  }, // 망종 → 오
  { m:7,  d:7, ji:7  }, // 소서 → 미
  { m:8,  d:8, ji:8  }, // 입추 → 신
  { m:9,  d:8, ji:9  }, // 백로 → 유
  { m:10, d:8, ji:10 }, // 한로 → 술
  { m:11, d:7, ji:11 }, // 입동 → 해
  { m:12, d:7, ji:0  }, // 대설 → 자
];
const monthBranchIdx = (month, day) => {
  let idx = 0; // 1/1~1/5 (대설~소한 이전) = 자
  for (const t of SOLAR_TERMS) if (month > t.m || (month === t.m && day >= t.d)) idx = t.ji;
  return idx;
};
// 입춘(2/4) 이전은 사주상 전년도로 간주 (근사)
const solarYear = (year, month, day) => (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;

/* 네 기둥 + 오행 분포 산출. birth = {y,m,d,h,min}, h/min은 '모름' 허용 */
export const calculateSaju = (birth) => {
  const y = parseInt(birth.y) || 2000;
  const m = parseInt(birth.m) || 1;
  const d = parseInt(birth.d) || 1;
  const hourKnown = birth.h !== '모름' && birth.h !== '' && birth.h != null && !isNaN(parseInt(birth.h));

  const ilju = calculateIlju(birth.y, birth.m, birth.d, birth.h, birth.min);
  const dayGan = ilju.charAt(0), dayJi = ilju.charAt(1);

  // 년주 (입춘 기준 연도)
  const yr = solarYear(y, m, d);
  const yGanIdx = ((yr - 4) % 10 + 10) % 10;
  const yJiIdx  = ((yr - 4) % 12 + 12) % 12;
  const year = makePillar('년주', CHEONGAN[yGanIdx], JIJI[yJiIdx]);

  // 월주 (월두법: 년간 → 인월 천간 시작)
  const mJiIdx = monthBranchIdx(m, d);
  const monStart = ((yGanIdx % 5) * 2 + 2) % 10;          // 갑/기→병, 을/경→무 …
  const mGanIdx = (monStart + (((mJiIdx - 2) % 12 + 12) % 12)) % 10; // 인(2) 기준 오프셋
  const month = makePillar('월주', CHEONGAN[mGanIdx], JIJI[mJiIdx]);

  // 일주 (원작 로직 보존)
  const day = makePillar('일주', dayGan, dayJi);

  // 시주 (시두법: 일간 → 자시 천간 시작). 30분 보정은 일주와 동일하게 적용
  let hour = null;
  if (hourKnown) {
    const t = new Date(y, m - 1, d, parseInt(birth.h), birth.min === '모름' ? 0 : (parseInt(birth.min) || 0));
    t.setMinutes(t.getMinutes() - 32);
    const ch = t.getHours();
    const hJiIdx = (ch >= 23 || ch < 1) ? 0 : Math.floor((ch + 1) / 2) % 12;
    const dayGanIdx = CHEONGAN.indexOf(dayGan);
    const hourStart = ((dayGanIdx % 5) * 2) % 10;          // 갑/기→갑, 을/경→병 …
    const hGanIdx = (hourStart + hJiIdx) % 10;
    hour = makePillar('시주', CHEONGAN[hGanIdx], JIJI[hJiIdx]);
  }

  // 오행 분포 (천간+지지 합산)
  const pillars = hour ? [year, month, day, hour] : [year, month, day];
  const counts = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  pillars.forEach(p => { counts[p.ganElem]++; counts[p.jiElem]++; });
  const total = pillars.length * 2;
  const maxN = Math.max(...Object.values(counts));
  const dist = ['목','화','토','금','수'].map(k => ({ key:k, count:counts[k], pct: Math.round((counts[k] / total) * 100) }));
  const dominant = ['목','화','토','금','수'].filter(k => counts[k] === maxN);
  const lacking  = ['목','화','토','금','수'].filter(k => counts[k] === 0);

  return {
    pillars, year, month, day, hour, hourKnown,
    ilju, dayGan, dayJi,
    dayElem: CHEONGAN_OHAENG[dayGan],   // 일간(본명) 오행
    tti: JIJI_TTI[year.ji],             // 띠 (입춘 보정 반영)
    elements: counts, total, dist, dominant, lacking,
  };
};

/* ── 오늘의 운세 점수 — 오늘 일진(일주) × 본명 일주의 오행 십성 관계로 산출.
   기존엔 AI가 점수를 임의로 골라 매번 80점대에 몰려 '같은 점수만 반복'처럼 보였다.
   이 방식은 ① 매일 달라지고(일진이 60갑자로 순환) ② 사람마다 다르며
   ③ 하루 안에선 안정적이고 ④ 명리 근거가 있다(십성 관계). 결정적(랜덤 아님). */
const OH_IDX = { 목:0, 화:1, 토:2, 금:3, 수:4 }; // 상생 순환: 목→화→토→금→수→목
function ohaengRelationScore(meEl, todayEl) {
  const me = OH_IDX[meEl], t = OH_IDX[todayEl];
  if (me == null || t == null) return 78;
  const diff = (t - me + 5) % 5;
  // 0 비겁(동일)·1 식상(내가 생)·2 재성(내가 극)·3 관성(나를 극)·4 인성(나를 생)
  return [80, 82, 86, 73, 90][diff];
}
function hashStr(s) { // 결정적 해시(FNV-1a) — 같은 관계여도 날짜·사람별로 미세 변동
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function dailyFortuneScore(birth, dateKey) {
  if (!birth) return 80;
  const dk = dateKey || todayKey();
  // 일주(日柱)는 정오(12시) 기준으로 계산 — 시각 미상/경계(23시) 영향 배제, 결정적
  const myIlju = calculateIlju(birth.y, birth.m, birth.d, 12, 0);
  const myGanEl = CHEONGAN_OHAENG[myIlju.charAt(0)];
  const myJiEl = JIJI_OHAENG[myIlju.charAt(1)];
  const [ty, tm, td] = dk.split('-').map(Number);
  const todayIlju = calculateIlju(ty, tm, td, 12, 0);
  const tGanEl = CHEONGAN_OHAENG[todayIlju.charAt(0)];
  const tJiEl = JIJI_OHAENG[todayIlju.charAt(1)];
  const base = ohaengRelationScore(myGanEl, tGanEl) * 0.62 + ohaengRelationScore(myJiEl, tJiEl) * 0.38;
  const spread = (hashStr(`${birth.y}${birth.m}${birth.d}_${dk}`) % 13) - 6; // -6~+6
  return Math.max(55, Math.min(98, Math.round(base + spread)));
}
/* 주간 점수 — 이번 주(월~일) 7일치 일진 점수 평균(주마다·사람마다 변동) */
export function weeklyFortuneScore(birth, ref) {
  if (!birth) return 80;
  const base = ref ? new Date(ref) : new Date();
  const monday = new Date(base);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // 월요일로
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    sum += dailyFortuneScore(birth, `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); // eslint-disable-line
  }
  return Math.round(sum / 7);
}

/* 명식을 프롬프트용 한 줄 요약으로 (AI를 실제 데이터에 정박시킴) */
export const sajuSummaryLine = (s) => {
  const ps = s.pillars.map(p => `${p.kind} ${p.ganji}(${p.ganElem}·${p.jiElem})`).join(', ');
  const dd = s.dist.map(x => `${x.key}${x.count}`).join(' ');
  return `명식 — ${ps}. 일간 ${s.dayGan}(${s.dayElem}). 오행분포 ${dd}. 강한기운 ${s.dominant.join('·')}${s.lacking.length ? `, 부족한기운 ${s.lacking.join('·')}` : ''}.`;
};
