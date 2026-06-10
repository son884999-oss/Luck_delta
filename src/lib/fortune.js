/* ================================================================
   천문 — AI 운세 엔진 (Gemini 연동 · 프롬프트 · 캐싱)
   원작의 기능 의도를 보존하고 주간/타로 모드를 추가했다.
================================================================ */
import {
  OHAENG, calculateIlju, getOhaeng, transformScore, todayStr, todayKey, weekRangeStr,
  calculateSaju, sajuSummaryLine, dailyFortuneScore, weeklyFortuneScore,
} from './saju.js';

export const API_MODEL = 'gemini-3.5-flash';
/* global process */ // Node(스크립트)에서도 import되는 모듈 — process는 typeof 가드로 안전하게 참조
// 브라우저(Vite): VITE_GEMINI_API_KEY · Node(스크립트/함수): process.env
const RAW_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  '여기에_API_키_입력';
export const apiKey = RAW_KEY;
export const hasApiKey = () => !!apiKey.trim() && apiKey.trim() !== '여기에_API_키_입력';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey.trim()}`;

/* ── 메뉴 정의 — 허브에서 사용 ──────────────────────────────── */
export const MODES = {
  fortune: { key:'fortune', title:'오늘의 운세',  sub:'오늘의 기운을 살펴보세요',      jewel:'amber',   group:'flow',  hasScore:true,  needsPartner:false },
  weekly:  { key:'weekly',  title:'주간 운세',    sub:'이번 주 흐름을 미리 살펴봐요',   jewel:'indigo',  group:'flow',  hasScore:true,  needsPartner:false },
  saju:    { key:'saju',    title:'평생 사주',    sub:'타고난 성격·재능·인생의 흐름',   jewel:'sky',     group:'self',  hasScore:true,  needsPartner:false },
  gunghap: { key:'gunghap', title:'궁합 보기',    sub:'두 사람의 인연과 어울림',        jewel:'rose',    group:'rel',   hasScore:true,  needsPartner:true  },
  tarot:   { key:'tarot',   title:'타로 한 장',   sub:'오늘의 카드를 뽑아보세요',        jewel:'emerald', group:'draw',  hasScore:false, needsPartner:false },
  monthly: { key:'monthly', title:'월간 운세',    sub:'이번 달 흐름과 기회를 미리',     jewel:'indigo',  group:'flow',  hasScore:true,  needsPartner:false },
  yearly:  { key:'yearly',  title:'올해의 운세',  sub:'한 해의 큰 흐름과 전환점',       jewel:'violet',  group:'flow',  hasScore:true,  needsPartner:false },
  wealth:  { key:'wealth',  title:'재물·금전운',  sub:'돈·투자·기회의 흐름',           jewel:'amber',   group:'flow',  hasScore:true,  needsPartner:false },
};

/* ── 타로 메이저 아르카나 22장 ──────────────────────────────── */
export const TAROT_DECK = [
  { n:0,  ko:'바보',            en:'The Fool',          kw:'시작·자유·모험' },
  { n:1,  ko:'마법사',          en:'The Magician',      kw:'창조·의지·재능' },
  { n:2,  ko:'여사제',          en:'High Priestess',    kw:'직관·비밀·내면' },
  { n:3,  ko:'여황제',          en:'The Empress',       kw:'풍요·사랑·결실' },
  { n:4,  ko:'황제',            en:'The Emperor',       kw:'안정·권위·책임' },
  { n:5,  ko:'교황',            en:'The Hierophant',    kw:'전통·지혜·인연' },
  { n:6,  ko:'연인',            en:'The Lovers',        kw:'사랑·선택·조화' },
  { n:7,  ko:'전차',            en:'The Chariot',       kw:'전진·승리·의지' },
  { n:8,  ko:'힘',              en:'Strength',          kw:'용기·인내·내공' },
  { n:9,  ko:'은둔자',          en:'The Hermit',        kw:'성찰·고독·통찰' },
  { n:10, ko:'운명의 수레바퀴', en:'Wheel of Fortune',  kw:'전환·운명·기회' },
  { n:11, ko:'정의',            en:'Justice',           kw:'균형·공정·결정' },
  { n:12, ko:'매달린 사람',     en:'The Hanged Man',    kw:'멈춤·관점·희생' },
  { n:13, ko:'죽음',            en:'Death',             kw:'끝·재생·변화' },
  { n:14, ko:'절제',            en:'Temperance',        kw:'조화·중용·치유' },
  { n:15, ko:'악마',            en:'The Devil',         kw:'욕망·집착·해방' },
  { n:16, ko:'탑',              en:'The Tower',         kw:'붕괴·각성·전환' },
  { n:17, ko:'별',              en:'The Star',          kw:'희망·치유·영감' },
  { n:18, ko:'달',              en:'The Moon',          kw:'불안·환상·직관' },
  { n:19, ko:'태양',            en:'The Sun',           kw:'기쁨·성공·활력' },
  { n:20, ko:'심판',            en:'Judgement',         kw:'부활·결산·각성' },
  { n:21, ko:'세계',            en:'The World',         kw:'완성·성취·통합' },
];
// 카드 이미지 경로 (public/tarot/NN.jpg — 라이더-웨이트 퍼블릭 도메인)
export const tarotImg = (n) => `/tarot/${String(n).padStart(2, '0')}.jpg`;
export const drawTarot = () => {
  const card = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
  const upright = Math.random() > 0.32; // 정방향 확률 ↑
  return { ...card, upright, img: tarotImg(card.n) };
};

/* ── 톤 & 페르소나 ──────────────────────────────────────────── */
const WARM = `\n톤 규칙: 친근하고 따뜻한 이웃 언니/형처럼. 부정적 내용도 반드시 재프레이밍('이런 날은 쉬어가는 게 보약이에요'). '~하지 마세요','~을 피하세요' 같은 금지/경고 표현 금지. 대신 '~하면 더 좋아요'. 한자 사용 금지, 순한글. 문장 앞 기호(•-*●) 금지.`;

// 프리미엄 리포트 전용 품질 규칙 — 진부한 비유 금지 + 명식 근거 + 솔직함(바넘 탈피)
const REPORT_VOICE = `\n[리포트 품질 규칙]
- 진부한 비유 금지: '등대', '햇살 같은', '씨앗을 뿌리면 꽃을 피우고 열매를 맺는다', '매화처럼', '거친 파도를 건너 평온한 바다' 같은 상투적 문구를 쓰지 말고 구체적인 상황·행동·장면으로 표현하세요. 리포트마다 비유가 똑같이 반복되면 안 됩니다.
- 명식 근거: 각 항목에서 최소 한 번은 해석의 근거가 된 기둥(년·월·일·시주)이나 천간·지지·오행을 일상어로 짧게 언급해, 실제 명식을 읽고 쓴 느낌을 주세요(전문용어 나열은 금지).
- 솔직함: 모든 것을 '사실은 장점'으로 포장하지 말고, 항목마다 약간 불편하더라도 도움이 되는 솔직한 관찰을 따뜻한 어조로 한 가지 담으세요. 누구에게나 들어맞는 막연한 칭찬은 피하고, 이 사람만의 구체적인 이야기를 쓰세요.
- 문장 시작 다양화: 모든 문단/문장을 '○○님은~'으로 시작하지 마세요. 대부분의 문단은 상황·장면·관찰로 시작하고, 이름 호명은 꼭 필요할 때만 가끔 쓰세요.
- 이름 표기 통일: 사용자를 부를 때는 항상 입력된 전체 이름으로(예: '손용범님'). 중간에 성을 떼어 '용범님'처럼 줄여 부르지 마세요.`;
const persona = (name, ilju, ohaeng) =>
  `당신은 ${name}님의 편에서 응원하는 따뜻한 명리학자 '천문'입니다. 일주 ${ilju}(본명오행 ${ohaeng}) 기반.`;

const S = (props, required) => ({ type:'OBJECT', properties:props, required });
const STR = { type:'STRING' };
const NUM = { type:'NUMBER' };
const ARR = { type:'ARRAY', items:{ type:'STRING' } };
const AOBJ = (props, required) => ({ type:'ARRAY', items:S(props, required) }); // 객체 배열

/* ── 프롬프트 빌더 ──────────────────────────────────────────── */
export function buildPrompt(mode, data, data2, userName, extra) {
  const ilju = calculateIlju(data.y, data.m, data.d, data.h, data.min);
  const ohaeng = getOhaeng(ilju);
  const today = todayStr();
  const base = persona(userName, ilju, ohaeng);

  if (mode === 'gunghap' && data2?.y) {
    const ilju2 = calculateIlju(data2.y, data2.m, data2.d, data2.h, data2.min);
    const ohaeng2 = getOhaeng(ilju2);
    const partnerName = extra?.partnerName || '상대방';
    return {
      system: `${base}\n두 사람의 궁합을 분석합니다. A(${userName}님): 일주 ${ilju}(${ohaeng}), B(${partnerName}님): 일주 ${ilju2}(${ohaeng2}). 오늘: ${today}.${WARM}\n필드: score(1~100), oneliner(15자 이내, 두 사람 관계 핵심 한 문장), comprehensive(3~5문장), loveText(애정궁합 3~4문장), communicationText(소통궁합 3~4문장), futureText(미래전망 3~4문장), relationFlow{early,stable,longterm 각 한 줄}, advice(${userName}님과 ${partnerName}님 각각에게 한 줄씩 조언), quote(두 사람을 위한 한마디), basisSummary(명리 근거 2~3줄).`,
      user: `${userName}님: ${data.y}년 ${data.m}월 ${data.d}일 ${data.h}시 ${data.min}분. ${partnerName}님: ${data2.y}년 ${data2.m}월 ${data2.d}일 ${data2.h}시 ${data2.min}분. 궁합 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, comprehensive:STR, loveText:STR, communicationText:STR, futureText:STR,
        relationFlow:S({ early:STR, stable:STR, longterm:STR }, ['early','stable','longterm']),
        advice:STR, quote:STR, basisSummary:STR },
        ['score','oneliner','comprehensive','loveText','communicationText','futureText','relationFlow','advice','quote','basisSummary']),
    };
  }

  if (mode === 'saju') {
    return {
      system: `${base} 평생 사주를 심층 분석합니다.${WARM}\n필드: score(타고난 사주 길흉 1~100), oneliner(${userName}님을 한 문장 15자 이내), personality(타고난 성격·기질 4~6문장), talent(재능·적성 4~6문장), wealth(평생 재물운 4~6문장), love(연애·결혼운 4~6문장), career(직업·사회운 4~6문장), health(건강 주의점 3~4문장), lifeFlow{early,middle,late 각 한 줄}, advice(인생 조언 3~4문장), quote(인생 지혜 한마디), basisSummary(명리 근거 2~3줄).`,
      user: `${userName}님, ${data.y}년 ${data.m}월 ${data.d}일 ${data.h}시 ${data.min}분 출생. 일주:${ilju}. 평생 사주 심층 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, personality:STR, talent:STR, wealth:STR, love:STR, career:STR, health:STR,
        lifeFlow:S({ early:STR, middle:STR, late:STR }, ['early','middle','late']),
        advice:STR, quote:STR, basisSummary:STR },
        ['score','oneliner','personality','talent','wealth','love','career','health','lifeFlow','advice','quote','basisSummary']),
    };
  }

  if (mode === 'weekly') {
    return {
      system: `${base} 이번 주(${weekRangeStr()}) 주간 운세를 분석합니다.${WARM}\n이번 주 종합 길흉 점수는 ${extra?.scoreHint ?? 80}점이에요(일진 기준). 이 점수 톤에 맞춰 일관되게 작성해 주세요.\n필드: score(이번 주 종합 1~100), oneliner(이번 주를 한 문장 15자 이내), overview(이번 주 총운 4~5문장), days{mon,tue,wed,thu,fri,sat,sun 각각 한 줄 운세}, bestDay(가장 좋은 요일 한국어 예 '수요일'), bestDayReason(이유 1문장), wealth(이번 주 재물 2~3문장), love(이번 주 인연 2~3문장), work(이번 주 일·학업 2~3문장), advice(이번 주 조언 2~3문장), quote(한마디).`,
      user: `${userName}님, 일주:${ilju}. 이번 주 주간 운세 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, overview:STR,
        days:S({ mon:STR, tue:STR, wed:STR, thu:STR, fri:STR, sat:STR, sun:STR }, ['mon','tue','wed','thu','fri','sat','sun']),
        bestDay:STR, bestDayReason:STR, wealth:STR, love:STR, work:STR, advice:STR, quote:STR },
        ['score','oneliner','overview','days','bestDay','bestDayReason','wealth','love','work','advice','quote']),
    };
  }

  if (mode === 'monthly') {
    const now = new Date();
    const mLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    return {
      system: `${base} 이번 달(${mLabel}) 월간 운세를 분석합니다.${WARM}\n필드: score(이번 달 종합 1~100), oneliner(이번 달을 한 문장 15자 이내), overview(이번 달 총운 4~5문장), phases{early,mid,late 각 한 줄: 상순(1~10일)·중순(11~20일)·하순(21일~말일)}, bestPeriod(가장 좋은 시기 예 '중순'), bestPeriodReason(이유 1문장), wealth(이번 달 재물 2~3문장), love(이번 달 인연 2~3문장), work(이번 달 일·학업 2~3문장), advice(이번 달 조언 2~3문장), quote(한마디).`,
      user: `${userName}님, 일주:${ilju}. ${mLabel} 월간 운세 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, overview:STR,
        phases:S({ early:STR, mid:STR, late:STR }, ['early','mid','late']),
        bestPeriod:STR, bestPeriodReason:STR, wealth:STR, love:STR, work:STR, advice:STR, quote:STR },
        ['score','oneliner','overview','phases','bestPeriod','bestPeriodReason','wealth','love','work','advice','quote']),
    };
  }

  if (mode === 'yearly') {
    const yLabel = `${new Date().getFullYear()}년`;
    return {
      system: `${base} 올해(${yLabel}) 한 해의 운세를 분석합니다.${WARM}\n필드: score(올해 종합 1~100), oneliner(올해를 한 문장 15자 이내), overview(올해 총운 4~5문장), quarters{q1,q2,q3,q4 각 한 줄: 1분기(1~3월)·2분기(4~6월)·3분기(7~9월)·4분기(10~12월)}, turningPoint(올해의 전환점 시기와 의미 1~2문장), wealth(올해 재물운 3~4문장), love(올해 인연·관계 3~4문장), career(올해 일·사회운 3~4문장), health(올해 건강 주의점 2~3문장), advice(올해 조언 3~4문장), quote(한마디), basisSummary(명리 근거 2~3줄).`,
      user: `${userName}님, 일주:${ilju}. ${yLabel} 올해의 운세 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, overview:STR,
        quarters:S({ q1:STR, q2:STR, q3:STR, q4:STR }, ['q1','q2','q3','q4']),
        turningPoint:STR, wealth:STR, love:STR, career:STR, health:STR, advice:STR, quote:STR, basisSummary:STR },
        ['score','oneliner','overview','quarters','turningPoint','wealth','love','career','health','advice','quote','basisSummary']),
    };
  }

  if (mode === 'wealth') {
    const now = new Date();
    const mLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    return {
      system: `${base} ${userName}님의 재물·금전운을 집중 분석합니다(기준: ${mLabel}).${WARM}\n필드: score(재물운 종합 1~100), oneliner(재물운을 한 문장 15자 이내), overview(타고난 재물 그릇과 흐름 4~5문장), incomeText(수입·재물이 들어오는 길 3~4문장), spendingText(지출·관리·재물 새는 곳 3~4문장), investText(투자·기회·재테크 방향 3~4문장), luckyMonth(재물운이 좋은 시기 예 '하반기'), luckyItem(재물을 부르는 것 한 가지 예 '동쪽 자리'), advice(재물을 키우는 조언 2~3문장), quote(한마디), basisSummary(명리 근거 2~3줄).`,
      user: `${userName}님, ${data.y}년 ${data.m}월 ${data.d}일 ${data.h}시 ${data.min}분. 일주:${ilju}. 재물·금전운 집중 분석 요청.`,
      schema: S({ score:NUM, oneliner:STR, overview:STR, incomeText:STR, spendingText:STR, investText:STR,
        luckyMonth:STR, luckyItem:STR, advice:STR, quote:STR, basisSummary:STR },
        ['score','oneliner','overview','incomeText','spendingText','investText','luckyMonth','luckyItem','advice','quote','basisSummary']),
    };
  }

  if (mode === 'tarot') {
    const c = extra?.card;
    const ori = c?.upright ? '정방향' : '역방향';
    return {
      system: `${base} 오늘 ${userName}님이 뽑은 타로 카드를 ${userName}님의 사주와 연결해 해석합니다. 카드: ${c?.ko}(${c?.en}) ${ori}, 키워드 ${c?.kw}. 오늘: ${today}.${WARM}\n필드: interpretation(이 카드가 오늘 ${userName}님에게 의미하는 바, 사주와 연결해 4~5문장), message(오늘의 메시지 2~3문장), advice(오늘 실천하면 좋은 한 가지), mood(오늘의 분위기 한 단어), luckyTip(행운을 부르는 작은 행동 한 줄).`,
      user: `${userName}님(일주 ${ilju})이 '${c?.ko}(${ori})' 카드를 뽑았습니다. 오늘의 타로 해석 요청.`,
      schema: S({ interpretation:STR, message:STR, advice:STR, mood:STR, luckyTip:STR },
        ['interpretation','message','advice','mood','luckyTip']),
    };
  }

  // fortune (오늘의 운세) — 기본
  return {
    system: `${base} 오늘(${today}) 운세를 분석합니다.${WARM}\n오늘의 길흉 점수는 ${extra?.scoreHint ?? 80}점이에요(일진 기준). 이 점수에 어울리는 톤·내용으로 일관되게 작성해 주세요.\n필드: oneliner(15자 이내), ohaengSummary(오행 기운 한 문장), comprehensive/wealthText/loveText/successText/healthText(각 3~5문장), actionTips{wealth,love,success,health 각 한 줄}, quote(오늘의 지혜 한마디), timeFlow{morning,afternoon,evening 각 한 줄}, luckyColor, luckyNumber(1~99), luckyFood, luckyStyle(코디 한 줄), basisSummary(근거 2~3줄), score(1~100).`,
    user: `${userName}님, ${data.y}년 ${data.m}월 ${data.d}일 ${data.h}시 ${data.min}분. 일주:${ilju}. 오늘:${today}. 운세 분석 요청.`,
    schema: S({ score:NUM, oneliner:STR, ohaengSummary:STR, comprehensive:STR, wealthText:STR, loveText:STR, successText:STR, healthText:STR,
      actionTips:S({ wealth:STR, love:STR, success:STR, health:STR }, ['wealth','love','success','health']),
      quote:STR, timeFlow:S({ morning:STR, afternoon:STR, evening:STR }, ['morning','afternoon','evening']),
      luckyColor:STR, luckyNumber:NUM, luckyFood:STR, luckyStyle:STR, basisSummary:STR },
      ['score','oneliner','ohaengSummary','comprehensive','wealthText','loveText','successText','healthText','actionTips','quote','timeFlow','luckyColor','luckyNumber','luckyFood','luckyStyle','basisSummary']),
  };
}

