/* ================================================================
   천문 — 클라이언트 PDF 생성 (서버 Chromium 불필요)
   기존 reportPdf.js의 완성된 HTML을 숨겨진 iframe에 렌더 → 폰트 로드 대기
   → html2canvas-pro로 캡처 → jsPDF로 A4 다중 페이지 PDF 생성.
   결과는 화면에 보이지 않고 Blob/base64로만 반환된다.
================================================================ */
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

// A4 픽셀 기준(96dpi): 794 x 1123. 캡처 폭을 794로 고정해 비율을 맞춘다.
const A4_W = 794;
const A4_H = 1123;

/* 전체 HTML 문서를 숨겨진 iframe에 띄우고 body 엘리먼트를 돌려준다. */
function mountHidden(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W}px;height:${A4_H}px;border:0;opacity:0;pointer-events:none;`;
    document.body.appendChild(iframe);
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        // 캡처를 위해 body 폭을 A4로 고정
        doc.documentElement.style.width = `${A4_W}px`;
        doc.body.style.width = `${A4_W}px`;
        doc.body.style.margin = '0';
        // 실제 사용하는 폰트 굵기를 한글 샘플로 '강제 로드 완료'시킨다.
        // (특히 굵은 글씨 700이 덜 로드된 채 캡처되면 html2canvas가 한글을 흘려
        //  "김철수"→"철 수"처럼 첫 글자 누락/벌어짐이 생기던 문제 방지)
        if (doc.fonts) {
          const SAMPLE = '가나다라힣김철수天文0';
          const WEIGHTS = [
            '300 14px "Noto Sans KR"', '400 14px "Noto Sans KR"', '500 14px "Noto Sans KR"', '700 14px "Noto Sans KR"',
            '500 24px "Noto Serif KR"', '700 24px "Noto Serif KR"', '900 40px "Noto Serif KR"',
          ];
          try { await Promise.all(WEIGHTS.map(f => doc.fonts.load(f, SAMPLE).catch(() => {}))); } catch (e) {}
          try { await doc.fonts.ready; } catch (e) {}
        }
        // 레이아웃·폰트 적용 안정화 여유
        await new Promise(r => setTimeout(r, 800));
        resolve({ iframe, doc });
      } catch (e) { reject(e); }
    };
    iframe.onerror = reject;
    // srcdoc로 전체 문서 주입
    iframe.srcdoc = html;
  });
}

/* reportPdf.js가 만든 HTML → jsPDF 인스턴스 (내부 공용)
   onProgress(0~1)로 진행률 콜백(선택). */
async function renderHtmlToPdf(html, onProgress) {
  const { iframe, doc } = await mountHidden(html);
  try {
    const target = doc.body;
    const fullH = Math.max(target.scrollHeight, target.offsetHeight);

    const canvas = await html2canvas(target, {
      scale: 1.6,               // 선명도 vs 용량 균형(Vercel 4.5MB 본문 제한 대비)
      useCORS: true,            // 구글폰트/외부 리소스 허용
      backgroundColor: null,    // 다크 배경 그대로
      width: A4_W,
      height: fullH,
      windowWidth: A4_W,
      windowHeight: fullH,
      logging: false,
    });

    onProgress?.(0.7);

    const sc = canvas.width / A4_W;                       // 실제 캡처 배율
    const bodyTop = doc.body.getBoundingClientRect().top;
    const yOf = (el, edge) => Math.round((el.getBoundingClientRect()[edge] - bodyTop) * sc); // 캔버스 px

    const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    // 한 A4 페이지에 해당하는 '콘텐츠' 높이(캔버스 px). 콘텐츠는 A4_W×A4_H 레이아웃이라
    // 페이지당 콘텐츠 높이 = A4_H*sc (jsPDF의 pageH(pt기반)와 무관 — 세로 왜곡 원인 제거).
    const pageHc = A4_H * sc;

    // ── 1) 섹션 경계 — 표지·명식·각 본문 섹션·맺음말은 '책의 챕터'처럼 항상 새 페이지에서
    //        시작한다(.page = A4 한 장 고정 박스). 각 섹션의 [상단, 하단] 범위를 만든다.
    //        reportPdf.js의 fitPages가 각 .page 를 한 장에 맞춰두므로 보통 분할이 일어나지 않는다.
    let starts = Array.from(doc.querySelectorAll('.page'))
      .map(el => yOf(el, 'top'))
      .filter(y => y >= 0 && y < canvas.height);
    starts = Array.from(new Set(starts)).sort((a, b) => a - b);
    if (!starts.length || starts[0] > 6) starts.unshift(0);
    const sections = starts.map((t, k) => [t, k + 1 < starts.length ? starts[k + 1] : canvas.height]);

    // ── 2) 안전 절단 지점 — 글자 한가운데가 잘리지 않도록 '블록 요소의 하단'만 후보로 쓴다.
    //        픽셀을 훑어 빈 줄을 추정하던 기존 방식은 빽빽한 본문·은은한 배경 박스에서
    //        실패해 문장이 잘렸다 → 실제 DOM 레이아웃 경계로 대체(절대 줄 중간을 자르지 않음).
    //        카드·인용·소목차·요약 등은 통째로 유지(원자 블록)하고 그 내부에서는 자르지 않는다.
    const BREAK_SEL = '.sec-head, .body, .lead, .subsec, .summary, .checklist, .pquote, .chips, ' +
      '.ycard, .mrow, .tl-row, .timeline, .months, .years, .balance-note, .pillars, .pillar-cap, .ohaeng-grid, .myungsik-hero';
    const ATOMIC_SEL = '.subsec, .summary, .checklist, .ycard, .mrow, .tl-row, .pquote';
    const breakYs = Array.from(doc.querySelectorAll(BREAK_SEL))
      .filter(el => { const a = el.closest(ATOMIC_SEL); return !a || a === el; }) // 원자 블록 내부 경계 제외
      .map(el => yOf(el, 'bottom'))
      .filter(y => y > 0 && y < canvas.height)
      .sort((a, b) => a - b);
    // 이상점(ideal) 근처에서 (pageStart, pageStart+pageHc] 안의 '가장 가까운 블록 경계'를 고른다.
    const snapCut = (pageStart, ideal) => {
      let best = -1, bestD = Infinity;
      for (const y of breakYs) {
        if (y <= pageStart + 4) continue;
        if (y > pageStart + pageHc) break;
        const d = Math.abs(y - ideal);
        if (d < bestD) { bestD = d; best = y; }
      }
      return best;
    };

    // ── 3) 최후 폴백 — 한 블록이 한 페이지보다도 클 때만(매우 드묾) 픽셀을 훑어
    //        '글자/밝은 테두리 없는 빈 줄'을 찾아 자른다.
    const fctx = canvas.getContext('2d', { willReadFrequently: true });
    const STEP = 8 * 4; // 가로 픽셀 8개마다 표본
    const findSafeCut = (ideal, minTop) => {
      const win = Math.round(170 * sc);
      const yStart = Math.max(minTop, ideal - win);
      const h = ideal - yStart;
      if (h <= 1) return ideal;
      let data;
      try { data = fctx.getImageData(0, yStart, canvas.width, h).data; } catch (e) { return ideal; }
      const rowBytes = canvas.width * 4;
      for (let y = h - 1; y >= 0; y--) {
        let maxLum = 0;
        const base = y * rowBytes;
        for (let x = 0; x < rowBytes; x += STEP) {
          const i = base + x;
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          if (lum > maxLum) { maxLum = lum; if (maxLum >= 46) break; }
        }
        if (maxLum < 46) return yStart + y; // 글자/밝은 테두리 없는 빈 줄 → 안전한 절단점
      }
      return ideal;
    };

    // ── 4) 페이지 분할 — 각 섹션을 새 페이지에서 시작하되(챕터 느낌), 한 페이지보다 긴
    //        섹션만 '균등 분할 + 블록 경계 스냅'으로 나눠 글자가 절대 잘리지 않게 한다.
    const FIT = pageHc * 1.04; // ≤4% 초과는 한 페이지에 살짝 맞춰 담음(빈 꼬리 페이지 방지)
    const slices = [];
    for (const [secTop, secBottom] of sections) {
      if (secBottom - secTop <= FIT) { slices.push([secTop, secBottom]); continue; }
      // 한 페이지보다 긴 섹션 — 남은 분량을 매번 균등 분할해 첫 페이지를 떼어낸다.
      // (남은 높이로 재계산 → 마지막 페이지도 한 장에 들어가고, 컷은 항상 블록 경계 = 글자 안 잘림)
      let top = secTop, guard = 0;
      while (secBottom - top > FIT && guard++ < 40) {
        const remain = secBottom - top;
        const ideal = Math.round(top + remain / Math.max(2, Math.ceil(remain / pageHc)));
        let cut = snapCut(top, ideal);
        if (cut < 0) cut = findSafeCut(Math.min(ideal, top + Math.round(pageHc)), top + Math.round(pageHc * 0.5));
        if (cut <= top || cut >= secBottom) cut = Math.min(top + Math.round(pageHc), secBottom);
        slices.push([top, cut]); top = cut;
      }
      slices.push([top, secBottom]);
    }

    slices.forEach(([top, bottom], idx) => {
      const sliceH = bottom - top;
      const pc = document.createElement('canvas');
      pc.width = canvas.width;
      pc.height = sliceH;                                 // 슬라이스 정확한 높이(패딩 X → 세로 왜곡 방지)
      const ctx = pc.getContext('2d');
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, pc.width, pc.height);
      ctx.drawImage(canvas, 0, top, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (idx > 0) pdf.addPage();
      pdf.setFillColor(11, 16, 32);
      pdf.rect(0, 0, pageW, pageH, 'F');                 // 페이지 전체 다크 배경(짧으면 하단 여백)
      // 가로 폭 기준으로 '비율 유지' 배치 → 세로 늘어남 없음
      const drawH = Math.min(pageH, sliceH * (pageW / canvas.width));
      pdf.addImage(pc.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pageW, drawH);
      onProgress?.(0.7 + 0.3 * ((idx + 1) / slices.length));
    });
    return pdf;
  } finally {
    iframe.remove();
  }
}

/* HTML → PDF Blob (로컬 다운로드용 — 서버 업로드 없음, 용량 제한 무관) */
export async function htmlToPdfBlob(html, onProgress) {
  const pdf = await renderHtmlToPdf(html, onProgress);
  return pdf.output('blob');
}

/* HTML → PDF base64 본문(데이터URI 접두 제거) — 메일 첨부 등 */
export async function htmlToPdfBase64(html, onProgress) {
  const pdf = await renderHtmlToPdf(html, onProgress);
  return pdf.output('datauristring').split(',')[1];
}
