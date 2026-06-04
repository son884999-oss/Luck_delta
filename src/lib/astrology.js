/* ================================================================
   천문 — 서양 점성술 계산 (저작권 없음 — 순수 수학 계산)
   태양궁(Sun Sign): 생년월일로 결정
   상승궁(Ascendant): 출생 시간 + 위도 필요 (시간 없으면 생략)
   달궁(Moon Sign): 정밀 계산 필요 → AI로 처리
================================================================ */

/* 별자리 선도 — CC0 (순수 수학 좌표, 저작권 없음)
   각 점은 [x,y] 0~100 좌표. lines는 연결할 점 인덱스 쌍 배열. */
export const CONSTELLATION_ART = {
  aries:       { stars:[[50,20],[58,35],[65,50],[45,55],[38,40]], lines:[[0,1],[1,2],[1,3],[3,4]] },
  taurus:      { stars:[[30,40],[45,35],[55,30],[65,38],[50,55],[40,60],[60,58]], lines:[[0,1],[1,2],[2,3],[1,4],[4,5],[4,6]] },
  gemini:      { stars:[[30,25],[30,45],[30,65],[70,25],[70,45],[70,65],[50,50]], lines:[[0,1],[1,2],[3,4],[4,5],[1,6],[4,6]] },
  cancer:      { stars:[[40,30],[55,30],[48,45],[35,55],[60,58]], lines:[[0,1],[0,2],[1,2],[2,3],[2,4]] },
  leo:         { stars:[[30,50],[40,35],[55,30],[65,40],[70,55],[58,65],[42,60],[50,75]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[5,7]] },
  virgo:       { stars:[[35,25],[45,35],[55,40],[65,30],[60,55],[50,65],[40,70],[35,55]], lines:[[0,1],[1,2],[2,3],[2,4],[4,5],[5,6],[6,7],[7,1]] },
  libra:       { stars:[[30,50],[50,35],[70,50],[50,65],[50,50]], lines:[[0,4],[4,1],[1,2],[2,4],[4,3]] },
  scorpio:     { stars:[[25,35],[35,45],[45,50],[55,45],[65,50],[72,60],[68,72],[60,78]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },
  sagittarius: { stars:[[30,65],[40,50],[55,40],[65,30],[55,55],[45,68],[60,70]], lines:[[0,1],[1,2],[2,3],[1,4],[4,5],[4,6]] },
  capricorn:   { stars:[[30,40],[42,30],[55,35],[65,45],[60,60],[45,65],[32,58]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]] },
  aquarius:    { stars:[[25,45],[38,38],[52,45],[65,38],[78,45],[50,58],[35,62],[65,62]], lines:[[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[5,7]] },
  pisces:      { stars:[[30,35],[42,28],[55,35],[50,50],[35,60],[25,68],[65,55],[75,63],[62,68]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7],[7,8]] },
};

