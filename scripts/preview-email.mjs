/* 이메일 미리보기 (오프라인 mock · Gemini 호출 없음). 실행: node scripts/preview-email.mjs
   email_preview.png(전체 HTML 폴백) + email_cover_preview.png(표지 메일) 생성 */
import { chromium } from 'playwright';
import { renderUserReportEmail, renderCoverEmail } from '../src/lib/emailTemplate.js';
import { calculateSaju } from '../src/lib/saju.js';

const birth = { y: '2004', m: '11', d: '3', h: '3', min: '13' };
const saju = calculateSaju(birth);

const mock = {
  nickname: '예린', birthText: '2004년 11월 3일 새벽 3시 13분', year: 2026, date: '2026년 5월 25일',
  saju, ilju: saju.ilju, tti: saju.tti, ohaengPlain: '불',
  sajuReading: '따스한 햇살을 머금은 산을 닮은 병술 일주의 예린님은 세상의 중심에서 밝은 에너지를 뿜어내는 귀한 존재예요.\n\n가을의 끝자락 새벽에 태어난 만큼 남다른 직관력과 깊은 통찰을 지녔습니다. 흙의 기운이 풍부해 든든하고 믿음직한 사람으로 자라났어요.',
  iljuLine: '너른 들판 위를 비추는 따스한 가을 햇살',
  ohaengReading: '흙의 기운이 가장 강해 안정과 포용을 타고났습니다. 물의 기운이 부족하니 유연함을 더하면 균형이 살아나요.',
  personality: '따뜻하고 섬세하며 주변을 살피는 마음이 깊습니다. 한번 마음먹은 일은 조용히 끝까지 밀고 나가는 뚝심이 있어요.',
  keywords: ['따뜻한 포용력', '올곧은 성품', '한결같은 신뢰', '차분한 지혜'],
  talent: '사람을 끌어모으고 분위기를 밝히는 재능이 있어, 사람을 잇는 일에서 빛을 발합니다.',
  talentFields: ['상담·코칭', '기획', '교육', '창작'],
  wealth: { highlight: '차곡차곡 쌓아 올리는 성실함이 풍요로운 결실의 밑거름이 됩니다.', text: '재물운은 안정적이에요.', tip: '매달 작은 금액이라도 꾸준히 모아보세요.' },
  love: { highlight: '진심이 깊어 한번 맺은 인연을 오래 지키는 사람이에요.', text: '애정운은 따뜻합니다.', tip: '먼저 안부를 건네보세요.' },
  career: { highlight: '신뢰를 바탕으로 사람을 이끄는 자리에서 빛납니다.', text: '직업운이 좋아요.', tip: '동료의 이야기에 귀 기울여보세요.' },
  health: { highlight: '규칙적인 휴식이 가장 큰 보약이에요.', text: '건강은 무난합니다.', tip: '잠들기 전 스트레칭 5분.' },
  months: [['1월','새해 결심'],['2월','따뜻한 인연'],['3월','재물 안정'],['4월','휴식'],['5월','결실'],['6월','배움'],['7월','도움'],['8월','균형'],['9월','인정'],['10월','회복'],['11월','감사'],['12월','마무리']]
    .map(([label, theme]) => ({ label, theme, text: theme + '의 기운이 흐르는 달이에요. 마음을 다해 하루를 보내보세요.' })),
  lifeEarly: '배움과 탐색의 시기예요.', lifeMid: '결실의 황금기입니다.', lifeLate: '지혜로 빛나는 시기.',
  years: [
    { label: '2026', keyword: '새로운 바람', text: '변화의 기운이 기분 좋게 다가오는 해입니다.' },
    { label: '2027', keyword: '결실', text: '노력이 인정받는 따뜻한 시간이에요.' },
    { label: '2028', keyword: '마음 보기', text: '내면의 소리에 귀 기울이면 좋은 해.' },
    { label: '2029', keyword: '도약', text: '주변의 도움으로 활기찬 해가 됩니다.' },
    { label: '2030', keyword: '정리와 완성', text: '한 해를 차분히 마무리하기 좋은 시기.' },
  ],
  advice: '스스로를 너무 몰아세우지 않아도 괜찮아요. 당신의 속도는 늦은 게 아니라 깊은 거예요.',
  closing: '예린님의 하루하루가 조용히, 그러나 분명하게 빛나길 응원해요.',
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const shot = async (html, path, width = 660) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path, fullPage: true });
  await page.close();
};
await shot(renderUserReportEmail(mock), 'email_preview.png');
await shot(renderCoverEmail(mock), 'email_cover_preview.png');      // 데스크톱
await shot(renderCoverEmail(mock), 'email_cover_mobile.png', 390);  // 모바일(미디어쿼리 확인)
await browser.close();
console.log('email_preview.png · email_cover_preview.png · email_cover_mobile.png 생성');
