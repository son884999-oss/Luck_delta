import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ohaeng } from '../common/enums/ohaeng.enum';

/**
 * 24+ 영양 필드 — JSONB 저장. MFDS 표준 영양성분 키를 그대로 보존하고
 * 자주 쓰는 핵심값(나트륨/당/열량/단백질)은 컬럼으로도 승격해 인덱싱/필터에 사용.
 */
export interface NutrientFacts {
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  sugarsG?: number;
  sodiumMg?: number;
  cholesterolMg?: number;
  saturatedFatG?: number;
  transFatG?: number;
  fiberG?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  magnesiumMg?: number;
  zincMg?: number;
  vitaminAug?: number;
  vitaminB1Mg?: number;
  vitaminB2Mg?: number;
  vitaminB6Mg?: number;
  vitaminB12Ug?: number;
  vitaminCMg?: number;
  vitaminDUg?: number;
  vitaminEMg?: number;
  folateUg?: number;
  [k: string]: number | undefined; // 그 외 MFDS 필드 (확장 가능)
}

@Entity('food_nutrition')
export class FoodNutrition {
  /** MFDS 식품코드 FOOD_CD (예: 'D101-004160000-0001') — 자연키. 대시 포함 가변 길이. */
  @PrimaryColumn({ type: 'varchar', length: 24 })
  foodCode: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  category: string | null; // 식품대/중/소분류

  @Column({ type: 'varchar', length: 120, nullable: true })
  maker: string | null; // 제조사/수입사

  /** 1회 제공량 기준값(g/ml) */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  servingSizeG: number | null;

  /** 24+ 영양 필드 (JSONB) */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  nutrients: NutrientFacts;

  // ── 핵심값 승격(인덱싱·안전 필터) ──
  @Index()
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  sodiumMg: number | null;

  @Index()
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  sugarsG: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  energyKcal: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  proteinG: number | null;

  /**
   * 오행 귀속(추천 매칭 키). 식품 성질로 1~2개 오행에 태깅.
   * 동기화/분석 시 채워지며, 비어 있으면 추천 쿼리에서 제외.
   */
  @Index()
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  ohaengTags: Ohaeng[];

  @UpdateDateColumn({ type: 'timestamptz' })
  syncedAt: Date;
}
