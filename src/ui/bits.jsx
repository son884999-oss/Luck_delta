/* ================================================================
   천문 — 공용 작은 컴포넌트 (여러 화면이 공유)
   App.jsx에서 분리해 화면별 모듈이 독립적으로 import할 수 있게 한다.
================================================================ */
import { ChevronDown } from 'lucide-react';
import { playTap } from '../lib/audio.js';

/* 뒤로가기 바 (상단) */
export function BackBar({ onBack, label }) {
  return (
    <button onClick={() => { playTap(); onBack(); }}
      className="flex items-center gap-2 text-[14px] font-semibold transition-all active:scale-95 rounded-xl"
      style={{ minHeight: 44, padding: '0 4px', color: 'var(--ink-dim)' }}>
      <span className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <ChevronDown size={16} className="rotate-90"/>
      </span>
      <span>{label}</span>
    </button>
  );
}

/* 오류 박스 — 기술적 메시지를 40+ 친화적 따뜻한 문구로 변환 */
export function ErrorBox({ msg }) {
  const friendly = (() => {
    if (!msg) return '';
    if (msg.includes('API') || msg.includes('네트워크') || msg.includes('fetch') || msg.includes('failed'))
      return '지금 서버가 잠깐 바빠요. 1분 뒤에 다시 눌러보세요 🙏';
    if (msg.includes('팝업') || msg.includes('차단'))
      return '브라우저가 새 창을 막았어요. 주소창 오른쪽 팝업 허용 버튼을 눌러주세요 🙏';
    if (msg.includes('키') || msg.includes('key') || msg.includes('인증'))
      return 'AI 연결에 잠깐 문제가 생겼어요. 잠시 후 다시 시도해 주세요 🙏';
    return msg;
  })();
  return (
    <div role="alert" className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.22)' }}>
      <div className="flex items-start gap-2.5">
        <span className="text-[16px] flex-shrink-0 mt-0.5" aria-hidden="true">😔</span>
        <p className="text-[13.5px]" style={{ color: 'rgba(251,113,133,0.9)', lineHeight: 1.6 }}>{friendly}</p>
      </div>
    </div>
  );
}
