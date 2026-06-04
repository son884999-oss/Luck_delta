/* 실제 리포트 생성 + PDF 미리보기. 실행: node --env-file=.env.local scripts/gen-report.mjs */
import { generateReport } from '../src/lib/fortune.js';
import { renderReportPdfHtml } from '../src/lib/reportPdf.js';
import { chromium } from 'playwright';

// 인자: --name 손용범 --birth 2004-11-3 --time 3:13 (없으면 기본값)
const argv = process.argv.slice(2); const args = {};
for (let i = 0; i < argv.length; i++) { if (!argv[i].startsWith('--')) continue; const k = argv[i].slice(2), n = argv[i + 1]; if (n && !n.startsWith('--')) { args[k] = n; i++; } else args[k] = true; }
const name = args.name || '예린';
const [by, bm, bd] = String(args.birth || '2004-11-3').split('-');
let bh = '3', bmin = '13';
if (args.time === '모름') { bh = '모름'; bmin = '0'; } else if (args.time) { const [h, m] = String(args.time).split(':'); bh = h; bmin = m || '0'; }
const birth = { y: by, m: bm, d: bd, h: bh, min: bmin };
const outPdf = args.out || `report-${name}.pdf`;

console.log('Gemini로 리포트 생성 중… (4회 병렬 호출, 약 15~30초)');
const t0 = Date.now();
const data = await generateReport(birth, name);
console.log(`완료 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log('─'.repeat(56));
const s = data.saju;
console.log('명식:', s.pillars.map(p => `${p.kind} ${p.ganji}`).join(' · '));
console.log('오행:', s.dist.map(x => `${x.key}${x.count}`).join(' '), '| 강:', s.dominant.join('·'), '| 약:', (s.lacking.join('·') || '없음'));
console.log('일주:', data.ilju, '| 띠:', data.tti, '| 기운:', data.ohaengPlain);
console.log('[일주 한 줄]', data.iljuLine);
console.log('[총평]', String(data.sajuReading).replace(/\n/g, ' ').slice(0, 90), '…');
console.log('[성격 키워드]', (data.keywords || []).join(', '));
console.log('[재물 핵심]', data.wealth?.highlight);
console.log('[11월]', `(${data.months[10].theme}) ${data.months[10].text}`);
console.log('[향후 첫해]', `${data.years[0]?.label} (${data.years[0]?.keyword}) ${String(data.years[0]?.text).slice(0, 50)}…`);
console.log('─'.repeat(56));

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const html = renderReportPdfHtml(data, 'light');
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.pdf({ path: outPdf, format: 'A4', printBackground: true });

// 섹션별 스크린샷 (디자인/내용 확인용)
const grab = async (sel, file) => { const el = await page.$(sel); if (el) await el.screenshot({ path: file }); };
const secs = await page.$$('.flow > .sec');
await grab('.cover', 'rr_cover.png');
await grab('.myungsik', 'rr_myungsik.png');
if (secs[0]) await secs[0].screenshot({ path: 'rr_chong.png' });     // 총평
if (secs[1]) await secs[1].screenshot({ path: 'rr_personality.png' }); // 성격
if (secs[3]) await secs[3].screenshot({ path: 'rr_wealth.png' });    // 재물
if (secs[7]) await secs[7].screenshot({ path: 'rr_months.png' });    // 월별
if (secs[8]) await secs[8].screenshot({ path: 'rr_life.png' });      // 인생흐름
if (secs[9]) await secs[9].screenshot({ path: 'rr_years.png' });     // 향후5년
await grab('.ending', 'rr_ending.png');

// 페이지 수 추정 + 전체 축소 오버뷰(밀도 확인)
const mm = 96 / 25.4;
const docH = await page.evaluate(() => document.body.getBoundingClientRect().height);
const est = Math.ceil(docH / (265 * mm));
const ov = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 0.5 });
await ov.setContent(html, { waitUntil: 'networkidle' });
await ov.waitForTimeout(500);
await ov.screenshot({ path: 'rr_full.png', fullPage: true });
await ov.close();

console.log(`${outPdf} 생성 · 본문 ${secs.length}섹션 · 예상 약 ${est}페이지`);
console.log('스크린샷: rr_cover/myungsik/chong/personality/wealth/months/life/years/ending + rr_full(오버뷰)');
await browser.close();