/* ── 캐시 키 ────────────────────────────────────────────────── */
const weekKeyStr = () => {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `week_${d.getFullYear()}_${week}`;
};
const monthKeyStr = () => { const d = new Date(); return `month_${d.getFullYear()}_${d.getMonth() + 1}`; };
const yearKeyStr = () => `year_${new Date().getFullYear()}`;
export function cacheKeyFor(mode, data, data2) {
  // 타로는 캐시하지 않음(매번 새로 뽑음)
  const dateKey = mode === 'saju' ? 'lifetime'
    : mode === 'weekly' ? weekKeyStr()
    : (mode === 'monthly' || mode === 'wealth') ? monthKeyStr()
    : mode === 'yearly' ? yearKeyStr()
    : todayKey();
  const partner = mode === 'gunghap' ? (data2?.y || '') : '';
  return `cm_cache_${mode}_${data.y}-${data.m}-${data.d}-${data.h}-${data.min}_${partner}_${dateKey}`;
}

/* ── 점수 히스토리 / 어제 점수 저장 ─────────────────────────── */
function saveScoreHistory(score) {
  try {
    const prevScore = localStorage.getItem('cm_ts');
    const prevDay = localStorage.getItem('cm_tk');
    if (prevScore && prevDay !== todayKey()) localStorage.setItem('cm_ys', prevScore);
    localStorage.setItem('cm_ts', String(score));
    localStorage.setItem('cm_tk', todayKey());
    const hist = JSON.parse(localStorage.getItem('cm_score_history') || '[]');
    const todayDate = new Date().toISOString().slice(0, 10);
    if (!hist.find(h => h.date === todayDate)) hist.push({ date: todayDate, score });
    localStorage.setItem('cm_score_history', JSON.stringify(hist.slice(-14)));
  } catch (e) {}
}
export const getYesterdayScore = () => {
  const v = localStorage.getItem('cm_ys');
  return v ? parseInt(v) : null;
};
export const hasTodayFortune = (birth) =>
  !!localStorage.getItem(cacheKeyFor('fortune', birth, null));

