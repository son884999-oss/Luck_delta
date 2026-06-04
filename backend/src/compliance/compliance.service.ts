import { Injectable } from '@nestjs/common';
import { FoodCategory } from '../common/enums/food-category.enum';
import { matchPseudoscience } from './pseudoscience.blacklist';

export interface ComplianceVerdict {
  category: FoodCategory;
  /** 의학/기능성 주장 노출 허용 여부 */
  allowFunctionalClaims: boolean;
  /** 강제 적합 점수(있으면 엔진 점수보다 우선) */
  forcedScore?: number;
  /** 사용자 경고 문구 */
  warning?: string;
  /** 노출 가능한 클레임만 필터링한 결과 */
  permittedClaims: string[];
  /** 분류 근거(감사 로그용) */
  reason: string;
}

/**
 * 컴플라이언스 게이트 (마스터 프롬프트 §6).
 * 모든 분석 결과는 발신 전 이 게이트를 통과해야 한다.
 */
@Injectable()
export class ComplianceService {
  /**
   * @param name 품목명
   * @param hints 분류 힌트(원료/문구/카테고리 텍스트 모음)
   * @param approvedClaims MFDS 인증 클레임(건기식일 때만 존재)
   */
  classify(
    name: string,
    hints: string[] = [],
    approvedClaims: string[] = [],
  ): ComplianceVerdict {
    const blob = [name, ...hints, ...approvedClaims].join(' ');

    // ── D. 유사과학 블랙리스트 — 최우선 차단 ──
    const pseudo = matchPseudoscience(blob);
    if (pseudo) {
      return {
        category: FoodCategory.PSEUDO,
        allowFunctionalClaims: false,
        forcedScore: 0,
        warning: `⚠️ 허위·과장 광고 주의: '${pseudo}'은(는) 과학적 효능이 입증되지 않았습니다.`,
        permittedClaims: [],
        reason: `pseudoscience match: ${pseudo}`,
      };
    }

    // ── A. 건강기능식품 — 인증 클레임 보유 ──
    if (approvedClaims.length > 0 || /건강기능식품|기능성/.test(blob)) {
      return {
        category: FoodCategory.SUPPLEMENT,
        allowFunctionalClaims: true,
        permittedClaims: approvedClaims, // 승인된 문구만 노출
        reason: 'has MFDS-approved functional claims',
      };
    }

    // ── B. 한약/한약재 — 기미(한열)로 적합성 추론(의학적 치료 주장은 금지) ──
    if (/한약|한약재|탕약|약재|본초|(?:인삼|당귀|황기|구기자|숙지황)/.test(blob)) {
      return {
        category: FoodCategory.HERBAL,
        allowFunctionalClaims: false, // 효능 단정 금지, 체질 적합성 '경향'만
        permittedClaims: [],
        warning: '한방 정보는 체질 적합성 참고용이며 의학적 진단·치료를 대체하지 않습니다.',
        reason: 'herbal material detected',
      };
    }

    // ── C. 일반식품(추출가공식품 등) — 객관적 영양만, 기능성 차단 ──
    return {
      category: FoodCategory.GENERAL,
      allowFunctionalClaims: false,
      permittedClaims: [],
      warning: /추출가공식품|흑염소|녹용|즙/.test(blob)
        ? '일반식품(추출가공식품)입니다. 특정 질병 예방·치료 효과를 표방할 수 없어 영양성분만 제공합니다.'
        : undefined,
      reason: 'general food — objective nutrients only',
    };
  }

  /**
   * 최종 출력 정화 — 카테고리에 따라 기능성/효능 문구를 제거.
   * 일반식품·한약·유사과학은 functionalClaims를 비운다.
   */
  sanitizeClaims(verdict: ComplianceVerdict, rawClaims: string[]): string[] {
    if (!verdict.allowFunctionalClaims) return [];
    // 건기식이라도 '승인된 클레임'에 한해서만 노출
    const allow = new Set(verdict.permittedClaims);
    return rawClaims.filter((c) => allow.has(c));
  }
}
