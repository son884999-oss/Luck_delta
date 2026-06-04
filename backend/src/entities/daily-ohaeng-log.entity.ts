import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Ohaeng } from '../common/enums/ohaeng.enum';

/**
 * 일일 오행 전이(運) 데이터 — 그날의 천간·지지·24절기 매핑.
 * '오늘의 추천 음식'이 사용자 명식 결핍 + 당일 전이 기운을 합산해 타깃을 정한다.
 * date(YYYY-MM-DD)를 자연키로 두어 하루 1행.
 */
@Entity('daily_ohaeng_log')
export class DailyOhaengLog {
  @PrimaryColumn({ type: 'date' })
  date: string; // 'YYYY-MM-DD' (KST 기준)

  @Column({ type: 'varchar', length: 2 })
  heavenlyStem: string; // 천간 (예: 갑)

  @Column({ type: 'varchar', length: 2 })
  earthlyBranch: string; // 지지 (예: 자)

  @Column({ type: 'varchar', length: 4 })
  ganji: string; // 간지 (예: 갑자)

  /** 당일 천간/지지에서 도출한 지배 오행 */
  @Index()
  @Column({ type: 'varchar', length: 2 })
  transitElement: Ohaeng;

  /** 24절기 — 한국어 명칭 (예: 입춘, 우수) */
  @Column({ type: 'varchar', length: 10, nullable: true })
  solarTerm: string | null;

  /** 절기가 속한 계절 오행(보정용) */
  @Column({ type: 'varchar', length: 2, nullable: true })
  seasonElement: Ohaeng | null;
}
