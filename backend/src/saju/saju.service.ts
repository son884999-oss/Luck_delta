import { Injectable } from '@nestjs/common';
import { Ohaeng, OHAENG_VALUES, SHENG } from '../common/enums/ohaeng.enum';
import { NatalSaju } from '../entities/user.entity';
import { DailyOhaengLog } from '../entities/daily-ohaeng-log.entity';

/**
 * 사주 보조 계산 — 결핍/과다 도출, 당일 전이 합산으로 '오늘의 타깃 오행' 산출.
 * (정밀 만세력 계산은 별도 라이브러리에 위임 가능. 여기선 분포 기반 추천 로직.)
 */
@Injectable()
export class SajuService {
  /** 오행 개수 분포 → 결핍/과다 도출 (평균 대비) */
  deriveDeficiency(distribution: Record<Ohaeng, number>): {
    deficient: Ohaeng[];
    excessive: Ohaeng[];
  } {
    const counts = OHAENG_VALUES.map((e) => distribution[e] ?? 0);
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const avg = total / OHAENG_VALUES.length;
    const deficient: Ohaeng[] = [];
    const excessive: Ohaeng[] = [];
    OHAENG_VALUES.forEach((e) => {
      const c = distribution[e] ?? 0;
      if (c === 0 || c <= avg - 1) deficient.push(e);
      else if (c >= avg + 1.5) excessive.push(e);
    });
    return { deficient, excessive };
  }

  /**
   * 오늘의 타깃 오행 — 명식 결핍을 1순위로, 당일 전이/절기 기운으로 가중.
   * 결핍 오행을 '직접' 보하거나, 그 오행을 '생(生)'하는 오행을 함께 후보로.
   */
  todayTargets(natal: NatalSaju, today: DailyOhaengLog | null): Ohaeng[] {
    const targets = new Set<Ohaeng>(natal.deficient);
    // 결핍 오행을 생해주는 오행도 보조 타깃 (예: 수 부족 → 금이 수를 생)
    for (const def of natal.deficient) {
      const generator = (Object.keys(SHENG) as Ohaeng[]).find((k) => SHENG[k] === def);
      if (generator) targets.add(generator);
    }
    // 당일 전이가 과다 오행을 더 키우면 그 반대(결핍)에 무게 — 절기 보정
    if (today?.seasonElement && natal.deficient.includes(today.seasonElement)) {
      targets.add(today.seasonElement);
    }
    // 과다 오행은 타깃에서 제외
    natal.excessive.forEach((e) => targets.delete(e));
    return [...targets];
  }

  /**
   * 오행 적합도 점수(0~100) — 식품의 ohaengTags가 타깃 오행을 얼마나 채우는가.
   * 과다 오행을 더 키우면 감점.
   */
  suitabilityScore(foodTags: Ohaeng[], natal: NatalSaju, targets: Ohaeng[]): number {
    if (!foodTags?.length) return 0;
    let score = 0;
    for (const tag of foodTags) {
      if (targets.includes(tag)) score += 50;
      if (natal.excessive.includes(tag)) score -= 25;
    }
    return Math.max(0, Math.min(100, score));
  }
}
