/**
 * 유사과학 블랙리스트 (Category D) — 효능이 입증되지 않은 품목/키워드.
 * 정규화된 이름/원료/문구에 아래 패턴이 포함되면 0% 적합 + 허위광고 경고.
 * 운영에서는 DB 테이블로 승격해 관리자가 갱신할 수 있게 한다.
 */
export const PSEUDOSCIENCE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /수소\s*수|hydrogen\s*water/i, label: '수소수' },
  { pattern: /게르마늄|germanium/i, label: '게르마늄' },
  { pattern: /음이온|anion\s*therapy/i, label: '음이온 효능' },
  { pattern: /파동\s*(에너지|치료)|scalar\s*wave/i, label: '파동 에너지' },
  { pattern: /원적외선\s*(치료|효능)/i, label: '원적외선 치료 주장' },
  { pattern: /알칼리\s*환원수|alkaline\s*ionized/i, label: '알칼리환원수 만병통치' },
  { pattern: /콜로이드\s*실버|colloidal\s*silver/i, label: '콜로이드 실버' },
  { pattern: /천연\s*항암|만병통치|기적의\s*치료/i, label: '만병통치/항암 주장' },
  { pattern: /디톡스\s*(패치|풋)|detox\s*foot/i, label: '디톡스 패치' },
];

export function matchPseudoscience(text: string): string | null {
  const hay = (text ?? '').normalize('NFKC');
  for (const { pattern, label } of PSEUDOSCIENCE_PATTERNS) {
    if (pattern.test(hay)) return label;
  }
  return null;
}
