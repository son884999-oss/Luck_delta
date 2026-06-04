import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './config/data-source';
import { RedisModule } from './redis/redis.module';
import { MfdsModule } from './mfds/mfds.module';
import { UsersModule } from './users/users.module';
// ── Twin-Pillar: 동일 위계의 병렬 형제 모듈 ──
import { ChunmunTableModule } from './chunmun-table/chunmun-table.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // dataSourceOptions가 .env(process.env)를 직접 읽어 SSOT로 동작 (CLI 마이그레이션과 공유)
    TypeOrmModule.forRoot(dataSourceOptions),
    RedisModule,
    MfdsModule,
    UsersModule,

    // ───────────────────────────────────────────────────────────
    //  핵심 웰니스 — 두 모듈은 상하 관계가 아니라 '병렬 형제(sibling)'다.
    //   · ChunmunTableModule     → POST /chunmun-table/analyze        (천문식탁)
    //   · RecommendationsModule  → GET  /recommendations/today-food   (오늘의 추천 음식)
    // ───────────────────────────────────────────────────────────
    ChunmunTableModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
