/**
 * 오행(五行) — 사주/추천 엔진 전반의 단일 소스(SSOT).
 * 한글 코드값을 그대로 저장해 한국어 식약처/명리 데이터와 직접 매핑한다.
 */
export enum Ohaeng {
  WOOD = '목', // 나무
  FIRE = '화', // 불
  EARTH = '토', // 흙
  METAL = '금', // 쇠
  WATER = '수', // 물
}

export const OHAENG_VALUES: Ohaeng[] = [
  Ohaeng.WOOD,
  Ohaeng.FIRE,
  Ohaeng.EARTH,
  Ohaeng.METAL,
  Ohaeng.WATER,
];

/** 오행별 일상어 라벨 (사용자 노출용) */
export const OHAENG_PLAIN: Record<Ohaeng, string> = {
  [Ohaeng.WOOD]: '나무',
  [Ohaeng.FIRE]: '불',
  [Ohaeng.EARTH]: '흙',
  [Ohaeng.METAL]: '쇠',
  [Ohaeng.WATER]: '물',
};

/**
 * 상생(生) — A가 B를 북돋는 관계. 부족한 오행을 '생해주는' 음식을 권할 때 사용.
 * 목생화, 화생토, 토생금, 금생수, 수생목
 */
export const SHENG: Record<Ohaeng, Ohaeng> = {
  [Ohaeng.WOOD]: Ohaeng.FIRE,
  [Ohaeng.FIRE]: Ohaeng.EARTH,
  [Ohaeng.EARTH]: Ohaeng.METAL,
  [Ohaeng.METAL]: Ohaeng.WATER,
  [Ohaeng.WATER]: Ohaeng.WOOD,
};

/** 한약재 등 식품의 기미(氣味) — 한열온량 */
export enum ThermalNature {
  COLD = '한', // 寒
  COOL = '량', // 凉
  NEUTRAL = '평', // 平
  WARM = '온', // 溫
  HOT = '열', // 熱
}
