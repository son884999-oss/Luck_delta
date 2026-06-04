import { FoodCategory } from '../../common/enums/food-category.enum';
import { Ohaeng } from '../../common/enums/ohaeng.enum';

/** 천문식탁 분석 응답 — 한방/오행 해석 중심 (영양수치 X) */
export class AnalyzeResponseDto {
  foodName: string;
  /** A 건강기능식품 · B 한방 · C 일반식품 · D 유사과학(미검증) */
  category: FoodCategory;
  /** 유사과학 검증: D(미검증)면 false */
  verified: boolean;
  /** 한방 성질 (예: 따뜻한 성질) */
  nature: string;
  /** 오행 귀속 */
  ohaengTags: Ohaeng[];
  /** 일반 오행 적합도 0~100 (블랙리스트는 0) */
  suitabilityScore: number;
  /** 왜 이 적합도인지 — 성질·오행 연결 설명 */
  summary: string;
  /** 추천 대상 체질/기운 */
  goodFor: string;
  /** 주의(비추천) 대상 체질/기운 */
  cautionFor: string;
  /** 노출 허용된 인증 기능성 문구(일반식품/한방/유사과학은 빈 배열) */
  functionalClaims: string[];
  /** 경고(허위광고/일반식품 고지 등) */
  warning?: string;
  meta: { modelUsed: string; cached: boolean; source: 'vision' | 'db' };
}
