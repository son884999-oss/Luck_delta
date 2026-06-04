import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Ohaeng } from '../common/enums/ohaeng.enum';

/** 사주 명식 프로필 — 오행 분포(개수) + 본명오행/일간 */
export interface NatalSaju {
  /** 오행별 개수 분포 (목/화/토/금/수) — 합 8 (네 기둥 천간·지지) */
  distribution: Record<Ohaeng, number>;
  /** 일간(본명) 오행 */
  dayElement: Ohaeng;
  /** 사주에서 부족한 오행(추천 타깃) */
  deficient: Ohaeng[];
  /** 과다한 오행(절제 타깃) */
  excessive: Ohaeng[];
  ilju?: string; // 일주 간지 (예: 갑자)
}

/** 신체 프로필 */
export interface PhysicalProfile {
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  sex?: 'M' | 'F' | 'X';
}

@Entity('users')
export class User {
  // 앱에서 UUID 생성 — DB의 uuid-ossp/gen_random_uuid 확장 의존 제거(클라우드 친화)
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  private assignId() {
    if (!this.id) this.id = randomUUID();
  }

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  nickname: string | null;

  /** 생년월일시 (사주 계산 입력) */
  @Column({ type: 'jsonb', nullable: true })
  birth: { y: number; m: number; d: number; h: number | null; min: number | null } | null;

  /** 명식(오행 분포·결핍·과다) */
  @Column({ type: 'jsonb', nullable: true })
  natalSaju: NatalSaju | null;

  /** 신체 프로필(BMI 포함) */
  @Column({ type: 'jsonb', nullable: true })
  physical: PhysicalProfile | null;

  /**
   * 만성질환/주의 조건 — 추천 안전 필터에 사용.
   * 예: ['hypertension','diabetes','ckd'] → 나트륨/당 임계치 강화.
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  chronicConditions: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
