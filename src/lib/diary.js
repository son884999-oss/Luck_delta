/* ================================================================
   천문 — 나의 운세 다이어리 (오늘의 한 문장 · 기분/일기 기록)
   localStorage 'cm_diary' : { 'YYYY-MM-DD': { mood, note, score } }
================================================================ */

// 로컬 기준 날짜 키 (YYYY-MM-DD, zero-padded)
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const KEY = 'cm_diary';
export const getDiary = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

// 생성/수정 — 기존 항목과 병합(예: score 보존). 항상 최신 전체 맵을 반환.
export const setDiaryEntry = (dateKey, entry) => {
  if (!dateKey) return getDiary();
  const all = getDiary();
  all[dateKey] = { ...all[dateKey], ...entry };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  return all;
};

// 삭제 — 존재하지 않는 키는 에러 없이 무시(no-op). 항상 최신 전체 맵을 반환.
export const deleteDiaryEntry = (dateKey) => {
  const all = getDiary();
  if (!dateKey || !(dateKey in all)) return all; // 엣지: 빈 키/없는 항목
  delete all[dateKey];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  return all;
};

// 전체 기록을 최신순(날짜 내림차순) 배열로 반환 — [ [dateKey, entry], ... ]
export const getSortedDiary = () =>
  Object.entries(getDiary()).sort((a, b) => b[0].localeCompare(a[0]));

// 기분 5단계
export const MOODS = [
  { e: '😔', l: '힘듦',   c: '#94a3b8' },
  { e: '😐', l: '그냥',   c: '#818cf8' },
  { e: '🙂', l: '괜찮음', c: '#38bdf8' },
  { e: '😊', l: '좋음',   c: '#34d399' },
  { e: '🥰', l: '최고',   c: '#fb7185' },
];

// 오늘의 한 문장 — 우주적·다정한 톤 (날짜별로 안정적으로 고정)
export const DAILY_LINES = [
  '오늘의 당신은 어제보다 조금 더 단단해졌어요.',
  '흐린 날에도 별은 늘 그 자리에 있어요.',
  '서두르지 않아도, 도착할 곳에는 닿게 돼요.',
  '오늘 흘린 작은 정성이 내일의 운을 부릅니다.',
  '마음이 머무는 곳에 길이 열려요.',
  '비운 자리에 좋은 것이 들어옵니다.',
  '당신의 속도는 늦은 게 아니라 깊은 거예요.',
  '작은 친절 하나가 오늘의 행운이 됩니다.',
  '오늘은 받기보다 살며시 건네는 날이에요.',
  '잠시 멈추는 것도 나아가는 한 방법이에요.',
  '오늘 만난 우연을 가볍게 흘리지 마세요.',
  '햇살은 늘 당신 쪽으로 조금 기울어 있어요.',
  '답을 모를 땐, 마음의 소리를 따라가요.',
  '오늘의 한 걸음이 먼 길의 시작이에요.',
  '좋은 기운은 웃는 얼굴에 먼저 깃들어요.',
  '어제의 걱정은 오늘 내려놓아도 괜찮아요.',
  '당신이 가꾼 정원은 반드시 꽃을 피웁니다.',
  '고요한 마음이 가장 멀리 봅니다.',
  '오늘은 나를 먼저 다정하게 대해보세요.',
  '흐름을 거스르지 말고 살짝 올라타 보세요.',
  '작은 행운이 문 앞에서 노크하고 있어요.',
  '오늘 내민 손은 오래 기억될 거예요.',
  '별빛처럼, 천천히 그러나 분명하게 빛나요.',
  '오늘 하루도, 당신 편이에요.',
];
export const dailyLine = (seed = 0) => {
  const d = new Date();
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return DAILY_LINES[Math.abs(doy + seed) % DAILY_LINES.length];
};
