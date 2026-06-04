import { Ohaeng } from '../../common/enums/ohaeng.enum';

export class RecommendedFoodDto {
  foodCode: string;
  name: string;
  ohaengTags: Ohaeng[];
  suitabilityScore: number;
  reason: string; // 왜 오늘 이 음식인지(결핍/전이 연결)
  nutrients: { energyKcal?: number; proteinG?: number; sodiumMg?: number; sugarsG?: number };
}

export class TodayFoodResponseDto {
  userId: string;
  date: string;
  /** 명식 결핍 + 당일 전이로 도출한 타깃 오행 */
  targetElements: Ohaeng[];
  transit: { transitElement: Ohaeng | null; solarTerm: string | null };
  /** 균형을 돕는 3가지 추천 음식 */
  foods: RecommendedFoodDto[];
  /** 안전 필터로 제외된 건수(나트륨/당 초과) */
  excludedForSafety: number;
  note?: string;
}
