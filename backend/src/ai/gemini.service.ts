import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  SchemaType,
} from '@google/generative-ai';
import { Ohaeng } from '../common/enums/ohaeng.enum';

/** Vision/OCR 입력 파트 — 이미지(갤러리/카메라) 또는 텍스트 */
export interface VisionPart {
  imageBase64?: string;
  mimeType?: string; // image/jpeg | image/png
  text?: string; // 바코드 조회 결과/검색어
}

/** 사주 컨텍스트 — 한 번의 호출에 주입해 적합도/추천을 함께 생성 */
export interface SajuContext {
  targets: Ohaeng[]; // 오늘의 타깃 오행
  deficient: Ohaeng[];
  excessive: Ohaeng[];
  nickname?: string;
}

/** 원샷 분석 결과(모델 출력) — 한방/오행 해석 중심 */
export interface VisionAnalysis {
  foodName: string;
  nature: string; // 한방 성질 (예: '따뜻한 성질')
  ohaengTags: Ohaeng[];
  suitabilityScore: number; // 일반 오행 적합도 0~100
  summary: string; // 왜 이 적합도인지 (성질·오행 연결 설명)
  goodFor: string; // 추천 대상 체질/기운
  cautionFor: string; // 비추천(주의) 대상 체질/기운
  rawClaims: string[]; // 라벨/통념상 효능 문구(컴플라이언스 게이트로 필터됨)
  classificationHints: string[]; // 원료/분류 텍스트
  needsFallback: boolean; // 복잡 라벨/필기/한약·유사과학 → 상위 모델 권장
  confidence: number; // 0~1
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    foodName: { type: SchemaType.STRING },
    nature: { type: SchemaType.STRING },
    ohaengTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    suitabilityScore: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
    goodFor: { type: SchemaType.STRING },
    cautionFor: { type: SchemaType.STRING },
    rawClaims: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    classificationHints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    needsFallback: { type: SchemaType.BOOLEAN },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ['foodName', 'nature', 'ohaengTags', 'suitabilityScore', 'summary', 'goodFor', 'cautionFor', 'needsFallback', 'confidence'],
} as const;

/**
 * Vision AI 라우팅 (마스터 프롬프트 §4).
 *  1차: Flash-Lite — 기본 OCR/영양성분 추출 + 오행 적합도 + 3줄 추천(원샷).
 *  폴백: Flash — 1차가 파싱 실패 또는 needsFallback(복잡 라벨·필기·한약/유사과학)일 때만.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly primaryName: string;
  private readonly fallbackName: string;

  constructor(config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.get('GEMINI_API_KEY') ?? '');
    this.primaryName = config.get('GEMINI_MODEL_PRIMARY') ?? 'gemini-3.1-flash-lite';
    this.fallbackName = config.get('GEMINI_MODEL_FALLBACK') ?? 'gemini-3.5-flash';
  }

  private model(name: string): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: name,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA as any,
        temperature: 0.4,
      },
    });
  }

  private buildSystemPrompt(ctx: SajuContext): string {
    return [
      "당신은 '천문식탁'의 한방·오행 음식 분석가입니다. 입력(검색어/식품 라벨 이미지/바코드)이 가리키는 음식을 식별하고,",
      '그 음식의 일반적인 한방 성질과 오행 적합도를 분석하세요. 영양수치(열량·나트륨 등 숫자)는 다루지 마세요.',
      '- foodName: 음식 이름(순한글).',
      "- nature: 한방 성질 한 구절 (예: '따뜻한 성질', '서늘한 성질', '평이한 성질').",
      '- ohaengTags: 이 음식이 북돋는 오행(목/화/토/금/수) 1~2개.',
      '- suitabilityScore(0~100): 이 음식의 일반적인 오행 균형·이로움 정도.',
      "- summary: 왜 그 적합도인지 1~2문장 (예: '인삼은 따뜻한 성질로 기운을 북돋는 식품이라 차고 지친 기운에 잘 맞아 적합도가 높아요').",
      "- goodFor: 어떤 체질·기운의 사람에게 추천하는지 1문장 (예: '몸이 차고 쉽게 지치는 분').",
      "- cautionFor: 어떤 사람은 아껴야 하는지 1문장 (예: '몸에 열이 많거나 더위를 잘 타는 분').",
      '- rawClaims: 라벨/통념상 주장되는 효능 문구를 가공 없이 그대로(없으면 빈 배열).',
      '- classificationHints: 분류 힌트(건강기능식품/추출가공식품/한약재/일반식품/수소수 등).',
      '- needsFallback: 식별이 어렵거나 한약재·유사과학(수소수·게르마늄 등) 의심 시 true.',
      `참고(가벼운 보정용) — 사용자가 부족한 기운=[${ctx.deficient.join(',')}], 과다한 기운=[${ctx.excessive.join(',')}].`,
      '한자/전문용어 금지, 순한글. 의학적 치료·질병 예방 단정 금지(기운·체질 경향으로만). 식별이 어려우면 needsFallback=true, confidence를 낮게.',
    ].join('\n');
  }

  private toParts(input: VisionPart, system: string) {
    const parts: any[] = [{ text: system }];
    if (input.text) parts.push({ text: `입력 텍스트: ${input.text}` });
    if (input.imageBase64) {
      parts.push({
        inlineData: { data: input.imageBase64, mimeType: input.mimeType ?? 'image/jpeg' },
      });
    }
    return parts;
  }

  private async callOnce(modelName: string, input: VisionPart, ctx: SajuContext): Promise<VisionAnalysis> {
    const model = this.model(modelName);
    const parts = this.toParts(input, this.buildSystemPrompt(ctx));
    const res = await model.generateContent(parts);
    const text = res.response.text();
    const parsed = JSON.parse(text) as VisionAnalysis;
    parsed.ohaengTags = (parsed.ohaengTags ?? []).filter((t) =>
      Object.values(Ohaeng).includes(t as Ohaeng),
    ) as Ohaeng[];
    return parsed;
  }

  /**
   * 1차(Flash-Lite) → 필요 시 폴백(Flash).
   * 폴백 트리거: 1차 예외(파싱 실패), 또는 1차 needsFallback/저신뢰.
   */
  async analyze(input: VisionPart, ctx: SajuContext): Promise<{ result: VisionAnalysis; modelUsed: string }> {
    try {
      const primary = await this.callOnce(this.primaryName, input, ctx);
      if (!primary.needsFallback && primary.confidence >= 0.6) {
        return { result: primary, modelUsed: this.primaryName };
      }
      this.logger.debug(`primary low-confidence/needsFallback → ${this.fallbackName}`);
    } catch (e) {
      this.logger.warn(`primary parse failed (${(e as Error).message}) → ${this.fallbackName}`);
    }
    const fallback = await this.callOnce(this.fallbackName, input, ctx);
    return { result: fallback, modelUsed: this.fallbackName };
  }
}
