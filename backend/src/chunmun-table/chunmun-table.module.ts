import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AiModule } from '../ai/ai.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { SajuModule } from '../saju/saju.module';
import { ChunmunTableController } from './chunmun-table.controller';
import { ChunmunTableService } from './chunmun-table.service';

/**
 * 천문식탁 모듈 — RecommendationsModule과 동일 위계의 병렬 형제(sibling).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AiModule,
    ComplianceModule,
    SajuModule,
  ],
  controllers: [ChunmunTableController],
  providers: [ChunmunTableService],
})
export class ChunmunTableModule {}
