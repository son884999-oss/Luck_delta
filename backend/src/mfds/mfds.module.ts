import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodNutrition } from '../entities/food-nutrition.entity';
import { HealthFunctionalItem } from '../entities/health-functional-item.entity';
import { MfdsSyncService } from './mfds-sync.service';
import { MfdsController } from './mfds.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FoodNutrition, HealthFunctionalItem])],
  controllers: [MfdsController],
  providers: [MfdsSyncService],
  exports: [MfdsSyncService],
})
export class MfdsModule {}
