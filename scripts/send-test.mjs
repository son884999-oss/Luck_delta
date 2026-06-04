/* Resend 발송 테스트 — 실제 디자인 메일을 son884999@gmail.com 으로 보낸다.
   실행: node --env-file=.env.local scripts/send-test.mjs */
import { renderUserReportEmail, renderAdminEmail } from '../src/lib/emailTemplate.js';

const KEY = process.env.RESEND_API_KEY;
const ADMIN = 'son884999@gmail.com';
if (!KEY) { console.log('NO KEY'); process.exit(1); }
console.log('RESEND_API_KEY 감지됨 ✓'); // 보안: 키 값/일부도 로그에 출력하지 않음

const mock = {
  nickname: '서연', birthText: '1993년 3월 15일 오전 10시 30분', ilju: '을미', ohaeng: '목', ohaengMeaning: '성장·인내·생명력', year: 2026,
  sajuOverview: '을미(乙未) 일주는 부드러운 풀과 비옥한 땅이 만난 자리예요. 겉으로는 유연하고 온화하지만 안에는 끈질긴 생명력이 자리합니다. 사람들과의 인연을 소중히 여기고, 어려움 속에서도 자기만의 속도로 끝내 꽃을 피워내는 기질을 타고났어요.',
  personality: '따뜻하고 섬세하며, 주변을 살피는 마음이 깊습니다. 한번 마음먹은 일은 조용히 끝까지 밀고 나가는 뚝심이 있어요.',
  talent: '사람의 마음을 읽고 조율하는 능력이 뛰어나, 사람을 잇는 일이나 창작·기획 분야에서 빛을 발합니다.',
  months: [
    { label: '1월', text: '새로운 결심이 단단해지는 시기, 작은 계획부터 적어보세요.' },
    { label: '2월', text: '인간관계에서 따뜻한 기운이 들어와요.' },
    { label: '3월', text: '재물의 흐름이 안정되고 기회가 보입니다.' },
    { label: '4월', text: '건강을 챙기며 페이스 조절이 필요한 달.' },
    { label: '5월', text: '오래 준비한 일이 결실을 맺기 좋은 시기예요.' },
    { label: '6월', text: '여행이나 배움에 좋은 기운이 흐릅니다.' },
    { label: '7월', text: '주변의 도움으로 막힌 일이 풀려요.' },
    { label: '8월', text: '감정의 균형을 지키면 큰 행운이 따릅니다.' },
    { label: '9월', text: '재능을 인정받는 무대가 열립니다.' },
    { label: '10월', text: '안정과 휴식을 통해 에너지를 회복하세요.' },
    { label: '11월', text: '새로운 인연이 의미 있게 다가옵니다.' },
    { label: '12월', text: '한 해를 정리하며 다음을 준비하기 좋은 달.' },
  ],
  lifeEarly: '배움과 탐색의 시기로, 다양한 경험이 훗날의 자산이 됩니다.',
  lifeMid: '쌓아온 노력이 사회적 결실로 이어지는 황금기예요.',
  lifeLate: '마음의 여유와 깊은 지혜로 주변에 빛이 되는 시기.',
  next5years: '앞으로 5년은 뿌린 씨앗이 단단한 뿌리를 내리는 시간입니다. 조급해하지 않아도 좋아요. 꾸준함이 곧 가장 큰 운이 되어 돌아옵니다.',
  advice: '서연님, 스스로를 너무 몰아세우지 않아도 괜찮아요. 당신의 속도는 늦은 게 아니라 깊은 거예요.',
  closing: '서연님의 하루하루가 조용히, 그러나 분명하게 빛나길 응원해요. 🌙',
};

const sub = '[천문] 서연님을 위한 프리미엄 사주 리포트 ✦';
const html = renderUserReportEmail(mock);

const send = (body) => fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async r => ({ status: r.status, json: await r.json() }));

// 1) 사용자 리포트 메일
const r1 = await send({ from: '천문 <onboarding@resend.dev>', to: [ADMIN], subject: sub, html });
console.log('[user report]', r1.status, JSON.stringify(r1.json));

// 2) 관리자 알림 메일
const adminHtml = renderAdminEmail({ email: 'tester@example.com', nickname: '서연', birthText: mock.birthText, ilju: mock.ilju, mode: 'saju', at: new Date().toLocaleString('ko-KR') });
const r2 = await send({ from: '천문 <onboarding@resend.dev>', to: [ADMIN], subject: '[천문] 새 리포트 신청 — 서연', html: adminHtml });
console.log('[admin notify]', r2.status, JSON.stringify(r2.json));