/* 캐시 정리 — 오늘 날짜가 아닌 날짜성 캐시 삭제(lifetime/season/week 유지) */
export function pruneCache() {
  const today = todayKey();
  Object.keys(localStorage)
    .filter(k => k.startsWith('cm_cache_') && !k.includes('lifetime') && !k.includes('_season_') && !k.includes('_week_') && !k.includes('_month_') && !k.includes('_year_'))
    .forEach(k => { if (!k.includes(today)) localStorage.removeItem(k); });
}


/* ── 분석 실행 — 캐시 우선, 없으면 Gemini 호출 ───────────────── */
export async function analyze({ mode, birth, birth2, userName, extra }) {
  const ilju = calculateIlju(birth.y, birth.m, birth.d, birth.h, birth.min);
  const mainOhaeng = getOhaeng(ilju);
  // 궁합 시 상대방 오행도 계산해 결과에 붙인다 (GunghapBody 오행 시각화에 필요)
  const ilju2 = (mode === 'gunghap' && birth2?.y)
    ? calculateIlju(birth2.y, birth2.m, birth2.d, birth2.h, birth2.min) : null;
  const partnerOhaeng = ilju2 ? getOhaeng(ilju2) : null;
  const attach = (obj) => {
    obj.ilju = ilju; obj.mainOhaeng = mainOhaeng; obj.analysisMode = mode;
    if (partnerOhaeng) { obj.partnerOhaeng = partnerOhaeng; obj.partnerIlju = ilju2; }
    if (extra?.card) obj.tarot = extra.card;
    return obj;
  };

  // 오늘·이번주 점수는 일진×본명으로 결정(매번 변동·일관). AI엔 톤 힌트로만 전달.
  const ex = { ...(extra || {}) };
  if (mode === 'fortune') ex.scoreHint = dailyFortuneScore(birth);
  else if (mode === 'weekly') ex.scoreHint = weeklyFortuneScore(birth);

  // 캐시 (타로 제외) — 캐시에도 결정 점수를 즉시 덮어써 '오늘 이미 본' 운세도 새 점수 반영
  if (mode !== 'tarot') {
    const key = cacheKeyFor(mode, birth, birth2);
    const cached = localStorage.getItem(key);
    if (cached) { try {
      const obj = attach({ ...JSON.parse(cached), _cached: true });
      if (mode === 'fortune') { obj.score = ex.scoreHint; saveScoreHistory(obj.score); }
      else if (mode === 'weekly') obj.score = ex.scoreHint;
      return obj;
    } catch (e) {} }
  }

  const { system, user, schema } = buildPrompt(mode, birth, birth2, userName, ex);

  // 단일 호출(30초 타임아웃) — 타입 에러(code)로 실패 분류
  const callOnce = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let resp;
    try {
      resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') { const e = new Error('응답 시간이 너무 길어요. 잠시 후 다시 시도해 주세요.'); e.code = 'timeout'; throw e; }
      const e = new Error('인터넷 연결을 확인하고 다시 시도해 주세요.'); e.code = 'network'; throw e;
    }
    clearTimeout(timer);
    const json = await resp.json();
    if (resp.status === 400) { const e = new Error('API 키가 유효하지 않아요.'); e.code = 'apikey'; throw e; }
    if (resp.status === 429) { const e = new Error('rate'); e.code = 'rate'; throw e; }
    if (!resp.ok) { const e = new Error(json.error?.message || `서버 오류 (${resp.status})`); e.code = 'server'; throw e; }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) { const e = new Error('empty'); e.code = 'empty'; throw e; }
    return JSON.parse(text);
  };

  // 일시 오류(과부하 5xx·429·빈응답)는 짧게 backoff 후 재시도. 키 오류·타임아웃은 즉시 포기.
  let raw, lastErr;
  for (let i = 0; i < 3; i++) {
    try { raw = await callOnce(); break; }
    catch (e) {
      if (e.code === 'apikey' || e.name === 'AbortError') throw e;
      lastErr = e;
      if (i < 2) await new Promise(r => setTimeout(r, 900 * (i + 1)));
    }
  }
  if (raw === undefined) throw lastErr;

  const parsed = attach(raw);
  // 오늘·이번주는 결정 점수로 덮어쓰기(매일 변동), 그 외는 AI 점수 S-커브 보정
  if (mode === 'fortune' || mode === 'weekly') parsed.score = ex.scoreHint;
  else if (typeof parsed.score === 'number') parsed.score = transformScore(parsed.score);

  if (mode !== 'tarot') {
    try { localStorage.setItem(cacheKeyFor(mode, birth, birth2), JSON.stringify(parsed)); } catch (e) {}
  }
  if (mode === 'fortune') saveScoreHistory(parsed.score);
  return parsed;
}

