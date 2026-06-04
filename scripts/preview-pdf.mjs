/* PDF 미리보기: dark(화면용) + light(인쇄용) 둘 다 생성 (오프라인 mock · Gemini 호출 없음).
   실행: node scripts/preview-pdf.mjs */
import { chromium } from 'playwright';
import { renderReportPdfHtml } from '../src/lib/reportPdf.js';
import { calculateSaju } from '../src/lib/saju.js';

const birth = { y: '1993', m: '3', d: '15', h: '10', min: '30' };
const saju = calculateSaju(birth);

const mock = {
  nickname: '서연', birthText: '1993년 3월 15일 오전 10시 30분', year: 2026, date: '2026년 5월 25일',
  saju, ilju: saju.ilju, tti: saju.tti, ohaengPlain: saju.dayElem === '목' ? '나무' : '기운',
  sajuReading: '부드러운 풀과 비옥한 땅이 만난 자리에 태어난 서연님은 겉으로는 유연하고 온화하지만 안에는 끈질긴 생명력이 자리합니다.\n\n사람들과의 인연을 소중히 여기고, 어려움 속에서도 자기만의 속도로 끝내 꽃을 피워내는 기질을 타고났어요. 주변의 시선보다 자신의 결을 따라갈 때 가장 빛납니다.\n\n조급함을 내려놓을수록 더 멀리 가는 사람이에요. 한 해의 흐름 속에서 천천히, 그러나 분명하게 자신만의 정원을 가꾸어 갑니다.',
  iljuLine: '비옥한 땅 위에 부드럽게 자라나는 풀',
  ohaengReading: '나무의 기운이 중심을 잡아 성장과 배려를 타고났습니다. 부족한 기운은 의식적으로 채워가면 균형이 살아나요.',
  personality: '따뜻하고 섬세하며 주변을 살피는 마음이 깊습니다.\n\n한번 마음먹은 일은 조용히 끝까지 밀고 나가는 뚝심이 있어요. 갈등을 정면으로 부딪히기보다 부드럽게 감싸 안아 푸는 지혜가 있습니다.',
  keywords: ['섬세한 배려', '조용한 뚝심', '관계의 조율자', '깊은 공감', '끈기'],
  talent: '사람의 마음을 읽고 조율하는 능력이 뛰어나, 사람을 잇는 일이나 창작·기획 분야에서 빛을 발합니다.\n\n한 분야를 오래 파고드는 끈기가 전문성으로 이어집니다.',
  talentFields: ['상담·코칭', '기획·운영', '창작', '교육', '커뮤니티'],
  wealth: { highlight: '꾸준함이 곧 가장 큰 재물 그릇이 되는 사람이에요.', text: '큰 욕심보다 꾸준한 관리가 재물을 키웁니다.\n\n작은 지출을 점검하는 습관이 훗날 든든한 자산으로 돌아와요.', tip: '매달 고정 지출을 한 번씩 정리해보세요.' },
  love: { highlight: '진심이 깊어 한번 맺은 인연을 오래 지키는 사람입니다.', text: '서두르지 않는 사랑이 오래갑니다.\n\n상대의 결을 존중할 때 관계가 더 단단해져요.', tip: '오늘 소중한 사람에게 안부를 건네보세요.' },
  career: { highlight: '신뢰를 바탕으로 사람을 이끄는 자리에서 빛납니다.', text: '협업과 조율에서 강점을 발휘해요.\n\n묵묵한 노력이 결국 인정으로 이어집니다.', tip: '동료의 이야기를 먼저 들어보세요.' },
  health: { highlight: '규칙적인 휴식이 서연님에게 가장 큰 보약이에요.', text: '무리한 일정보다 충분한 휴식이 성과를 키웁니다.\n\n몸이 보내는 신호에 귀 기울여 주세요.', tip: '잠들기 전 5분, 가벼운 스트레칭.' },
  months: [['1월','새 결심'],['2월','따뜻한 인연'],['3월','재물 안정'],['4월','휴식'],['5월','결실'],['6월','배움'],['7월','도움'],['8월','균형'],['9월','인정'],['10월','회복'],['11월','새 인연'],['12월','마무리']]
    .map(([label, theme]) => ({ label, theme, text: theme + '의 기운이 흐르는 달이에요. 작은 약속을 지키며 하루하루를 채워가면 좋은 흐름이 이어집니다.' })),
  lifeEarly: '배움과 탐색의 시기로, 다양한 경험이 훗날의 자산이 됩니다. 방황처럼 느껴지는 시간도 사실은 뿌리를 깊게 내리는 과정이에요.',
  lifeMid: '쌓아온 노력이 사회적 결실로 이어지는 황금기예요. 책임이 늘지만 그만큼 영향력과 안정도 함께 커집니다.',
  lifeLate: '마음의 여유와 깊은 지혜로 주변에 빛이 되는 시기. 베풂이 곧 가장 큰 복으로 돌아옵니다.',
  years: [
    { label: '2026', keyword: '뿌리내림', text: '눈에 띄는 변화는 더디지만 기반이 단단해지는 해입니다.' },
    { label: '2027', keyword: '도약', text: '준비한 일들이 기회의 형태로 다가옵니다.' },
    { label: '2028', keyword: '결실', text: '노력이 인정받는 따뜻한 시기예요.' },
    { label: '2029', keyword: '확장', text: '새로운 인연과 무대가 넓어집니다.' },
    { label: '2030', keyword: '안정', text: '쌓아온 것들이 안정된 결실로 이어져요.' },
  ],
  advice: '서연님, 스스로를 너무 몰아세우지 않아도 괜찮아요. 당신의 속도는 늦은 게 아니라 깊은 거예요.\n\n비교의 시선을 내려놓을 때, 비로소 당신만의 정원이 보이기 시작합니다.',
  closing: '서연님의 하루하루가 조용히, 그러나 분명하게 빛나길 응원해요.',
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function render(theme, pdfName) {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await page.setContent(renderReportPdfHtml(mock, theme), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.pdf({ path: pdfName, format: 'A4', printBackground: true });
  const secs = await page.$$('.flow > .sec');
  const docH = await page.evaluate(() => document.body.getBoundingClientRect().height);
  const est = Math.ceil(docH / (265 * 96 / 25.4));
  // 대표 컷
  await (await page.$('.cover'))?.screenshot({ path: `report-${theme}-cover.png` });
  await (await page.$('.myungsik'))?.screenshot({ path: `report-${theme}-myungsik.png` });
  if (secs[0]) await secs[0].screenshot({ path: `report-${theme}-summary.png` });   // 총평 + 한눈에 보기
  if (secs[3]) await secs[3].screenshot({ path: `report-${theme}-wealth.png` });
  if (secs[10]) await secs[10].screenshot({ path: `report-${theme}-advice.png` });  // 조언 + 실천 체크리스트
  await page.close();
  console.log(`${theme}: ${pdfName} · 본문 ${secs.length}섹션 · 예상 약 ${est}p`);
}

await render('dark', 'report-dark.pdf');
await render('light', 'report-light.pdf');

await browser.close();
console.log('done');