export const SIGNS = [
  { key:'aries',       ko:'양자리',       en:'Aries',       symbol:'♈', date:'3/21–4/19',
    element:'화', modality:'활동', ruling:'화성', color:'#ef4444',
    traits:['용기', '직진', '열정'], desc:'불꽃처럼 타오르는 첫 번째 별자리' },
  { key:'taurus',      ko:'황소자리',     en:'Taurus',      symbol:'♉', date:'4/20–5/20',
    element:'지', modality:'고정', ruling:'금성', color:'#10b981',
    traits:['안정', '인내', '감각'], desc:'대지의 풍요를 품은 별자리' },
  { key:'gemini',      ko:'쌍둥이자리',   en:'Gemini',      symbol:'♊', date:'5/21–6/21',
    element:'풍', modality:'변통', ruling:'수성', color:'#f59e0b',
    traits:['지성', '소통', '호기심'], desc:'두 얼굴의 바람 같은 별자리' },
  { key:'cancer',      ko:'게자리',       en:'Cancer',      symbol:'♋', date:'6/22–7/22',
    element:'수', modality:'활동', ruling:'달', color:'#60a5fa',
    traits:['감성', '보호', '직관'], desc:'달의 기운을 받는 감성의 별자리' },
  { key:'leo',         ko:'사자자리',     en:'Leo',         symbol:'♌', date:'7/23–8/22',
    element:'화', modality:'고정', ruling:'태양', color:'#f97316',
    traits:['자신감', '창조', '리더십'], desc:'태양의 왕좌에 앉은 별자리' },
  { key:'virgo',       ko:'처녀자리',     en:'Virgo',       symbol:'♍', date:'8/23–9/22',
    element:'지', modality:'변통', ruling:'수성', color:'#84cc16',
    traits:['분석', '완벽', '섬세'], desc:'대지의 정밀함을 가진 별자리' },
  { key:'libra',       ko:'천칭자리',     en:'Libra',       symbol:'♎', date:'9/23–10/23',
    element:'풍', modality:'활동', ruling:'금성', color:'#e879f9',
    traits:['균형', '조화', '공정'], desc:'저울처럼 균형을 추구하는 별자리' },
  { key:'scorpio',     ko:'전갈자리',     en:'Scorpio',     symbol:'♏', date:'10/24–11/21',
    element:'수', modality:'고정', ruling:'명왕성', color:'#7c3aed',
    traits:['강렬', '통찰', '변환'], desc:'어둠을 꿰뚫는 깊이의 별자리' },
  { key:'sagittarius', ko:'사수자리',     en:'Sagittarius', symbol:'♐', date:'11/22–12/21',
    element:'화', modality:'변통', ruling:'목성', color:'#06b6d4',
    traits:['자유', '철학', '모험'], desc:'끝없는 지평선을 향하는 별자리' },
  { key:'capricorn',   ko:'염소자리',     en:'Capricorn',   symbol:'♑', date:'12/22–1/19',
    element:'지', modality:'활동', ruling:'토성', color:'#64748b',
    traits:['야망', '책임', '인내'], desc:'높은 산을 오르는 별자리' },
  { key:'aquarius',    ko:'물병자리',     en:'Aquarius',    symbol:'♒', date:'1/20–2/18',
    element:'풍', modality:'고정', ruling:'천왕성', color:'#38bdf8',
    traits:['혁신', '인류애', '독창'], desc:'미래를 앞서 보는 별자리' },
  { key:'pisces',      ko:'물고기자리',   en:'Pisces',      symbol:'♓', date:'2/19–3/20',
    element:'수', modality:'변통', ruling:'해왕성', color:'#a78bfa',
    traits:['감수성', '직관', '공감'], desc:'꿈과 현실을 넘나드는 별자리' },
];

export const ELEMENT_COLOR = { 화:'#ef4444', 지:'#10b981', 풍:'#f59e0b', 수:'#60a5fa' };

/* 태양궁 계산 — 생년월일 기준 */
export function getSunSign(month, day) {
  const m = parseInt(month), d = parseInt(day);
  if ((m === 3  && d >= 21) || (m === 4  && d <= 19)) return SIGNS[0];
  if ((m === 4  && d >= 20) || (m === 5  && d <= 20)) return SIGNS[1];
  if ((m === 5  && d >= 21) || (m === 6  && d <= 21)) return SIGNS[2];
  if ((m === 6  && d >= 22) || (m === 7  && d <= 22)) return SIGNS[3];
  if ((m === 7  && d >= 23) || (m === 8  && d <= 22)) return SIGNS[4];
  if ((m === 8  && d >= 23) || (m === 9  && d <= 22)) return SIGNS[5];
  if ((m === 9  && d >= 23) || (m === 10 && d <= 23)) return SIGNS[6];
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return SIGNS[7];
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return SIGNS[8];
  if ((m === 12 && d >= 22) || (m === 1  && d <= 19)) return SIGNS[9];
  if ((m === 1  && d >= 20) || (m === 2  && d <= 18)) return SIGNS[10];
  return SIGNS[11];
}

/* 별자리 호환성 — 원소 기반 */
const COMPAT = {
  화: { 화:'최상', 풍:'좋음', 지:'보통', 수:'도전' },
  지: { 지:'최상', 수:'좋음', 풍:'보통', 화:'도전' },
  풍: { 풍:'최상', 화:'좋음', 수:'보통', 지:'도전' },
  수: { 수:'최상', 지:'좋음', 화:'보통', 풍:'도전' },
};
export function getCompatibility(signA, signB) {
  return COMPAT[signA.element]?.[signB.element] || '보통';
}

/* AI 프롬프트용 요약 */
export function astrologySummary(sign) {
  return `태양궁 ${sign.ko}(${sign.en}), 원소:${sign.element}, 지배행성:${sign.ruling}, 특성:${sign.traits.join('·')}`;
}