/* ================================================================
   프리미엄 리포트 생성 (깊은 평생 리포트 · Gemini)
================================================================ */
async function callGemini({ system, user, schema }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000); // 리포트 파트는 응답이 느릴 수 있어 55초
  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      }),
    });
  } catch (fetchErr) {
    clearTimeout(timer);
    // 네트워크 오류(Failed to fetch, net::ERR_* 등) → 친화적 메시지
    if (fetchErr.name === 'AbortError') { const e = new Error('응답 시간이 너무 길어요. 잠시 후 다시 시도해 주세요.'); e.code = 'timeout'; throw e; }
    const e = new Error('인터넷 연결을 확인하고 다시 시도해 주세요.'); e.code = 'network'; throw e;
  }
  clearTimeout(timer);
  const json = await resp.json();
  if (resp.status === 400) { const e = new Error('API 키가 유효하지 않아요.'); e.code = 'apikey'; throw e; }
  if (resp.status === 429) { const e = new Error('rate'); e.code = 'rate'; throw e; }
  if (!resp.ok) { const e = new Error(json.error?.message || `서버 오류 (${resp.status})`); e.code = 'server'; throw e; }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) { const e = new Error('empty'); e.code = 'empty'; throw e; }
  return JSON.parse(text);
}

// 일시적 오류(과부하·429·빈응답)는 짧게 backoff 후 재시도. 키 오류는 즉시 포기.
export async function callGeminiRetry(args, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await callGemini(args); }
    catch (e) {
      if (e.code === 'apikey' || e.code === 'timeout') throw e; // 키 오류·타임아웃은 재시도 무의미
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey.trim()}`;

const SIJIN_NAMES = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
const SIJIN_RANGES = ['23–01시', '01–03시', '03–05시', '05–07시', '07–09시', '09–11시', '11–13시', '13–15시', '15–17시', '17–19시', '19–21시', '21–23시'];
const fmtBirth = (b) => {
  let s = `${b.y}년 ${b.m}월 ${b.d}일`;
  if (b.h !== '모름' && b.h !== '' && b.h != null) {
    const h = parseInt(b.h);
    if (!isNaN(h)) {
      // 시는 12시진으로 표기(예: 3~5시 → 인시). 중앙값 시각 대신 전통 시진 이름.
      const ji = (h >= 23 || h < 1) ? 0 : Math.floor((h + 1) / 2) % 12;
      s += ` ${SIJIN_NAMES[ji]}(${SIJIN_RANGES[ji]})`;
    }
  }
  return s;
};

const ELEM_PLAIN = { 목:'나무', 화:'불', 토:'흙', 금:'쇠', 수:'물' };

// 깊은 리포트 — part별 프롬프트. saju(calculateSaju 결과)를 주입해 일반론을 막는다.
export function buildReportPrompt(part, birth, userName, saju) {
  const ilju = saju.ilju;
  const base = persona(userName, ilju, saju.dayElem);
  const YEAR = new Date().getFullYear();

  const domPlain  = saju.dominant.map(k => ELEM_PLAIN[k]).join('·');
  const lackPlain = saju.lacking.map(k => ELEM_PLAIN[k]).join('·');
  const ground = `\n[분석 근거 — 반드시 아래 ${userName}님의 명식에 기반해, 일반론이 아닌 이 사람만의 구체적 해석을 쓰세요]\n${sajuSummaryLine(saju)}\n강한 기운: ${domPlain || '비교적 고른 편'}${lackPlain ? ` · 부족한 기운: ${lackPlain}` : ''}.`;
  const PLAIN = `\n표현 규칙: 오행은 '나무·불·흙·쇠·물' 같은 일상어로만 풀어 쓰고, 한자나 전문용어(비겁·식상·재성·관성 등)는 본문에 절대 쓰지 마세요. 문단은 빈 줄(줄바꿈 두 번)로 구분하고, 문장 수를 채우려 같은 말을 늘리지 말고 밀도 있게 쓰세요. ${userName}님의 이름을 본문에 자연스럽게 넣어 개인화된 느낌을 주세요.`;
  const TONE = `\n이 리포트의 목소리: 한 사람의 인생 서사를 담담히 들려주는 톤.`;
  const ctx = `${WARM}${PLAIN}${REPORT_VOICE}${TONE}${ground}`;

  if (part === 'reading') {
    return {
      system: `${base}\n${userName}님을 위한 프리미엄 평생 사주 리포트의 도입부입니다.${ctx}

