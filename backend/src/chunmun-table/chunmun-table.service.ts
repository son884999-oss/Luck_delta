import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { GeminiService, VisionPart } from '../ai/gemini.service';
import { ComplianceService } from '../compliance/compliance.service';
import { SajuService } from '../saju/saju.service';
import { RedisService } from '../redis/redis.service';
import { AnalyzeChannel, FoodCategory } from '../common/enums/food-category.enum';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

/**
 * 천문식탁 — 사진 OCR / 바코드 / 텍스트 → 음식의 한방 성질·오행 적합도·추천/비추천·유사과학 검증.
 * 영양수치(칼로리 등)는 다루지 않고, AI 한방/오행 해석 + 컴플라이언스 게이트로 답한다.
 */
@Injectable()
export class ChunmunTableService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly gemini: GeminiService,
    private readonly compliance: ComplianceService,
    private readonly saju: SajuService,
    private readonly cache: RedisService,
  ) {}

  async analyze(dto: AnalyzeRequestDto, file?: Express.Multer.File): Promise<AnalyzeResponseDto> {
    const user = await this.users.findOne({ where: { id: dto.userId } });
    if (!user || !user.natalSaju) throw new NotFoundException('사용자 사주 프로필이 없습니다.');

    if (dto.channel === AnalyzeChannel.PHOTO && !file) throw new BadRequestException('이미지 파일이 필요합니다.');
    if (dto.channel === AnalyzeChannel.BARCODE && !dto.barcode) throw new BadRequestException('바코드가 필요합니다.');
    if (dto.channel === AnalyzeChannel.TEXT && !dto.query) throw new BadRequestException('검색어가 필요합니다.');

    const targets = this.saju.todayTargets(user.natalSaju, null);
    const cacheKey = this.buildCacheKey(dto, file, user.id);

    return this.cache.wrap<AnalyzeResponseDto>(cacheKey, async () => {
      const part: VisionPart = file
        ? { imageBase64: file.buffer.toString('base64'), mimeType: file.mimetype }
        : { text: dto.barcode ?? dto.query };

      // AI 한방/오행 해석 (Flash-Lite → 복잡/유사과학 의심 시 Flash 폴백)
      const { result, modelUsed } = await this.gemini.analyze(part, {
        targets,
        deficient: user.natalSaju!.deficient,
        excessive: user.natalSaju!.excessive,
        nickname: user.nickname ?? undefined,
      });

      // 컴플라이언스 게이트 (A/B/C/D + 유사과학 블랙리스트)
      const verdict = this.compliance.classify(result.foodName, result.classificationHints, result.rawClaims);
      const pseudo = verdict.category === FoodCategory.PSEUDO; // 유사과학(미검증)
      const score = verdict.forcedScore ?? result.suitabilityScore;

      return {
        foodName: result.foodName,
        category: verdict.category,
        verified: !pseudo,
        nature: pseudo ? '검증되지 않음' : result.nature,
        ohaengTags: pseudo ? [] : result.ohaengTags,
        suitabilityScore: score,
        summary: pseudo ? (verdict.warning ?? '효능이 과학적으로 입증되지 않은 항목입니다.') : result.summary,
        goodFor: pseudo ? '' : result.goodFor,
        cautionFor: pseudo ? '근거가 없어 추천하지 않아요.' : result.cautionFor,
        functionalClaims: this.compliance.sanitizeClaims(verdict, result.rawClaims),
        warning: verdict.warning,
        meta: { modelUsed, cached: false, source: 'vision' },
      };
    });
  }

  private buildCacheKey(dto: AnalyzeRequestDto, file: Express.Multer.File | undefined, userId: string): string {
    const basis = file
      ? crypto.createHash('sha1').update(file.buffer).digest('hex').slice(0, 16)
      : (dto.barcode ?? dto.query ?? '');
    return `ct:analyze:v2:${userId}:${dto.channel}:${basis}`;
  }
}
