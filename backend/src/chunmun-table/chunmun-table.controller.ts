import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ChunmunTableService } from './chunmun-table.service';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

/**
 * 천문식탁 (천문식탁) — 입력 채널: 사진(갤러리/카메라) · 바코드 · 텍스트.
 * '오늘의 추천 음식'과 동일 위계(parallel sibling)의 controller.
 */
@ApiTags('천문식탁 (Chunmun Table)')
@Controller('chunmun-table')
export class ChunmunTableController {
  constructor(private readonly service: ChunmunTableService) {}

  // POST /chunmun-table/analyze — multipart/form-data (field: file)
  @Post('analyze')
  @ApiOperation({ summary: '식품 분석 — 사진(OCR)/바코드/텍스트 → 오행 적합도 + 3줄 추천' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'channel'],
      properties: {
        userId: { type: 'string', format: 'uuid', example: '97f47fd0-92eb-4b33-8dda-12f4837c406a' },
        channel: { type: 'string', enum: ['PHOTO', 'BARCODE', 'TEXT'], example: 'TEXT' },
        query: { type: 'string', example: '콩나물', description: 'TEXT 채널 검색어' },
        barcode: { type: 'string', description: 'BARCODE 채널 바코드 번호' },
        file: { type: 'string', format: 'binary', description: 'PHOTO 채널 이미지' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    }),
  )
  analyze(
    @Body() dto: AnalyzeRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AnalyzeResponseDto> {
    return this.service.analyze(dto, file);
  }
}
