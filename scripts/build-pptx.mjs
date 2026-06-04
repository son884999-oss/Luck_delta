/* ================================================================
   천문(天文) — 발표자료(.pptx) 생성  [천문 전용 설정/대본]
   범용 엔진은 scripts/deck/pptx-kit.mjs(DeckKit). 이 파일은 '내용'만 담는다.
   capture-screens.mjs가 만든 스크린샷(전 기능)을 1슬라이드=1기능으로 엮는다.
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

/* ── 본문(대본) — 앱의 모든 기능을 빠짐없이 ── */
const S = [
  { tag: '서비스 개요 · 온보딩', title: '단 한 번의 입력으로 시작', images: ['02_setup.png'],
    bullets: ['회원가입·로그인 없이 이름과 생년월일만 입력', '입력 정보는 기기에 저장되어 재입력 불필요', '출생 시각 미상 시에도 일주 기준으로 분석 가능'],
    note: '진입 장벽 최소화 — 입력 1화면 → 즉시 결과.' },
  { tag: '메인 화면', title: "매일 마주하는 '오늘의 나'", images: ['03_hub.png'],
    bullets: ['상단에 인사·띠·오행 기운·오늘의 한 문장을 통합', '핵심 기능(오늘의 운세·천문 식탁)을 전면 배치', '운명 풀이 · 맞춤 운세 · 기록·리포트 3개 카테고리로 정리', '운세 미확인일은 표식, 확인일은 점수 미리보기'] },
  { tag: '메뉴 ① 운명 풀이', title: '사주·별자리를 다양한 시선으로', images: ['04_cat_know.png'],
    bullets: ['평생 사주 · 타로 · 점성술 · 자미두수 · 수비학', '한 화면에서 5가지 운명 풀이로 분기', '동·서양 명리를 한 앱에 통합'] },

  { tag: '기능 · 오늘의 운세', title: '점수와 한 문장으로 요약', images: ['10_fortune.png'],
    bullets: ['원형 점수 그래프와 핵심 문장으로 하루를 요약', '점수는 당일 일진(60갑자)과 본명 일주의 오행 관계로 산출', '매일 변동·개인별 상이 — 명리학적 근거 보유'],
    note: '핵심 차별점: 임의 점수가 아닌 명리 기반 결정 점수 → 신뢰성.' },
  { tag: '기능 · 오늘의 운세', title: '나의 기운 및 분야별 해설', images: ['10_fortune_body.png'],
    bullets: ['오행 분포를 별자리 형태로 시각화', '종합·재물·애정·성공·건강운을 항목별 카드로 구성', '행운의 색은 실제 색상으로 직관 제공'] },
  { tag: '기능 · 평생 사주', title: '타고난 기질과 인생 흐름', images: ['12_saju.png'],
    bullets: ['성격·재능·재물·애정·직업·건강을 종합 분석', '명식(네 기둥)과 오행 분포를 함께 제시'] },
  { tag: '기능 · 평생 사주', title: '초년 · 중년 · 말년의 흐름', images: ['12_saju_body.png'],
    bullets: ['인생의 시기별 흐름을 시간순으로 제시', '강점·보완점을 균형 있게 안내'] },

  { tag: '메뉴 ② 맞춤 운세', title: '시간대별·인연·학습 길잡이', images: ['05_cat_relate.png'],
    bullets: ['주간 · 월간 · 올해 · 재물 · 궁합 · 학습 나침반', '내가 보고 싶은 시야로 골라보는 운세'] },
  { tag: '기능 · 주간 운세', title: '한 주의 흐름 예측', images: ['14_weekly.png'],
    bullets: ['월~일 7일간의 흐름을 막대그래프로 제공', '가장 좋은 요일을 별도 표기', '주간 점수는 7일 일진 점수의 평균으로 산출'] },
  { tag: '기능 · 월간 운세', title: '이번 달의 기회와 흐름', images: ['15_monthly.png'],
    bullets: ['한 달 단위의 큰 흐름과 집중 포인트', '재물·관계·건강 등 분야별 조언'] },
  { tag: '기능 · 올해의 운세', title: '한 해의 큰 흐름과 전환점', images: ['16_yearly.png'],
    bullets: ['연간 흐름과 전환점을 미리 조망', '중요한 시기와 준비할 점 안내'] },
  { tag: '기능 · 재물 · 금전운', title: '돈·투자·기회의 흐름', images: ['17_wealth.png'],
    bullets: ['재물의 들고 남과 기회의 시기 분석', '오행 균형 기반의 현실적 조언'] },
  { tag: '기능 · 궁합', title: '두 사람의 관계 분석', images: ['18_gunghap_form.png', '19_gunghap_result.png'], wide: true,
    bullets: ['상대방 생년월일만 추가 입력', '점수와 함께 관계 유형으로 해석', '애정·소통·미래 전망 및 관계의 흐름 제공'] },
  { tag: '기능 · 타로', title: '오늘의 카드 한 장', images: ['20_tarot_draw.png', '21_tarot_result.png'], wide: true,
    bullets: ['메이저 아르카나 22종 중 1매 추첨(정·역방향 포함)', '카드를 직접 뽑는 참여형 인터랙션', '카드 이미지와 사주를 연계한 해석 제공'] },
  { tag: '기능 · 점성술', title: '내 별자리로 읽는 오늘', images: ['22_astrology.png'],
    bullets: ['생일로 태양 별자리를 자동 판별', '서양 점성술 관점의 성향·흐름 해설'] },
  { tag: '기능 · 자미두수', title: '동양 최고의 별자리 명반', images: ['23_ziwei.png'],
    bullets: ['생년월일시로 자미두수 명반 구성', '주요 별의 배치로 읽는 운명의 지도'] },
  { tag: '기능 · 수비학', title: '생년월일로 읽는 운명의 숫자', images: ['24_numerology.png'],
    bullets: ['생년월일을 운명수로 환산', '숫자에 담긴 성향과 삶의 방향 해석'] },
  { tag: '기능 · 천문 식탁', title: '오늘의 기운에 맞는 한 그릇', images: ['26_food.png', '27_food_back.png'], wide: true,
    bullets: ['사주 오행에서 부족한 기운을 보강하는 음식을 추천', '추천 카드를 펼쳐 음식명·오행·적합도 확인', '위치 허용 시 주변 식당까지 연계'],
    note: '운세를 일상 실천(식사)으로 연결한 차별 기능.' },
  { tag: '기능 · 학습 나침반', title: '오늘의 학습 컨디션 분석', images: ['25_study.png'],
    bullets: ['사주 기반 당일 두뇌 유형 제시', '학습 에너지·집중 시간대·공부법 안내', '수험생 및 학부모 대상 활용 가능'] },

  { tag: '메뉴 ③ 기록 · 리포트', title: '기록을 남기고 PDF로 소장', images: ['06_cat_record.png'],
    bullets: ['운세 다이어리와 프리미엄 리포트(PDF)', '무료 일일 콘텐츠 → 유료 상세 보고서로 연결'] },
  { tag: '기능 · 운세 다이어리', title: '기분과 운의 기록 관리', images: ['28_diary.png'],
    bullets: ['당일 기분과 한 줄 일기를 운세 점수와 함께 저장', '점수 추이를 그래프로 시각화', '지난 기록의 조회·수정·삭제 지원'] },
  { tag: '기능 · 프리미엄 리포트', title: '상세 분석 보고서(PDF)', images: ['29_report_select.png'],
    bullets: ['인생 시그니처 · 학습 상세 · 궁합 심층 3종', '백그라운드 생성 후 완료 시 안내, 기기에 PDF 저장', '표지·명식·분야별 분석을 인쇄 품질 A4로 수록'],
    note: '무료 일일 콘텐츠 → 유료 상세 보고서로 이어지는 수익 모델.' },

  { tag: '설계 · 기술', title: '디자인 및 기술 구성', images: ['03_hub.png', '10_fortune.png'], wide: true,
    bullets: ['일관된 비주얼 시스템과 절제된 동작 효과', '접근성: 큰 글씨·고대비·충분한 터치 영역', '구성: React·Vite·Tailwind, 생성형 AI, 지도 API, 서버리스 배포'] },
];
S.forEach((cfg, i) => K.content(pptx.addSlide(), { no: i + 1, ...cfg }));

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
    ['신뢰성', '명리(일진·오행) 기반의 일관된 점수'],
    ['다양성', '사주·타로·점성술·자미두수·수비학·궁합 통합'],
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
console.log(`✓ 천문_발표자료.pptx 생성 완료 (표지 + 본문 ${S.length} + 종합 = ${S.length + 2}슬라이드)`);
