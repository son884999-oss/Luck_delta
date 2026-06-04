import { Ohaeng } from '../common/enums/ohaeng.enum';

/**
 * 식품명/분류 → 오행 귀속 추론 (전통 오행 음식 분류 휴ری스틱).
 * MFDS 대량 동기화 시 ohaengTags를 채워 추천 엔진이 매칭할 수 있게 한다.
 *  목(신맛·녹색) 화(쓴맛·붉은색) 토(단맛·노란색) 금(매운맛·흰색) 수(짠맛·검은색)
 */
const KEYWORDS: { ohaeng: Ohaeng; words: string[] }[] = [
  {
    ohaeng: Ohaeng.WOOD, // 목 — 신맛/녹색/잎채소
    words: ['시금치', '브로콜리', '케일', '깻잎', '부추', '미나리', '청경채', '상추', '매실', '레몬', '키위', '녹색', '보리', '밀', '완두'],
  },
  {
    ohaeng: Ohaeng.FIRE, // 화 — 쓴맛/붉은색
    words: ['토마토', '고추', '파프리카', '대추', '석류', '딸기', '커피', '쓴', '수수', '양고기', '홍삼', '비트', '붉은'],
  },
  {
    ohaeng: Ohaeng.EARTH, // 토 — 단맛/노란색/곡류
    words: ['호박', '고구마', '감자', '단호박', '옥수수', '기장', '조', '꿀', '대추', '소고기', '쇠고기', '바나나', '귤', '노란', '쌀밥'],
  },
  {
    ohaeng: Ohaeng.METAL, // 금 — 매운맛/흰색
    words: ['무', '양파', '마늘', '생강', '배', '도라지', '더덕', '백미', '쌀', '닭', '흰', '콩나물', '버섯', '율무', '매운'],
  },
  {
    ohaeng: Ohaeng.WATER, // 수 — 짠맛/검은색/수산물
    words: ['검은콩', '검은깨', '흑미', '미역', '다시마', '김', '해조', '멸치', '굴', '조개', '생선', '고등어', '돼지', '두부', '콩', '소금', '짠'],
  },
];

export function inferOhaengTags(name: string, category?: string | null): Ohaeng[] {
  const hay = `${name ?? ''} ${category ?? ''}`.normalize('NFKC');
  const tags = new Set<Ohaeng>();
  for (const { ohaeng, words } of KEYWORDS) {
    if (words.some((w) => hay.includes(w))) tags.add(ohaeng);
  }
  return [...tags];
}
