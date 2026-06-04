import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ohaeng } from '../common/enums/ohaeng.enum';

/**
 * 건강기능식품(Category A) — MFDS 인증 품목.
 * 인증번호·기능성 표시(승인 클레임)·원료 배열을 보존해
 * '결핍 오행 ↔ 승인된 기능성'만 매칭(허위/과장 표시 차단)한다.
 */
@Entity('health_functional_items')
export class HealthFunctionalItem {
  /** 품목제조신고/인증 고유키 (MFDS PRDLST_REPORT_NO 등) */
  @PrimaryColumn({ type: 'varchar', length: 40 })
  licenseNo: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  maker: string | null;

  /** 승인된 기능성 표시 문구(클레임) — 이 목록 밖 효능은 절대 노출 금지 */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  approvedClaims: string[];

  /** 원료(기능성 원료) 배열 */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  rawMaterials: string[];

  /** 일일 섭취량/주의사항 원문 */
  @Column({ type: 'text', nullable: true })
  intakeGuide: string | null;

  @Column({ type: 'text', nullable: true })
  cautions: string | null;

  /** 결핍 오행 매칭용 태그 (승인 클레임/원료에서 도출) */
  @Index()
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  ohaengTags: Ohaeng[];

  @UpdateDateColumn({ type: 'timestamptz' })
  syncedAt: Date;
}
