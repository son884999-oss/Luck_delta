import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AnalyzeChannel } from '../../common/enums/food-category.enum';

/**
 * POST /chunmun-table/analyze 요청 본문.
 * 멀티파트(file=이미지) + 아래 필드. 채널에 따라 barcode/query를 사용.
 */
export class AnalyzeRequestDto {
  @IsUUID()
  userId: string;

  @IsEnum(AnalyzeChannel)
  channel: AnalyzeChannel;

  /** BARCODE 채널 — 바코드 번호 */
  @IsOptional()
  @IsString()
  barcode?: string;

  /** TEXT 채널 — 검색어 */
  @IsOptional()
  @IsString()
  query?: string;
}
