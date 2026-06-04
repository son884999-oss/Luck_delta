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
    const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const BG = '#0b1020';                                  // 다크 테마 페이지 배경(단색)

    // 한 섹션(.page) = 한 PDF 페이지. 거대한 단일 캔버스 대신 '섹션별로 따로' 캡처한다
    //  → 큰 문서에서 상단이 검게 깨지던 현상(html2canvas 캔버스 한계·투명 처리)을 원천 차단.
    const pages = Array.from(doc.querySelectorAll('.page'));
    if (!pages.length) pages.push(doc.body);

    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      const canvas = await html2canvas(el, {
        scale: 1.6,               // 선명도 vs 용량 균형
        useCORS: true,            // 구글폰트/외부 리소스 허용
        backgroundColor: BG,      // 투명 → 검정 방지: 페이지 배경색으로 채움
        windowWidth: A4_W,
        logging: false,
      });

      if (i > 0) pdf.addPage();
      pdf.setFillColor(11, 16, 32);
      pdf.rect(0, 0, pageW, pageH, 'F');                   // 페이지 전체 다크 배경(여백용)

      // 한 장에 '맞춰' 배치 — 길면 가로폭까지 줄여 한 장에(분할 없음), 짧으면 세로 가운데.
      const naturalH = canvas.height * (pageW / canvas.width);
      let drawW, drawH, x, y;
      if (naturalH <= pageH) {
        drawW = pageW; drawH = naturalH; x = 0; y = (pageH - drawH) / 2;
      } else {
        const fitScale = pageH / naturalH;
        drawW = pageW * fitScale; drawH = pageH; x = (pageW - drawW) / 2; y = 0;
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', x, y, drawW, drawH);
      onProgress?.((i + 1) / pages.length);
    }
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
