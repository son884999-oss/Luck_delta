import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { TodayFoodResponseDto } from './dto/today-food-response.dto';

/**
 * 오늘의 추천 음식 (오늘의 추천 음식) — 천문식탁과 동일 위계의 병렬 controller.
 */
@ApiTags('오늘의 추천 음식 (Today Food)')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  // GET /recommendations/today-food/:userId
  @Get('today-food/:userId')
  @ApiOperation({ summary: '오늘의 추천 음식 — 명식 결핍 + 당일 전이/절기로 균형 음식 3종' })
  @ApiParam({ name: 'userId', example: '97f47fd0-92eb-4b33-8dda-12f4837c406a' })
  todayFood(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<TodayFoodResponseDto> {
    return this.service.todayFood(userId);
  }
}
