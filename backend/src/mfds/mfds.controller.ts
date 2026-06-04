import { Controller, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MfdsSyncService } from './mfds-sync.service';

/**
 * 수동 동기화 트리거 — 발급 키 검증/초기 적재용.
 * ⚠️ 운영에서는 관리자 인증 가드(@UseGuards)로 보호할 것.
 *   POST /api/mfds/sync           → 둘 다
 *   POST /api/mfds/sync?target=food | hfi
 */
@ApiTags('MFDS 동기화 (관리)')
@Controller('mfds')
export class MfdsController {
  constructor(private readonly sync: MfdsSyncService) {}

  @Post('sync')
  @ApiOperation({ summary: '식약처 데이터 수동 동기화 (식품영양성분 / 건강기능식품)' })
  @ApiQuery({ name: 'target', required: false, enum: ['food', 'hfi'], description: '생략 시 둘 다' })
  async run(@Query('target') target?: 'food' | 'hfi') {
    if (target === 'food') return { food: await this.sync.syncFoodNutrition() };
    if (target === 'hfi') return { hfi: await this.sync.syncHealthFunctional() };
    const [food, hfi] = [await this.sync.syncFoodNutrition(), await this.sync.syncHealthFunctional()];
    return { food, hfi };
  }
}