밀도 지침 — 문장 수를 '채우려고' 비슷한 말을 늘리거나 반복하지 마세요(밀도가 낮아지는 게 가장 큰 감점). 추상적 미사여구보다 구체적 기질·상황으로. ★총평·성격·재능은 서로 다른 각도여야 하며 내용이 겹치면 안 됩니다.
- sajuReading: 빈 줄로 나뉜 3~4문단(합쳐 10~12문장). 태어난 순간의 하늘·타고난 기질·인생의 큰 흐름을 ${userName}님의 인생 이야기처럼 서사적으로(여기서만 다루고 성격·재능과 겹치지 말 것).
- iljuLine: ${userName}님만을 위한 시적인 한 문장(20자 내외, 따옴표 없이, 명언처럼 독립적으로 읽혀야 함).
- ohaengReading: 오행 분포의 강함과 부족함이 성격·관계·삶의 패턴에 어떻게 나타나는지 5~6문장으로 구체적으로.
- personalityText: 7~8문장(2~3문단). 장점뿐 아니라 내면의 갈등과 성장 방향을 — 총평과 다른 '성격'에 집중.
- keywords: 성향을 압축한 키워드 6개(각 2~6자).
- talentText: 6~7문장(2~3문단). 재능의 씨앗이 어떤 상황에서 발현되는지 구체적으로(성격과 겹치지 말 것).
- talentFields: 어울리는 분야·재능 키워드 6개(각 2~10자).`,
      user: `${userName}님, ${fmtBirth(birth)} 출생, 일주 ${ilju}. 리포트 도입부(사주 총평·일주 한 줄·오행 해석·성격·재능)를 작성해 주세요.`,
      schema: S({
        sajuReading: STR, iljuLine: STR, ohaengReading: STR,
        personalityText: STR, keywords: ARR, talentText: STR, talentFields: ARR,
      }, ['sajuReading','iljuLine','ohaengReading','personalityText','keywords','talentText','talentFields']),
    };
  }

  if (part === 'fortunes') {
    const subsec = S({ title: STR, text: STR }, ['title', 'text']);
    const area = S({
      sections: { type: 'ARRAY', items: subsec },
      highlight: STR, tip: STR, caution: STR,
    }, ['sections', 'highlight', 'tip', 'caution']);
    return {
      system: `${base}\n프리미엄 리포트 — 분야별 평생 운세입니다.${ctx}

각 분야(wealth 재물, love 애정·인연, career 직업·사회, health 건강)마다:
- sections: 소목차 배열(3~4개). 각 항목은 title(소목차 제목, 8~16자, 예: '20대의 재물 흐름', '기회가 오는 시기', '반복되는 함정')과 text(그 소목차의 본문 3~5문장). 소목차끼리 시기·주제·관점이 뚜렷이 달라야 합니다.
- highlight: 그 분야에서 ${userName}님이 기억해야 할 핵심 한 문장(35자 이내, 힘이 있어야 함).
- tip: 지금 당장 실천할 수 있는 구체적인 작은 행동 한 줄(막연한 조언 금지, '매주 화요일 가계부를 써보세요'처럼 구체적으로).
- caution: 이 분야에서 ${userName}님이 반복하기 쉬운 실수나 함정을 따뜻하게 한 줄로(경고가 아닌 배려의 어조로).`,
      user: `${userName}님, ${fmtBirth(birth)} 출생, 일주 ${ilju}. 재물·애정·직업·건강 분야별 평생 운세를 소목차 구조로 작성해 주세요.`,
      schema: S({ wealth: area, love: area, career: area, health: area }, ['wealth','love','career','health']),
    };
  }

  if (part === 'quarters') {
    const qObj = S({ theme: STR, text: STR, focus: STR, luckyKeyword: STR }, ['theme','text','focus','luckyKeyword']);
    return {
      system: `${base}\n프리미엄 리포트 — ${YEAR}년 분기별(3개월 단위) 운세입니다.${ctx}

${YEAR}년을 4분기로 나눕니다(q1=1~3월, q2=4~6월, q3=7~9월, q4=10~12월). 각 분기마다:
- theme: 그 분기를 한 마디로 압축하는 2~5자 키워드(예: '새 출발', '결실의 시기').
- text: 2~3문장으로 그 분기에 집중하면 좋은 일을 구체적으로. ★중요: '유연하게 받아들이세요' 같은 추상적 비유는 금지하고, 반드시 '이직·이사 같은 환경 변화', '저축·정리', '사람을 새로 만나는 자리'처럼 실제 행동·상황 단어로 쓰세요. 분기마다 내용이 뚜렷이 달라야 합니다.
- focus: 그 분기에 집중할 한 가지(12자 이내).
- luckyKeyword: 그 분기의 행운 키워드 한 단어(색·방향·사물 등, 6자 이내).`,
      user: `${userName}님, 일주 ${ilju}. ${YEAR}년 1분기부터 4분기까지 분기별 운세를 작성해 주세요.`,
      schema: S({ q1: qObj, q2: qObj, q3: qObj, q4: qObj }, ['q1', 'q2', 'q3', 'q4']),
    };
  }

  // future — 인생 흐름·향후 5년·조언·맺음말
  return {
    system: `${base}\n프리미엄 리포트 — 인생의 흐름과 미래입니다.${ctx}

