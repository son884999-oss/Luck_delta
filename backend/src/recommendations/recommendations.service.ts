import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FoodNutrition } from '../entities/food-nutrition.entity';
import { DailyOhaengLog } from '../entities/daily-ohaeng-log.entity';
import { SajuService } from '../saju/saju.service';
import { RedisService } from '../redis/redis.service';
import { TodayFoodResponseDto, RecommendedFoodDto } from './dto/today-food-response.dto';
import { OHAENG_PLAIN } from '../common/enums/ohaeng.enum';

/** 한국인 영양섭취기준(KDRI) 일일값 — 안전 임계치 산출용 */
const DAILY_SODIUM_MG = 2000;
const DAILY_SUGARS_G = 100;
const SAFETY_RATIO = 0.8; // 1회 제공량이 일일 권장의 80% 초과 → 제외

/**
 * 오늘의 추천 음식 (오늘의 추천 음식) — 천문식탁과 동일 위계의 병렬 엔진.
 * 사용자 명식 결핍 + 당일 전이/절기 → 균형 음식 3종. 안전 임계치로 고나트륨/고당 제외.
 */
@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(FoodNutrition) private readonly foods: Repository<FoodNutrition>,
    @InjectRepository(DailyOhaengLog) private readonly daily: Repository<DailyOhaengLog>,
    private readonly saju: SajuService,
    private readonly cache: RedisService,
  ) {}

  async todayFood(userId: string): Promise<TodayFoodResponseDto> {
    const date = new Date().toISOString().slice(0, 10);
    return this.cache.wrap<TodayFoodResponseDto>(`reco:today:${userId}:${date}`, async () => {
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user || !user.natalSaju) throw new NotFoundException('사용자 사주 프로필이 없습니다.');

      const today = await this.daily.findOne({ where: { date } });
      const targets = this.saju.todayTargets(user.natalSaju, today);

      // 만성질환 보유 시 안전 임계 강화(고혈압→나트륨 60%, 당뇨→당 60%)
      const sodiumCap = DAILY_SODIUM_MG * (user.chronicConditions?.includes('hypertension') ? 0.6 : SAFETY_RATIO);
      const sugarCap = DAILY_SUGARS_G * (user.chronicConditions?.includes('diabetes') ? 0.6 : SAFETY_RATIO);

      // 타깃 오행을 태그로 가진 식품 후보 (안전 임계 초과분은 SQL에서 제외)
      const qb = this.foods
        .createQueryBuilder('f')
        .where('f.ohaengTags && :targets', { targets })
        .andWhere('(f.sodiumMg IS NULL OR f.sodiumMg <= :sodiumCap)', { sodiumCap })
        .andWhere('(f.sugarsG IS NULL OR f.sugarsG <= :sugarCap)', { sugarCap })
        .limit(40);
      const candidates = await qb.getMany();

      // 전체 후보 대비 안전 제외 건수(관측용)
      const totalForTargets = await this.foods
        .createQueryBuilder('f')
        .where('f.ohaengTags && :targets', { targets })
        .getCount();

      const ranked = candidates
        .map((f) => ({ f, score: this.saju.suitabilityScore(f.ohaengTags, user.natalSaju!, targets) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const foods: RecommendedFoodDto[] = ranked.map(({ f, score }) => ({
        foodCode: f.foodCode,
        name: prettyFoodName(f.name),
        ohaengTags: f.ohaengTags,
        suitabilityScore: score,
        reason: this.buildReason(f, targets),
        nutrients: {
          energyKcal: f.energyKcal ?? undefined,
          proteinG: f.proteinG ?? undefined,
          sodiumMg: f.sodiumMg ?? undefined,
          sugarsG: f.sugarsG ?? undefined,
        },
      }));

      return {
        userId,
        date,
        targetElements: targets,
        transit: { transitElement: today?.transitElement ?? null, solarTerm: today?.solarTerm ?? null },
        foods,
        excludedForSafety: Math.max(0, totalForTargets - candidates.length),
        note: foods.length < 3 ? '추천 후보가 부족해요. 식품 데이터 동기화 후 다시 시도해 주세요.' : undefined,
      };
    });
  }

  private buildReason(f: FoodNutrition, targets: string[]): string {
    const matched = f.ohaengTags.filter((t) => targets.includes(t)).map((t) => OHAENG_PLAIN[t]);
    const why = matched.length ? `${matched.join('·')} 기운을 채워줘요` : '오늘 기운에 무난해요';
    return `'${prettyFoodName(f.name)}'은(는) ${why}.`;
  }
}

/** 식약처 식품명 '대표명_세부명' → 사람이 읽기 좋은 형태(언더스코어 제거) */
function prettyFoodName(name: string): string {
  return String(name ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}
