/**
 * 식품 컴플라이언스 카테고리 (마스터 프롬프트 §6).
 *  A 건강기능식품 — MFDS 인증 기능성 표시 허용
 *  B 한약/한약재  — 기미(한열) × 사주 체질로 적합성 추론
 *  C 일반식품(추출가공식품 등) — 객관적 영양만, 의학/기능성 주장 차단
 *  D 유사과학 블랙리스트 — 0% 적합 + 허위광고 경고
 */
export enum FoodCategory {
  SUPPLEMENT = 'A_SUPPLEMENT', // 건강기능식품
  HERBAL = 'B_HERBAL', // 한약/한약재
  GENERAL = 'C_GENERAL', // 일반식품 (추출가공식품 포함)
  PSEUDO = 'D_PSEUDO', // 유사과학 블랙리스트
}

/** 입력 채널 — 천문식탁 분석 진입 경로 */
export enum AnalyzeChannel {
  PHOTO = 'PHOTO', // 갤러리 업로드 / 카메라 프레임 (OCR)
  BARCODE = 'BARCODE', // 바코드 스캐너
  TEXT = 'TEXT', // 텍스트 검색
}
