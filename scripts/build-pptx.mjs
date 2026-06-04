/* ================================================================
   천문(天文) — 발표자료(.pptx) 생성  [천문 전용 설정/대본]
   범용 엔진은 scripts/deck/pptx-kit.mjs(DeckKit). 이 파일은 '내용'만 담는다.
   출력: 천문_발표자료.pptx   ·   실행: npm run pptx
================================================================ */
import { newDeck, makeKit } from './deck/pptx-kit.mjs';

const pptx = newDeck({ title: '천문 — AI 명리 운세 서비스 소개', author: '천문', company: '천문(天文)' });
const K = makeKit(pptx, { imageDir: 'screenshots', docName: '천문(天文) · AI 명리 운세 서비스 소개' });
const { theme: T } = K;

/* ── 표지 ── */
K.cover(pptx.addSlide(), {
  org: 'AI 사주 · 명리 운세 서비스', kicker: '서비스 소개서',
  headline: '천문', hanja: '天文', subtitle: '태어난 순간의 별자리로 읽는 나의 하루', image: '01_entrance.png',
});

/* ── 본문(대본) ── */
const S = [
  { no: 1, tag: '서비스 개요 · 온보딩', title: '단 한 번의 입력으로 시작', images: ['02_setup_input.png'],
    bullets: ['회원가입·로그인 없이 이름과 생년월일만 입력', '입력 정보는 기기에 저장되어 재입력 불필요', '연도 입력 즉시 "만 OO세" 확인, 월·일·시는 휠 방식 선택', '출생 시각 미상 시에도 일주 기준으로 분석 가능'],
    note: '진입 장벽 최소화. 입력 1화면 → 즉시 결과.' },
  { no: 2, tag: '메인 화면', title: "매일 마주하는 '오늘의 나'", images: ['03_hub.png'],
    bullets: ['상단 패널에 인사·띠·오행 기운·오늘의 한 문장 통합', '핵심 기능(오늘의 운세·천문 식탁)을 전면 배치', '연속 방문 기록, 글자 크기·소리 등 접근성 설정', '운세 미확인일은 표식, 확인일은 점수 미리보기'] },
  { no: 3, tag: '메인 화면 · 기능 구성', title: '기능의 통합 제공', images: ['04_hub_more.png'],
    bullets: ['평생 사주, 사주 카드, 주간 운세, 궁합, 타로, 학습 나침반, 다이어리, 프리미엄 리포트', "'더보기' 영역에 부가 기능을 정리하여 복잡도 최소화", '정보 위계 설계로 핵심은 단순하게, 상세는 단계적으로'] },
  { no: 4, tag: '기능 ① 오늘의 운세', title: '점수와 한 문장으로 요약', images: ['10_fortune_result.png'],
    bullets: ['원형 점수 그래프와 핵심 문장으로 하루를 요약', '점수는 당일 일진(60갑자)과 본명 일주의 오행 관계로 산출', '매일 변동·개인별 상이하며 명리학적 근거 보유'],
    note: '핵심 차별점: 임의 점수가 아니라 명리 기반 결정 점수 → 신뢰성.' },
  { no: 5, tag: '기능 ① 오늘의 운세', title: '나의 기운 및 분야별 해설', images: ['11_fortune_body.png', '12_fortune_lucky.png'],
    bullets: ['오행 분포를 별자리 형태로 시각화', '종합·재물·애정·성공·건강운을 항목별 카드로 구성', '행운의 색은 실제 색상으로 직관 제공', '모든 문구는 긍정적 표현으로 순화'] },
  { no: 6, tag: '기능 ② 사주 카드 [전]', title: '직접 펼쳐보는 참여형 구성', images: ['13_card_front.png'],
    bullets: ['결과를 즉시 노출하지 않고 사용자가 카드를 직접 펼침', '카드 표면의 시각 효과로 행동을 자연스럽게 유도', '햅틱·효과음으로 사용 경험 강화'],
    note: '06·07은 펼치기 전/후를 나란히 배치해 상호작용 강조.' },
  { no: 7, tag: '기능 ② 사주 카드 [후]', title: '일주·오행 기반 개인화 카드', images: ['14_card_back.png', '15_card_detail.png'],
    bullets: ['카드를 펼치면 일주·오행 문양·제목·문구를 공개', '카드 이미지는 일주·오행을 바탕으로 자체 생성', '이미지로 저장 및 공유 가능'] },
  { no: 8, tag: '기능 ③ 평생 사주', title: '타고난 기질과 인생 흐름', images: ['16_saju_result.png', '17_saju_body.png'],
    bullets: ['성격·재능·재물·애정·직업·건강을 종합 분석', '초년·중년·말년의 흐름을 시간순으로 제시'] },
  { no: 9, tag: '기능 ④ 주간 운세', title: '한 주의 흐름 예측', images: ['18_weekly_result.png', '19_weekly_body.png'],
    bullets: ['월~일 7일간의 흐름을 막대그래프로 제공', '가장 좋은 요일을 별도 표기', '주간 점수는 7일 일진 점수의 평균으로 산출'] },
  { no: 10, tag: '기능 ⑤ 궁합', title: '두 사람의 관계 분석', images: ['20_gunghap_form.png', '21_gunghap_result.png'],
    bullets: ['상대방 생년월일만 추가 입력', '점수와 함께 관계 유형(예: 든든한 짝꿍)으로 해석', '애정·소통·미래 전망 및 관계의 흐름 제공'] },
  { no: 11, tag: '기능 ⑥ 타로', title: '오늘의 카드 한 장', images: ['22_tarot_draw.png', '24_tarot_result.png'],
    bullets: ['메이저 아르카나 22종 중 1매 추첨(정·역방향 포함)', '카드 이미지와 함께 사주를 연계한 해석 제공', '매회 새로 추첨하여 반복 이용 유도'] },
  { no: 12, tag: '기능 ⑦ 천문 식탁 [추천]', title: '오늘의 기운에 맞는 한 그릇', images: ['25_food_front.png', '26_food_back.png'],
    bullets: ['사주 오행에서 부족한 기운을 보강하는 음식을 즉시 추천', '추천 카드를 펼쳐 음식명·오행·적합도 확인', '매일 메뉴 변경, 대안 메뉴 3종 함께 제시'],
    note: '운세를 일상 실천(식사)으로 연결한 차별 기능.' },
  { no: 13, tag: '기능 ⑦ 천문 식탁 [식당]', title: '주변 식당 연계', images: ['27_food_restaurants.png'],
    bullets: ['위치 허용 시 추천 메뉴 취급 식당을 거리순 제공', '지도 표시 및 카카오맵 연계(위치·길찾기·전화)', '외부 인증키는 서버 경유로 안전하게 처리'],
    note: '운세 → 메뉴 → 식당 방문으로 이어지는 실행 동선.' },
  { no: 14, tag: '기능 ⑧ 학습 나침반', title: '오늘의 학습 컨디션 분석', images: ['30_study_intro.png', '31_study_result.png'],
    bullets: ['사주 기반 당일 두뇌 유형 제시(예: 열정형)', '학습 에너지·집중 시간대·공부법·도움 습관 안내', '수험생 및 학부모 대상 활용 가능'] },
  { no: 15, tag: '기능 ⑨ 운세 다이어리', title: '기분과 운의 기록 관리', images: ['29_diary.png'],
    bullets: ['당일 기분과 한 줄 일기를 운세 점수와 함께 저장', '점수 추이를 그래프로 시각화', '지난 기록의 조회·수정·삭제 지원'] },
  { no: 16, tag: '기능 ⑩ 프리미엄 리포트', title: '상세 분석 보고서(PDF)', images: ['28_report_select.png'],
    bullets: ['인생 시그니처 / 학습 상세 리포트 2종 중 선택', '백그라운드 생성 후 완료 시 안내, 기기에 PDF 저장'],
    note: '무료 일일 콘텐츠 → 유료 상세 보고서로 이어지는 수익 모델.' },
  { no: 17, tag: '기능 ⑩ 리포트 · 실제 산출물', title: '실제 생성 보고서 예시', images: ['28_1_report_real.png'], wide: true,
    bullets: ['버튼 한 번으로 생성되는 실제 PDF 보고서', '표지·사주 명식(네 기둥 간지, 오행 분포)을 정밀 편집', '총평·성격·재물·애정·직업·건강·인생 흐름까지 수록', '인쇄 품질의 A4 문서로 소장 가치 확보'],
    note: '화면(16)과 실제 산출물(17)을 연속 제시하여 완성도 입증.' },

  /* 비공개/폐기 기능(사용자 실제 폰 캡처) */
  { no: 18, tag: '비공개 기능 ⓐ 식약처 음식 검색', title: '식약처 데이터 기반 성분 분석', images: ['u_food_tofu.jpg', 'u_food_goat.jpg'],
    bullets: ['음식·성분명 입력 시 식약처 데이터로 분석(두부 85%, 흑염소 85% 등)', '한방 성질·오행 적합도와 추천/주의 대상을 함께 제시', '현재는 즉시형 추천(천문 식탁)으로 대체되어 비공개', '대규모 식약처 데이터 연동 역량을 보여주는 자산'],
    note: '폐기 사유: 백엔드 호출 지연 → 클라이언트 즉시 추천으로 전환. 코드·데이터는 보존.' },
  { no: 19, tag: '비공개 기능 ⓐ 컴플라이언스', title: '검증·등급 분류 (A·B·C·D)', images: ['u_food_water.jpg', 'u_food_vitb.jpg'],
    bullets: ['건강기능식품·인증(비타민B 70%) / 일반식품 / 미검증·유사과학 자동 분류', '근거 없는 항목(수소수 0%)은 "허위·과장 광고 주의"로 차단', '인증 기능성 정보(체내 에너지 생성 등)를 함께 표기', '신뢰성·안전성 확보를 위한 컴플라이언스 게이트'],
    note: '유사과학 차단은 서비스 신뢰의 핵심 — 비공개여도 강점으로 소개.' },
  { no: 20, tag: '비공개 기능 ⓑ 이메일 리포트', title: '리포트 이메일 발송', images: ['u_email_1.jpg', 'u_email_2.jpg'],
    bullets: ['시그니처 리포트를 PDF 첨부로 이메일 발송(실제 발송 화면)', '메일 본문에 표지·9개 분석 영역 요약을 함께 제공', '현재는 앱 내 PDF 저장으로 대체되어 비공개 처리', 'AI 생성 → PDF 변환 → 메일 발송까지 파이프라인 구현 경험'],
    note: '폐기 사유: 메일 도달률 이슈 → 기기 내 PDF 저장으로 전환.' },

  { no: 21, tag: '설계 · 기술', title: '디자인 및 기술 구성', images: ['03_hub.png', '13_card_front.png'],
    bullets: ['일관된 비주얼 시스템과 절제된 동작 효과', '접근성 준수: 큰 글씨·고대비·충분한 터치 영역', '구성: React·Vite·Tailwind, 생성형 AI, 지도 API, 서버리스 배포'] },
];
for (const cfg of S) K.content(pptx.addSlide(), cfg);

