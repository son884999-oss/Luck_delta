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

    // ── 1) 섹션 경계 — 표지·명식·각 본문 섹션·맺음말은 '책의 챕터'처럼 각각 한 페이지다(.page).
    //        각 섹션의 [상단, 하단] 범위를 만든다.
    let starts = Array.from(doc.querySelectorAll('.page'))
      .map(el => yOf(el, 'top'))
      .filter(y => y >= 0 && y < canvas.height);
    starts = Array.from(new Set(starts)).sort((a, b) => a - b);
    if (!starts.length || starts[0] > 6) starts.unshift(0);
    const sections = starts.map((t, k) => [t, k + 1 < starts.length ? starts[k + 1] : canvas.height]);

    // ── 2) 한 섹션 = 한 페이지(분할 없음) — 각 섹션을 통째로 'PDF 한 장에 맞춰' 그린다.
    //        · 한 장보다 길면 → 가로폭까지 함께 줄여(세로가 한 장에 들어가도록) 균등 축소.
    //          내용은 작아질지언정 절대 두 페이지로 나뉘지 않는다.
    //        · 한 장보다 짧으면 → 가로를 꽉 채우고 세로 가운데 배치(위아래 여백 균등).
    const widthScale = pageW / canvas.width;             // 캔버스 px → PDF px (가로 기준)
    sections.forEach(([top, bottom], idx) => {
      const sliceH = Math.max(1, Math.round(bottom - top));
      const pc = document.createElement('canvas');
      pc.width = canvas.width;
      pc.height = sliceH;
      const ctx = pc.getContext('2d');
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, pc.width, pc.height);
      ctx.drawImage(canvas, 0, top, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (idx > 0) pdf.addPage();
      pdf.setFillColor(11, 16, 32);
      pdf.rect(0, 0, pageW, pageH, 'F');                 // 페이지 전체 다크 배경

      const naturalH = sliceH * widthScale;              // 가로를 꽉 채울 때의 높이(PDF px)
      let drawW, drawH, x, y;
      if (naturalH <= pageH) {
        drawW = pageW; drawH = naturalH; x = 0; y = (pageH - drawH) / 2;          // 짧음 → 세로 가운데
      } else {
        const fitScale = pageH / naturalH;                                       // 김 → 한 장에 맞춰 축소
        drawW = pageW * fitScale; drawH = pageH; x = (pageW - drawW) / 2; y = 0;
      }
      pdf.addImage(pc.toDataURL('image/jpeg', 0.85), 'JPEG', x, y, drawW, drawH);
      onProgress?.(0.7 + 0.3 * ((idx + 1) / sections.length));
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
