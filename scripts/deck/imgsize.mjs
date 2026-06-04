import { readFileSync } from 'node:fs';
/* PNG/JPEG 헤더에서 픽셀 크기 추출(외부 의존 없이). 실패 시 폰 캡처 기본값.
   [범용] 프로젝트 의존 없음 — 그대로 복사해 재사용 가능. */
export function imgSize(p) {
  const b = readFileSync(p);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; // PNG IHDR
  if (b[0] === 0xFF && b[1] === 0xD8) { // JPEG
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xFF) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) };
      o += 2 + b.readUInt16BE(o + 2);
    }
  }
  return { w: 824, h: 1830 };
}