분량 지침:
- lifeEarly·lifeMid·lifeLate: 각 2~3문장. 각 시기의 주된 과제와 조심할 점을 핵심만 간결하게. 나이대(20대, 30대 등)를 언급해 체감되게.
- years: ${YEAR}년부터 딱 3년치(${YEAR}, ${YEAR + 1}, ${YEAR + 2}). 각각:
  · keyword(그 해의 핵심 2~4자, 예: '새로운 시작', '안정의 다짐')
  · text(★단 1문장. 그 해에 무엇을 하면 좋은지를 구체적 행동·상황으로. '변화를 유연하게' 같은 추상 비유 금지 — '이직·이사처럼 환경을 바꾸는 결정에 유리한 해', '큰 지출보다 저축·정리에 집중하면 좋은 해'처럼.)
  · mark(3년 중 가장 중요한 전환점이 되는 단 한 해에만 '전환점' 또는 '기회'를 넣고, 나머지 두 해는 빈 문자열 '').
- advice: 빈 줄로 나뉜 3~4문단. ${userName}님이 평생 간직할 만한 진심 어린 조언. 마지막 문단은 용기를 주는 문장으로 끝내세요.
- closing: ${userName}님을 향한 시적이고 따뜻한 맺음말 3~4문장(따옴표 없이, 리포트의 마지막 페이지에 크게 인쇄될 문장들이에요).`,
    user: `${userName}님, 일주 ${ilju}. 초년·중년·말년의 흐름, ${YEAR}년부터 향후 3년, 인생 조언, 맺음말을 작성해 주세요.`,
    schema: S({
      lifeEarly: STR, lifeMid: STR, lifeLate: STR,
      years: AOBJ({ keyword: STR, text: STR, mark: STR }, ['keyword','text','mark']),
      advice: STR, closing: STR,
    }, ['lifeEarly','lifeMid','lifeLate','years','advice','closing']),
  };
}

// 깊은 리포트 데이터 생성 — 템플릿(emailTemplate/reportPdf)이 쓰는 모양으로 반환
export async function generateReport(birth, userName = '천문') {
  const saju = calculateSaju(birth);
  const oh = OHAENG[saju.dayElem] || OHAENG['토'];
  const [reading, fort, quartersRaw, future] = await Promise.all([
    callGeminiRetry(buildReportPrompt('reading', birth, userName, saju)),
    callGeminiRetry(buildReportPrompt('fortunes', birth, userName, saju)),
    callGeminiRetry(buildReportPrompt('quarters', birth, userName, saju)),
    callGeminiRetry(buildReportPrompt('future', birth, userName, saju)),
  ]);
  const now = new Date();
  const YEAR = now.getFullYear();
  const QLABELS = [['1분기', '1~3월'], ['2분기', '4~6월'], ['3분기', '7~9월'], ['4분기', '10~12월']];
  const quarters = QLABELS.map(([label, range], i) => {
    const q = quartersRaw['q' + (i + 1)] || {};
    return { label, range, theme: q.theme || '', text: q.text || '', focus: q.focus || '', luckyKeyword: q.luckyKeyword || '' };
  });
  // 이번 분기(현재 월 기준) — 리포트엔 '이번 분기'만 보여 페이지가 깔끔하다
  const curQ = Math.floor(now.getMonth() / 3);
  const currentQuarter = quarters[curQ] || quarters[0];
  const years = (future.years || []).slice(0, 3).map((y, i) => ({
    label: String(YEAR + i), keyword: y.keyword || '', text: y.text || '', mark: y.mark || '',
  }));

  return {
    nickname: userName, birthText: fmtBirth(birth), year: YEAR,
    date: `${YEAR}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
    saju,                                 // 명식 (네 기둥 + 오행 분포)
    ilju: saju.ilju, tti: saju.tti,
    ohaengPlain: oh.plain, ohaengMeaning: oh.meaning,
    // AI 콘텐츠 (도입부)
    sajuReading: reading.sajuReading, iljuLine: reading.iljuLine, ohaengReading: reading.ohaengReading,
    personality: reading.personalityText, keywords: reading.keywords || [],
    talent: reading.talentText, talentFields: reading.talentFields || [],
    // 분야별 (각 {text, highlight, tip})
    wealth: fort.wealth, love: fort.love, career: fort.career, health: fort.health,
    // 흐름·미래
    lifeEarly: future.lifeEarly, lifeMid: future.lifeMid, lifeLate: future.lifeLate,
    quarters, currentQuarter, years,
    advice: future.advice, closing: future.closing,
    // 하위호환 별칭 (이메일 라이트 등)
    sajuOverview: reading.sajuReading,
    next5years: years.map(y => `${y.label}년 — ${y.text}`).join('\n\n'),
  };
}

