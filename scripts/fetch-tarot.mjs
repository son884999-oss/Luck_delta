/* 라이더-웨이트(퍼블릭 도메인) 메이저 아르카나 22장을 public/tarot/ 에 내려받는다.
   출처: Wikimedia Commons (Special:FilePath). 실패 시 sacred-texts 폴백. */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = new URL('../public/tarot/', import.meta.url);
await mkdir(OUT, { recursive: true });

// index → Wikimedia 파일명
const WIKI = [
  'RWS_Tarot_00_Fool.jpg', 'RWS_Tarot_01_Magician.jpg', 'RWS_Tarot_02_High_Priestess.jpg',
  'RWS_Tarot_03_Empress.jpg', 'RWS_Tarot_04_Emperor.jpg', 'RWS_Tarot_05_Hierophant.jpg',
  'RWS_Tarot_06_Lovers.jpg', 'RWS_Tarot_07_Chariot.jpg', 'RWS_Tarot_08_Strength.jpg',
  'RWS_Tarot_09_Hermit.jpg', 'RWS_Tarot_10_Wheel_of_Fortune.jpg', 'RWS_Tarot_11_Justice.jpg',
  'RWS_Tarot_12_Hanged_Man.jpg', 'RWS_Tarot_13_Death.jpg', 'RWS_Tarot_14_Temperance.jpg',
  'RWS_Tarot_15_Devil.jpg', 'RWS_Tarot_16_Tower.jpg', 'RWS_Tarot_17_Star.jpg',
  'RWS_Tarot_18_Moon.jpg', 'RWS_Tarot_19_Sun.jpg', 'RWS_Tarot_20_Judgement.jpg',
  'RWS_Tarot_21_World.jpg',
];
const wikiUrl = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${f}?width=520`;
const stUrl = (i) => `https://www.sacred-texts.com/tarot/pkt/img/ar${String(i).padStart(2, '0')}.jpg`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function grab(url) {
  // 429(rate limit) 대비 백오프 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'cheonmun-web/1.0 (https://example.com; local tarot fetch)' }, redirect: 'follow' });
    if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) throw new Error(`too small (${buf.length}b)`);
    return buf;
  }
  throw new Error('429 repeated');
}

let ok = 0, fail = [];
for (let i = 0; i < 22; i++) {
  const name = String(i).padStart(2, '0') + '.jpg';
  const dest = new URL(name, OUT);
  if (existsSync(dest)) { console.log(`= ${name} (skip)`); ok++; continue; }
  let buf = null, via = '';
  try { buf = await grab(wikiUrl(WIKI[i])); via = 'wiki'; }
  catch (e1) {
    try { buf = await grab(stUrl(i)); via = 'sacred-texts'; }
    catch (e2) { fail.push(`${i}: wiki(${e1.message}) / st(${e2.message})`); }
  }
  if (buf) { await writeFile(dest, buf); ok++; console.log(`✓ ${name} ${(buf.length/1024).toFixed(0)}KB via ${via}`); }
  await sleep(1500); // throttle
}
console.log(`\n완료: ${ok}/22`);
if (fail.length) console.log('실패:\n' + fail.join('\n'));
