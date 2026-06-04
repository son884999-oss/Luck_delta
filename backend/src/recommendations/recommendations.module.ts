import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FoodNutrition } from '../entities/food-nutrition.entity';
import { DailyOhaengLog } from '../entities/daily-ohaeng-log.entity';
import { SajuModule } from '../saju/saju.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

/**
 * 오늘의 추천 음식 모듈 — ChunmunTableModule과 동일 위계의 병렬 형제(sibling).
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, FoodNutrition, DailyOhaengLog]), SajuModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