/* ================================================================
   궁합 심층 리포트 생성 (두 사람의 인연 심층 분석 · Gemini)
   signature/study와 동일 위계의 세 번째 프리미엄 리포트(type='gunghap').
================================================================ */
export async function generateGunghapReport(birth, birth2, userName = '천문', partnerName = '상대방') {
  const saju1 = calculateSaju(birth);
  const saju2 = calculateSaju(birth2);
  const ilju1 = saju1.ilju, ilju2 = saju2.ilju;
  const oh1 = OHAENG[saju1.dayElem] || OHAENG['토'];
  const oh2 = OHAENG[saju2.dayElem] || OHAENG['토'];
  const base = persona(userName, ilju1, saju1.dayElem);
  const birthText1 = fmtBirth(birth), birthText2 = fmtBirth(birth2);
  const ctx = `${WARM}\n표현 규칙: 오행은 '나무·불·흙·쇠·물' 일상어로만, 한자·전문용어 금지. 두 사람 이름(${userName}님, ${partnerName}님)을 구체적으로 언급해 개인화된 느낌을 줘.${REPORT_VOICE}\n이 리포트의 목소리: 두 사람의 상호작용과 관계 역학에 집중하는 톤.`;
  const pairCtx = `[두 사람 명식]\n${userName}님: ${birthText1} · 일주 ${ilju1} · ${oh1.plain} 기운(강한 기운 ${(saju1.dominant||[]).map(k=>ELEM_PLAIN[k]).join('·')||'고른 편'})\n${partnerName}님: ${birthText2} · 일주 ${ilju2} · ${oh2.plain} 기운(강한 기운 ${(saju2.dominant||[]).map(k=>ELEM_PLAIN[k]).join('·')||'고른 편'})`;

  const [p1, p2] = await Promise.all([
    // 파트 1 — 관계 본질·애정·소통·갈등
    callGeminiRetry({
      system: `${base}\n${userName}님과 ${partnerName}님의 궁합 심층 리포트 — 관계 본질·애정·소통 파트입니다.${ctx}

밀도 지침 — 정해진 문장 수를 '채우려고' 비슷한 말을 늘리거나 반복하지 마세요(그게 가장 큰 감점입니다). '흐름에 몸을 맡기듯', '조화를 이루며' 같은 추상적 비유 대신 실제 행동·상황·장면("같이 여행 계획을 짤 때", "한쪽이 침묵으로 화를 표현할 때")으로 쓰세요. ★각 항목은 서로 다른 각도를 다뤄야 하며, 다른 항목에서 한 말을 되풀이하지 마세요. 여러 문단은 빈 줄(줄바꿈 두 번)로 구분합니다.
- overview: 5~6문장. 두 사람이 어떤 점에서 끌리고 어떤 점에서 부딪히는지 — 관계의 '핵심 한 가지'를 또렷이.
- loveDynamic: 5~6문장. 애정이 깊어지는 구체적 계기와, 식기 쉬운 순간을 장면으로.
- communicationStyle: 5~6문장. 말이 잘 통하는 주제 vs 오해가 생기는 구조를 대비해서.
- conflictPattern: 갈등 유형 2~3가지, 각 2문장(상황 + 왜 그런지). 나열식으로 또렷이.
- conflictSolution: 4~5문장. 위 갈등마다 1:1로 대응되는 실질적 화해 행동을.
- relationshipStrength: 4~5문장. 다른 항목에 없는, 이 관계만의 강점 하나를 깊게.`,
      user: `${pairCtx}\n두 사람 관계의 본질, 애정 역학, 소통 방식, 갈등 패턴과 해소법, 관계의 강점을 작성해 주세요.`,
      schema: S({
        overview: STR, loveDynamic: STR, communicationStyle: STR,
        conflictPattern: STR, conflictSolution: STR, relationshipStrength: STR,
      }, ['overview','loveDynamic','communicationStyle','conflictPattern','conflictSolution','relationshipStrength']),
    }),
    // 파트 2 — 미래·성장·타이밍·개인 조언
    callGeminiRetry({
      system: `${base}\n${userName}님과 ${partnerName}님의 궁합 심층 리포트 — 미래·성장 파트입니다.${ctx}

밀도 지침 — 문장 수를 채우려 비슷한 말을 반복하지 마세요. 추상적 비유 대신 실제 행동·상황으로. ★각 항목은 서로 다른 각도를 다루고 되풀이하지 마세요. 여러 문단은 빈 줄로 구분합니다.
- growthTogether: 5~6문장. 서로에게서 배울 점과 함께 세울 구체적 공동 목표를.
- chemistry: 두 사람의 케미를 5개 지표로 진단합니다. 각 지표는 level(1~5 정수, 5가 가장 잘 맞음)과 text(★단 1문장, 두 사람 오행/기질에 근거해 왜 그 점수인지 구체적으로 — '둘 다 표현이 서툴러 마음이 늦게 닿아요'처럼). 다섯 지표는 서로 다른 면을 봐야 하며 점수도 적당히 달라야 합니다(전부 4~5점 금지):
  · affection(애정 표현) · talk(대화 호흡) · values(가치관·인생관) · rhythm(생활 리듬·속도) · recovery(갈등 회복력)
- compatibilityScore: 두 사람 궁합 점수(1~100, 오행 상생/상극 기반으로 계산). 위 chemistry 5지표와 모순되지 않게.
- adviceForA: 4~5문장. ${userName}님에게만 주는 개인 조언(상대방을 이해하는 방법, 더 좋은 파트너가 되는 법).
- adviceForB: 4~5문장. ${partnerName}님에게만 주는 개인 조언.
- closing: 3~4문장. 두 사람이 함께하는 여정을 응원하는 시적이고 따뜻한 맺음말(따옴표 없이).`,
      user: `${pairCtx}\n함께 성장하는 방향, 두 사람의 케미 5대 지표 진단, 궁합 점수, 각자에 대한 조언, 맺음말을 작성해 주세요.`,
      schema: S({
        growthTogether: STR,
        chemistry: S({
          affection: S({ level: NUM, text: STR }, ['level','text']),
          talk:      S({ level: NUM, text: STR }, ['level','text']),
          values:    S({ level: NUM, text: STR }, ['level','text']),
          rhythm:    S({ level: NUM, text: STR }, ['level','text']),
          recovery:  S({ level: NUM, text: STR }, ['level','text']),
        }, ['affection','talk','values','rhythm','recovery']),
        compatibilityScore: NUM,
        adviceForA: STR, adviceForB: STR, closing: STR,
      }, ['growthTogether','chemistry','compatibilityScore','adviceForA','adviceForB','closing']),
    }),
  ]);

  const now = new Date();
  return {
    reportType: 'gunghap',
    nickname: userName, partnerName,
    birthText: birthText1, birthText2,
    tti: saju1.tti,
    ilju: ilju1, ilju2,
    ohaengPlain: oh1.plain, ohaengMeaning: oh1.meaning,
    ohaengPlain2: oh2.plain, ohaengMeaning2: oh2.meaning,
    saju: saju1, saju2,
    date: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
    ...p1, ...p2,
  };
}