/* ── 종합 ── */
{
  const s = pptx.addSlide(); K.bumpPage();
  s.background = { color: 'FFFFFF' };
  s.addText('종합', { x: 0.6, y: 0.42, w: 7, h: 0.6, fontFace: T.font, color: T.sub, fontSize: 12, charSpacing: 2, valign: 'middle' });
  s.addText('천문 서비스 소개', { x: T.W - 4.1, y: 0.42, w: 3.5, h: 0.6, align: 'right', fontFace: T.font, color: T.sub, fontSize: 10, valign: 'middle' });
  K.line(s, 0.6, 1.12, T.W - 1.2, T.navy, 1.5);
  s.addText('보는 운세에서, 쓰는 운세로', { x: 0.6, y: 1.5, w: T.W - 1.2, h: 0.8, fontFace: T.font, color: T.navy, fontSize: 28, bold: true });
  const pts = [
    ['즉시성', '가입 없이 입력 한 번으로 바로 이용'],
    ['신뢰성', '명리(일진·오행) 기반의 일관된 점수 + 유사과학 차단 역량'],
    ['몰입성', '카드를 직접 펼치는 참여형 사용 경험'],
    ['확장성', '식사·학습·기록 등 일상으로 연결'],
    ['수익성', '상세 분석 보고서(PDF)를 통한 유료화'],
  ];
  let yy = 2.7;
  for (const [k, v] of pts) {
    s.addText(`▪ ${k}`, { x: 1.0, y: yy, w: 3.0, h: 0.5, fontFace: T.font, color: T.gold, fontSize: 17, bold: true, valign: 'middle' });
    s.addText(v, { x: 4.0, y: yy, w: 8.3, h: 0.5, fontFace: T.font, color: T.ink, fontSize: 16, valign: 'middle' });
    K.line(s, 1.0, yy + 0.56, 11.3);
    yy += 0.78;
  }
  K.footer(s);
}

await pptx.writeFile({ fileName: '천문_발표자료.pptx' });
console.log('✓ 천문_발표자료.pptx 생성 완료 (표지 + 본문 21 + 종합 = 23슬라이드)');