/* ================================================================
   학습 상세 리포트 생성 (사주 기반 학습 전략 · Gemini)
   signature와 동일 위계의 두 번째 프리미엄 리포트(type='study').
================================================================ */
export async function generateStudyReport(birth, userName = '천문') {
  const saju = calculateSaju(birth);
  const ilju = saju.ilju;
  const base = persona(userName, ilju, saju.dayElem);
  const domPlain = saju.dominant.map(k => ELEM_PLAIN[k]).join('·');
  const lackPlain = saju.lacking.map(k => ELEM_PLAIN[k]).join('·');
  const ground = `\n[분석 근거 — ${userName}님 명식에 기반한 구체적 해석]\n${sajuSummaryLine(saju)}\n강한 기운: ${domPlain || '고른 편'}${lackPlain ? ` · 부족한 기운: ${lackPlain}` : ''}.`;
  const PLAIN = `\n표현 규칙: 오행은 '나무·불·흙·쇠·물' 같은 일상어로만, 한자·전문용어 금지. 따뜻하고 구체적으로.`;
  const TONE = `\n이 리포트의 목소리: 배움과 성장을 돕는 학습 코치 톤.`;
  const ctx = `${WARM}${PLAIN}${REPORT_VOICE}${TONE}${ground}`;

  const [p1, p2] = await Promise.all([
    callGeminiRetry({
      system: `${base}\n${userName}님을 위한 '학습 상세 리포트'의 기질·전략 파트입니다.${ctx}

밀도 지침 — 정해진 문장 수를 '채우려고' 비슷한 말을 늘리거나 반복하지 마세요(그게 가장 큰 감점입니다). 추상적 설명 대신 학생이 바로 따라 할 수 있는 구체적 행동·상황("형광펜 대신 빈 종이에 외운 걸 적어보기", "밤 11시 이후엔 새 단원 시작 금지")으로 쓰세요. ★각 항목은 서로 다른 각도를 다뤄야 합니다 — 공부법·학습 환경·기억력은 내용이 겹치지 않게 또렷이 구분하세요. 여러 문단은 빈 줄(줄바꿈 두 번)로 구분합니다.
- brainTypeDesc: 5~6문장. ${userName}님 두뇌가 정보를 받아들이는 방식과, 최고로 작동하는 한 가지 상황을 또렷이.
- subjectStrengths: 5~6문장. 잘 맞는 과목 1~2개의 이유 + 주의할 과목 1개의 극복법(다른 과목 나열 금지).
- studyMethod: 단계별 6~7문장. ${userName}님에게 맞는 공부법과, 절대 하면 안 되는 공부법 1개.
- bestTime.morning/afternoon/evening: 각 2~3문장. 그 시간대 두뇌 상태와 그때 할 학습 활동 1가지.
- environment: 4~5문장. 공간·소리·자리 등 '환경'에만 집중(공부법과 겹치지 말 것).
- memoryTips: 4~5문장. 암기가 잘 되는 상황과 안 되는 상황을 대비한 ${userName}님만의 방법.
- slumpRecovery: 4~5문장. 의욕이 바닥날 때 회복하는 단계별 행동.
- distractionPatterns: 방해 패턴 2~3가지를 각 2~3문장(상황 + 왜 그런지 + 빠져나오는 법). 예: '시험 전날 책상 정리 충동', '한 문제에 매달려 시간 쓰는 경향'. distractionKeywords: 이 패턴을 압축한 키워드 3개(각 4~8자).`,
      user: `${userName}님, ${fmtBirth(birth)} 출생, 일주 ${ilju}. 타고난 두뇌 유형·잘 맞는 과목 적성·최적 공부법·집중 시간대·학습 환경·기억력 강화·슬럼프 극복·집중 방해 패턴을 작성해 주세요.`,
      schema: S({
        brainType: STR, brainTypeDesc: STR, brainKeywords: ARR,
        subjectList: ARR, subjectStrengths: STR, studyMethod: STR,
        bestTime: S({ morning: STR, afternoon: STR, evening: STR }, ['morning', 'afternoon', 'evening']),
        environment: STR, memoryTips: STR, slumpRecovery: STR,
        distractionPatterns: STR, distractionKeywords: ARR,
      }, ['brainType', 'brainTypeDesc', 'brainKeywords', 'subjectList', 'subjectStrengths', 'studyMethod', 'bestTime', 'environment', 'memoryTips', 'slumpRecovery', 'distractionPatterns', 'distractionKeywords']),
    }),
    callGeminiRetry({
      system: `${base}\n'학습 상세 리포트'의 시기 전략·응원 파트입니다.${ctx}

밀도 지침 — 문장 수를 채우려 비슷한 말을 반복하지 마세요. 추상적 설명 대신 바로 실천할 행동으로. ★각 항목은 서로 다른 각도를 다루고 되풀이하지 마세요. 여러 문단은 빈 줄로 구분합니다.
- monthlyEnergy: 5~6문장. 앞으로 수개월 중 언제 몰아붙이고 언제 쉴지를 시기별로 또렷이.
- examStrategy.d100/d60/d30/d7: 각 2~3문장. 그 시기에 할 것 1가지 + 하면 안 되는 것 1가지.
- finalAdvice: 6~7문장. 성적보다 중요한 것을 포함해, ${userName}님이 시험기에 붙들 본질 한두 가지를.
- closingQuote: ${userName}님에게만 건네는 한 문장의 응원(따옴표 없이, 시험장 입구에 붙여도 좋을 문장).`,
      user: `${userName}님, 일주 ${ilju}. 이번 시기 학습 에너지, 시험 단계별(D-100 이상·D-60·D-30·D-7) 전략, 마무리 응원과 한마디를 작성해 주세요.`,
      schema: S({
        monthlyEnergy: STR,
        examStrategy: S({ d100: STR, d60: STR, d30: STR, d7: STR }, ['d100', 'd60', 'd30', 'd7']),
        finalAdvice: STR, closingQuote: STR,
      }, ['monthlyEnergy', 'examStrategy', 'finalAdvice', 'closingQuote']),
    }),
  ]);

  const now = new Date();
  return {
    reportType: 'study',
    nickname: userName, birthText: fmtBirth(birth), ilju: saju.ilju, tti: saju.tti, saju,
    date: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
    ...p1, ...p2,
  };
}

/* ================================================================
   점성술 AI 해석
================================================================ */
export async function analyzeAstrology({ userName = '천문', sunSign, sajuIlju }) {
  const system = `당신은 동서양 점성술과 명리학을 모두 아는 따뜻한 점성술사 '천문'입니다.${WARM}
필드:
- personality: 태양궁 ${sunSign.ko}의 핵심 성격 5~6문장.
- strengths: 강점 키워드 5개 배열(각 2~5자).
- challenges: 내면의 도전 3~4문장.
- love: 연애 스타일 4~5문장.
- career: 직업 적성 4~5문장.
- todayMessage: 오늘 ${userName}님에게 전하는 메시지 2~3문장.
- eastWestSynergy: 사주(${sajuIlju || '미입력'})와 태양궁(${sunSign.ko})의 조화 3~4문장.
- quote: ${sunSign.ko}를 위한 한마디(30자 이내).`;
  const user = `${userName}님의 태양궁은 ${sunSign.ko}(${sunSign.en}), 원소:${sunSign.element}, 지배행성:${sunSign.ruling}. 점성술 해석을 부탁드려요.`;
  return callGeminiRetry({ system, user,
    schema: S({ personality:STR, strengths:ARR, challenges:STR, love:STR, career:STR, todayMessage:STR, eastWestSynergy:STR, quote:STR },
      ['personality','strengths','challenges','love','career','todayMessage','eastWestSynergy','quote']) });
}

/* ================================================================
   자미두수 AI 해석
================================================================ */
export async function analyzeZiwei({ userName = '천문', ziwei, sajuIlju }) {
  const palaceSummary = (ziwei.palaces || [])
    .filter(p => p.majorStars && p.majorStars.length > 0)
    .map(p => `${p.name}(${p.majorStars.map(s => s.name).join('·')})`)
    .join(', ');
  const system = `당신은 자미두수와 사주명리를 모두 아는 따뜻한 명리학자 '천문'입니다.${WARM}
필드:
- overview: 명반 전체 특성 5~6문장. 명궁 주성(${ziwei.mainStar?.name || '미입력'})과 오행국(${ziwei.fiveElements || ''})을 중심으로.
- personality: 명궁에서 읽히는 기질 4~5문장.
- wealth: 재백궁 재물운 4~5문장.
- career: 관록궁 직업운 4~5문장.
- love: 부처궁 연애운 4~5문장.
- strengths: 강점 키워드 5개 배열.
- advice: 자미두수의 지혜 3~4문장.
- quote: 이 명반을 한 문장으로(30자 이내).`;
  const user = `${userName}님의 자미두수: 명궁 주성 ${ziwei.mainStar?.name || '없음'}, 오행국 ${ziwei.fiveElements || ''}, 궁 배치: ${palaceSummary}. 사주 일주: ${sajuIlju || '미입력'}.`;
  return callGeminiRetry({ system, user,
    schema: S({ overview:STR, personality:STR, wealth:STR, career:STR, love:STR, strengths:ARR, advice:STR, quote:STR },
      ['overview','personality','wealth','career','love','strengths','advice','quote']) });
}
