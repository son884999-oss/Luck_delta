import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Fingerprint, Heart, Coins, Wand2, Trash2, Eye, Shield, Pencil,
  TrendingUp, ChevronDown, ChevronRight, Sparkles, X, Calendar, Star, Zap, Clock, Users, Home,
  Crown, VolumeX, Volume2, GraduationCap, Utensils, Search, MapPin, Music, BookOpen,
} from 'lucide-react';
import {
  OHAENG, calculateIlju, calculateSaju, getOhaeng, getTti, todayStr, todayKey, vibrate, weekRangeStr, getRelationshipArchetype,
} from './lib/saju.js';
import {
  MODES, analyze, drawTarot, hasApiKey, hasTodayFortune, getYesterdayScore, pruneCache,
  callGeminiRetry, generateReport, generateStudyReport, generateGunghapReport,
  analyzeAstrology, analyzeZiwei,
} from './lib/fortune.js';
import { calcZiwei } from './lib/ziwei.js';
import { getSunSign, CONSTELLATION_ART } from './lib/astrology.js';
import { renderReportPdfHtml, renderStudyReportPdfHtml, renderGunghapReportPdfHtml } from './lib/reportPdf.js';

/* 별자리 선도 SVG — CC0 좌표 데이터 기반 */
function ConstellationSVG({ signKey, color = '#a78bfa', size = 80 }) {
  const art = CONSTELLATION_ART[signKey];
  if (!art) return <span style={{ fontSize: size * 0.5 }}>✦</span>;
  const { stars, lines } = art;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow:'visible' }}>
      {lines.map(([a,b],i) => (
        <line key={i} x1={stars[a][0]} y1={stars[a][1]} x2={stars[b][0]} y2={stars[b][1]}
          stroke={color} strokeWidth="1.8" strokeOpacity="0.45"/>
      ))}
      {stars.map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i===0?4.5:2.8} fill={color} opacity="0.95"/>
          <circle cx={x} cy={y} r={i===0?8:5.5} fill={color} opacity="0.12"/>
        </g>
      ))}
    </svg>
  );
}
import { generateSajuCardImageAsync } from './lib/sajuCardArt.js';
import { savePdf, loadPdf, clearPdf, listSavedReports } from './lib/reportStore.js';
// htmlToPdfBlob 는 html2canvas+jspdf(무거움) → 리포트 생성 시에만 동적 import

/* 리포트 진행/완성 메타 — 앱을 껐다 켜도 복원하기 위해 localStorage에 보관.
   (PDF 원본 Blob은 용량이 커서 reportStore.js의 IndexedDB에 저장) */
const REPORT_META_KEY = 'cm_report_meta';
const readReportMeta = () => { try { return JSON.parse(localStorage.getItem(REPORT_META_KEY) || 'null'); } catch (e) { return null; } };
const writeReportMeta = (m) => { try { localStorage.setItem(REPORT_META_KEY, JSON.stringify(m)); } catch (e) {} };
const clearReportMeta = () => { try { localStorage.removeItem(REPORT_META_KEY); } catch (e) {} };
import {
  playClick, playTap, playSuccess, playEntrance, playOpen, playReveal,
  playNavigation, playBack, playDelete, playToggleOn, playToggleOff, playReportDone, playError,
  getSoundPref, setSoundPref,
  startAmbient, stopAmbient, getAmbientPref, setAmbientPref,
} from './lib/audio.js';
import {
  Background, JEWELS, GlassCard, RevealCard, ScoreRing, BirthInput,
  OhaengSymbol, ScoreHistoryChart, PrimaryButton, ExpandableText, ConfirmDialog,
  ElementConstellation, Eyebrow, GoldHairline,
} from './ui/celestial.jsx';
import { ensureFoodUser, analyzeFood, analyzeFoodLocal } from './lib/foodApi.js';
import { recommendTodayFood, openNearbyRestaurants, pickFoodEmoji } from './lib/foodReco.js';
import { hasPlacesKey, searchRestaurantsByDishes } from './lib/places.js';
import { hasKakaoJsKey, loadKakaoMaps } from './lib/kakaoMap.js';
import { BackBar, ErrorBox } from './ui/bits.jsx';
import ClassicsLibrary from './ui/ClassicsLibrary.jsx';
import { dailyLine, getDiary, setDiaryEntry, deleteDiaryEntry, MOODS, isoDate } from './lib/diary.js';
import { shareImage, buildShareUrl } from './ui/shareCard.js';

const LOADING_STEPS = [
  { text:'하늘의 시간을 읽는 중', detail:'별과 별 사이의 간격을 헤아려요' },
  { text:'당신이 태어난 하늘을 펼치는 중', detail:'그 순간의 별자리를 다시 그려요' },
  { text:'오행의 기운을 길어 올리는 중', detail:'나무·불·흙·쇠·물의 결을 따라' },
  { text:'음과 양의 저울을 맞추는 중', detail:'차오름과 비움 사이 어딘가에서' },
  { text:'오늘과 당신을 가만히 포개는 중', detail:'두 개의 시간이 만나는 자리에서' },
  { text:'천문이 오늘의 문장을 받아 적는 중', detail:'곧 당신에게 닿을 이야기예요' },
];

const MODE_ICONS = {
  fortune: <Sparkles size={22}/>, weekly: <Calendar size={22}/>,
  saju: <Star size={22}/>, gunghap: <Heart size={22}/>, tarot: <Wand2 size={22}/>,
  monthly: <Calendar size={22}/>, yearly: <TrendingUp size={22}/>, wealth: <Coins size={22}/>,
};

/* 인앱 정보 시트 (약관/개인정보처리방침) — alert() 대체 */
function InfoSheet({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(3,5,14,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="glass-strong rounded-3xl w-full max-w-md max-h-[80svh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-[17px] font-bold text-white">{title}</h3>
          <button onClick={onClose} aria-label="닫기"
            className="flex items-center justify-center rounded-xl active:scale-90 transition-transform"
            style={{ width: 36, height: 36, color: 'var(--ink-dim)', background: 'rgba(255,255,255,0.05)' }}>
            <X size={18}/>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-3 flex-1">
          {children}
        </div>
        <div className="px-6 pb-5 pt-3 flex-shrink-0">
          <button onClick={onClose}
            className="w-full text-[15px] font-bold rounded-2xl active:scale-[0.98] transition-transform"
            style={{ minHeight: 52, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#a78bfa)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
}

/* 인앱 토스트 알림 — alert() 대체 (일시적 피드백용) */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };
  const ToastUI = toast ? (
    <div className="fixed top-5 left-0 right-0 z-[300] flex justify-center px-5 pointer-events-none animate-fade-up">
      <div className="pointer-events-auto glass-strong rounded-2xl flex items-center gap-3 max-w-sm"
        style={{ padding: '12px 18px', border: `1px solid ${toast.type === 'error' ? 'rgba(251,113,133,0.35)' : 'rgba(167,139,250,0.3)'}`,
          boxShadow: `0 12px 36px ${toast.type === 'error' ? 'rgba(251,113,133,0.2)' : 'rgba(99,102,241,0.25)'}` }}>
        <span style={{ fontSize: 18 }}>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✦' : 'ℹ️'}</span>
        <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{toast.msg}</p>
      </div>
    </div>
  ) : null;
  return { show, ToastUI };
}

export default function App() {
  // 로컬에 '유효한' 등록 정보(연도 4자리)가 있을 때만 엔트런스를 건너뛰고 허브에서 시작.
  // 손상/불완전 데이터로 깨진 허브에 진입하지 않도록 가드한다. (마운트 시 1회만 평가)
  const [step, setStep] = useState(() => {
    try {
      const s = localStorage.getItem('cm_birth');
      if (s) { const b = JSON.parse(s); if (b && String(b.y).length === 4) return 'hub'; }
    } catch (e) {}
    return 'entrance';
  }); // entrance|setup|hub|form|tarotDraw|analyzing|result|report
  const [mode, setMode] = useState('fortune');
  const [birth, setBirth] = useState(() => {
    try { const s = localStorage.getItem('cm_birth'); if (s) return JSON.parse(s); } catch (e) {}
    return { y:'', m:'6', d:'15', h:'모름', min:'0' }; // 월 기본값은 가운데(6)
  });
  const [birth2, setBirth2] = useState({ y:'', m:'6', d:'15', h:'모름', min:'0' });
  const [nickname2, setNickname2] = useState('');
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('cm_nick') || ''; } catch (e) { return ''; }
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadStep, setLoadStep] = useState(0);
  const [yesterday, setYesterday] = useState(null);
  const [streak, setStreak] = useState(0);
  // 기본 글자크기 = 한 단계 키운 크기(1.18). 40+ 타깃 기본 가독성 상향.
  const [fontIdx, setFontIdx] = useState(() => {
    try { const s = localStorage.getItem('cm_fs'); return s != null ? Math.max(1, parseInt(s)) : 1; } catch { return 1; }
  });
  const [reportType, setReportType] = useState('signature'); // 'signature' | 'study'
  // 백그라운드 리포트: 제출 즉시 해방 → 뒤에서 생성·PDF준비 → 완성 팝업
  // 완성/중단 상태는 localStorage+IndexedDB에 저장 → 앱을 껐다 켜도 복원
  const [bgReport, setBgReport] = useState({ status: 'idle', pdfUrl: '', type: 'signature', err: '' }); // idle|working|done|error
  const [soundOn, setSoundOn] = useState(() => getSoundPref());
  const [ambientOn, setAmbientOn] = useState(() => getAmbientPref());
  const [confirmReset, setConfirmReset] = useState(false); // 정보 초기화 확인 모달
  const [infoSheet, setInfoSheet] = useState(null); // null | 'terms' | 'privacy'
  const abortRef = useRef(null); // AI 분석 취소용 AbortController ref
  const tarotPrefetchRef = useRef(null); // 타로: 셔플 시 미리 시작한 분석 Promise·결과 보관
  const [lastMode, setLastMode] = useState(null); // 재시도용 마지막 모드 저장
  const { show: showToast, ToastUI } = useToast();

  const fontScale = [1, 1.18, 1.40][fontIdx];

  /* ── 초기 로드 (birth/nickname/step 은 위에서 lazy 초기화됨) ── */
  useEffect(() => {
    pruneCache();
    // fontIdx는 useState lazy 초기화(cm_fs)에서 이미 복원됨 — 여기서 다시 set하지 않는다.
    setYesterday(getYesterdayScore());

    const today = todayKey();
    const lastVisit = localStorage.getItem('cm_lv');
    const savedStreak = parseInt(localStorage.getItem('cm_streak') || '0');
    if (lastVisit === today) setStreak(savedStreak || 1);
    else {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
      const ns = lastVisit === yKey ? savedStreak + 1 : 1;
      setStreak(ns); localStorage.setItem('cm_streak', String(ns)); localStorage.setItem('cm_lv', today);
    }
  }, []);

  /* ── 분석 진행 애니메이션 ── */
  useEffect(() => {
    if (step !== 'analyzing') return;
    const msg = setInterval(() => setLoadStep(s => (s + 1) % LOADING_STEPS.length), 2100);
    const prog = setInterval(() => {
      setProgress(prev => {
        const cap = loaded ? 100 : 92;
        if (prev >= cap) return cap;
        return prev + (loaded ? 6 : 2);
      });
    }, loaded ? 24 : 170);
    return () => { clearInterval(msg); clearInterval(prog); };
  }, [step, loaded]);

  useEffect(() => {
    if (step === 'analyzing' && loaded && progress >= 100) {
      const t = setTimeout(() => setStep('result'), 420);
      return () => clearTimeout(t);
    }
  }, [step, loaded, progress]);

  /* ── 화면 전환 시 항상 맨 위에서 시작 ── */
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [step]);

  /* 배경 패드(앰비언트)는 음산하게 들려 비활성화 — 효과음/장면음만 사용. */

  /* ── 리포트 복원 — 앱을 껐다 켜도 완성된 리포트 재다운로드/중단 재시도 가능 ── */
  useEffect(() => {
    const m = readReportMeta();
    if (!m) return;
    if (m.status === 'done') {
      // 완성본 보관 중 → 팝업 복원(다운로드 시 IndexedDB에서 지연 로드)
      setBgReport({ status: 'done', pdfUrl: '', type: m.type || 'signature', email: m.email || '', err: '' });
    } else {
      // working/error 메타가 남아 있으면 생성 도중 앱이 닫힌 것 → 재시도 유도
      setBgReport({ status: 'error', pdfUrl: '', type: m.type || 'signature', email: m.email || '',
        err: '리포트를 만들다 중단됐어요. 다시 만들어 드릴까요?' });
    }
  }, []);

  /* ── 사운드 토글 (효과음만) ── */
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundPref(next);
    if (next) playToggleOn(); else playToggleOff();
    vibrate(8);
  };

  // 배경음 토글 — 효과음과 독립. 켜면 즉시 시작(클릭이 곧 사용자 제스처).
  const toggleAmbient = () => {
    const next = !ambientOn;
    setAmbientOn(next);
    setAmbientPref(next);
    if (next) startAmbient(); else stopAmbient();
    if (soundOn) (next ? playToggleOn() : playToggleOff());
    vibrate(8);
  };

  // 배경음 도입 — AudioContext는 사용자 제스처 후에만 울린다. 진입 경로와
  // 무관하게(신규=엔트런스 탭, 재방문=허브 첫 탭) 첫 포인터 입력에서 한 번 시작.
  useEffect(() => {
    if (!getAmbientPref()) return;
    const unlock = () => startAmbient();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); stopAmbient(); };
  }, []);

  /* ── 프리미엄 리포트 — 클라이언트에서 PDF를 조용히 생성(화면 노출 X)
     type: 'signature'(인생 시그니처) | 'study'(학습 상세). */
  const pickReport = (type) => { setReportType(type); setStep('report'); vibrate(14); playClick(); };
  const requestReport = (typeArg, ov = null) => {
    if (bgReport.status === 'working') return; // 중복 제출 방지
    const name = nickname || '천문';
    // typeArg가 문자열일 때만 사용(onClick 이벤트 객체가 새어 들어오는 것 방지)
    const type = (typeof typeArg === 'string' && typeArg) ? typeArg : reportType;
    // 궁합 상대방 정보: 입력 직후 호출 시 state 반영 전이므로 ov로 직접 전달받아 우선 사용
    const b2 = ov?.birth2 || birth2;
    const n2 = ov?.name2 || nickname2 || '상대방';
    // 궁합인데 상대방 정보가 없으면 입력 화면으로 안내(데이터 없는 채로 생성되는 것 방지)
    if (type === 'gunghap' && !b2?.y) {
      setStep('reportSelect');
      setBgReport({ status: 'idle', pdfUrl: '', type: 'gunghap', err: '먼저 상대방 생년월일을 입력해 주세요.' });
      vibrate(20);
      return;
    }
    // 이전 다운로드 URL 정리 (이전 type의 IndexedDB 항목은 덮어쓰기로 자동 교체)
    if (bgReport.pdfUrl) { try { URL.revokeObjectURL(bgReport.pdfUrl); } catch (e) {} }
    writeReportMeta({ status: 'working', type, name, date: Date.now() });
    setBgReport({ status: 'working', pdfUrl: '', type, partnerName: type === 'gunghap' ? n2 : null, err: '' });
    setStep('hub');                 // 즉시 메인으로 — 사용자는 기다리지 않음
    vibrate([20, 40]);

    // fire-and-forget (await 하지 않음)
    (async () => {
      try {
        // 1) AI 리포트 데이터 생성(파트 병렬)
        let data;
        if (type === 'study') {
          data = await generateStudyReport(birth, name);
        } else if (type === 'gunghap') {
          if (!b2?.y) throw new Error('상대방 생년월일이 없어요. 궁합 화면에서 다시 시도해 주세요.');
          data = await generateGunghapReport(birth, b2, name, n2);
        } else {
          data = await generateReport(birth, name);
        }

        // 2) 다운로드용 PDF를 로컬에서 생성 → IndexedDB에 영속 저장
        let html;
        if (type === 'study')        html = renderStudyReportPdfHtml(data, 'dark');
        else if (type === 'gunghap') html = renderGunghapReportPdfHtml(data, 'dark');
        else                         html = renderReportPdfHtml(data, 'dark');
        const { htmlToPdfBlob } = await import('./lib/clientPdf.js');
        const blob = await htmlToPdfBlob(html);
        // 궁합은 상대 이름별로 저장(여러 개 공존). 그 외는 단일.
        await savePdf(blob, type, type === 'gunghap' ? n2 : null);
        writeReportMeta({ status: 'done', type, name, partnerName: type === 'gunghap' ? n2 : null, date: Date.now() });
        const url = URL.createObjectURL(blob);

        setBgReport({ status: 'done', pdfUrl: url, type, partnerName: type === 'gunghap' ? n2 : null, err: '' });
        playReportDone(); vibrate([28, 50, 80, 0, 60, 100]);
      } catch (e) {
        writeReportMeta({ status: 'error', type, name, date: Date.now() });
        setBgReport({ status: 'error', pdfUrl: '', type, err: e.message || '리포트 생성에 실패했어요.' });
        playError(); vibrate(30);
      }
    })();
  };

  /* 완성 팝업에서 PDF 로컬 다운로드. 복원된 세션이면 IndexedDB에서 지연 로드. */
  const downloadReport = async () => {
    let url = bgReport.pdfUrl;
    if (!url) {
      const blob = await loadPdf(bgReport.type || 'signature', bgReport.partnerName || null);
      if (!blob) { setBgReport(b => ({ ...b, status: 'error', err: '저장된 리포트를 찾지 못했어요. 다시 만들어 주세요.' })); return; }
      url = URL.createObjectURL(blob);
      setBgReport(b => ({ ...b, pdfUrl: url }));
    }
    const label = bgReport.type === 'study' ? '학습상세' : bgReport.type === 'gunghap' ? '궁합심층' : '시그니처';
    const who = bgReport.type === 'gunghap' && bgReport.partnerName ? `_${bgReport.partnerName}` : '';
    const a = document.createElement('a');
    a.href = url;
    a.download = `천문_${label}리포트_${nickname || '천문'}${who}.pdf`;
    a.click();
    playTap(); vibrate(12);
  };
  const dismissReport = () => {
    if (bgReport.pdfUrl) { try { URL.revokeObjectURL(bgReport.pdfUrl); } catch (e) {} }
    clearReportMeta();
    setBgReport({ status: 'idle', pdfUrl: '', type: bgReport.type, email: '', err: '' });
  };

  /* ── 핸들러 ── */
  // 글자 확대 토글 — 표준(1.18) ↔ 확대(1.40). 작게/3단계 제거.
  const cycleFont = () => { const n = fontIdx >= 2 ? 1 : 2; setFontIdx(n); localStorage.setItem('cm_fs', String(n)); vibrate(8); };

  const registerBirth = () => {
    if (!nickname.trim()) { setError('별명을 입력해 주세요.'); return; }
    const y = parseInt(birth.y);
    if (!birth.y || String(birth.y).length < 4) { setError('출생 연도를 4자리로 입력해 주세요.'); return; }
    if (y < 1900 || y > new Date().getFullYear()) { setError(`출생 연도를 1900~${new Date().getFullYear()} 사이로 입력해 주세요.`); return; }
    localStorage.setItem('cm_birth', JSON.stringify(birth));
    localStorage.setItem('cm_nick', nickname.trim());
    setError(''); setStep('hub'); vibrate(30); playSuccess();
  };

  const clearAndReset = () => setConfirmReset(true); // 커스텀 인앱 확인 모달 오픈
  const doReset = () => {
    Object.keys(localStorage).filter(k => k.startsWith('cm_')).forEach(k => localStorage.removeItem(k));
    setBirth({ y:'', m:'6', d:'15', h:'모름', min:'0' }); setBirth2({ y:'', m:'6', d:'15', h:'모름', min:'0' });
    setNickname(''); setResult(null); setConfirmReset(false); setStep('setup'); setError(''); vibrate(12);
  };

  const cancelAnalysis = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStep(lastMode === 'gunghap' ? 'form' : 'hub');
    setError(''); vibrate(10);
  };

  const runAnalysis = async (m, b = birth, b2 = null, extra = null) => {
    if (!b.y || String(b.y).length < 4) { setError('출생 연도를 4자리로 입력해 주세요.'); return; }
    if (m === 'gunghap' && (!b2?.y || String(b2.y).length < 4)) { setError('상대방 연도도 4자리로 입력해 주세요.'); return; }
    if (!navigator.onLine) { setError('인터넷 연결을 확인해 주세요. 연결 후 다시 시도해 주세요.'); return; }
    if (!hasApiKey()) { setError('API 키가 설정되지 않았어요.'); return; }
    // 이전 요청 취소
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLastMode(m);
    setError(''); setResult(null); setLoaded(false); setProgress(0); setLoadStep(0); setMode(m); setStep('analyzing'); vibrate(28);
    try {
      const r = await analyze({ mode:m, birth:b, birth2:b2, userName:nickname || '사용자', extra, signal: abortRef.current.signal });
      abortRef.current = null;
      setResult(r); setLoaded(true); playSuccess();
      if (m === 'fortune') setYesterday(getYesterdayScore());
    } catch (err) {
      abortRef.current = null;
      if (err.name === 'AbortError') return; // 사용자가 직접 취소 → 오류 메시지 불필요
      const msg = err.code === 'apikey' ? 'API 키가 유효하지 않아요.'
        : err.code === 'rate' ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
        : !navigator.onLine ? '인터넷 연결이 끊겼어요.'
        : '분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
      setError(msg); setStep(m === 'gunghap' ? 'form' : 'hub');
    }
  };

  // ── 타로 prefetch ──────────────────────────────────────────────
  // 카드를 섞는 순간 카드를 미리 확정하고 백그라운드로 분석을 시작한다.
  // 사용자가 카드를 뽑을 때(tarotReveal)는 이미 분석이 끝나 있어 대기가 없다.
  const tarotPrefetch = () => {
    if (!hasApiKey() || !navigator.onLine) return; // 조건 미충족 시 폴백(뽑을 때 분석)
    if (tarotPrefetchRef.current) return; // 이미 진행 중
    const card = drawTarot();
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const promise = analyze({ mode:'tarot', birth, birth2:null, userName:nickname || '사용자', extra:{ card }, signal: ctrl.signal })
      .then(r => ({ ok:true, r }))
      .catch(err => ({ ok:false, err }));
    tarotPrefetchRef.current = { card, promise, ctrl };
  };

  // 카드 선택 시 호출 — prefetch 결과를 기다렸다가 결과 화면으로
  const tarotReveal = async () => {
    setLastMode('tarot'); setMode('tarot');
    if (!hasApiKey()) { setError('API 키가 설정되지 않았어요.'); setStep('categoryKnow'); return; }
    if (!navigator.onLine) { setError('인터넷 연결을 확인해 주세요. 연결 후 다시 시도해 주세요.'); setStep('categoryKnow'); return; }
    const pf = tarotPrefetchRef.current;
    // prefetch가 없으면(조건 미충족 등) 즉시 일반 분석으로 폴백
    if (!pf) { runAnalysis('tarot', birth, null, { card:drawTarot() }); return; }
    setError(''); setResult(null); setLoaded(false);
    try {
      const out = await pf.promise; // 이미 끝났으면 즉시, 진행 중이면 카드 뒤집기 동안 완료
      tarotPrefetchRef.current = null; abortRef.current = null;
      if (out.ok) {
        setResult(out.r); setLoaded(true); setStep('result'); playSuccess();
      } else {
        if (out.err?.name === 'AbortError') return;
        setError('분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'); setStep('categoryKnow');
      }
    } catch (e) {
      tarotPrefetchRef.current = null; abortRef.current = null;
      setError('분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'); setStep('categoryKnow');
    }
  };

  const startMode = (m) => {
    setError(''); playTap();
    if (m === 'gunghap') { setMode('gunghap'); setStep('form'); }
    else if (m === 'tarot') setStep('tarotDraw');
    else runAnalysis(m);
  };

  const share = async () => {
    playClick();
    const r = result || {};
    const isCard = r.analysisMode === 'card';
    const head = isCard ? r.cardTitle : r.oneliner;
    const link = buildShareUrl({
      headline: isCard ? (r.cardTitle || '천문') : (r.tarot ? r.tarot.ko : '천문'),
      score: (!isCard && typeof r.score === 'number') ? r.score : null,
      sub: isCard ? (r.cardQuote || '') : (r.oneliner || ''),
      ilju: r.ilju || '', element: getOhaeng(ilju), accent: oh?.color || '',
    });
    const isTarot = !!r.tarot;
    const text = isCard
      ? `✨ ${nickname || ''}님의 사주 카드\n"${head}"\n${r.cardQuote ? `${r.cardQuote}\n` : ''}${link}\n#천문 #사주카드`
      : isTarot
        ? `🃏 ${nickname || ''}님의 타로 — ${r.tarot.ko}(${r.tarot.upright ? '정방향' : '역방향'})\n"${r.oneliner || r.tarot.kw}"\n${link}\n#천문 #타로`
        : `🔮 ${nickname || ''}님의 천문 운세${r.score ? ` · ${r.score}점` : ''}\n"${head}"\n${link}\n#천문 #AI운세`;
    // 사주 카드·타로는 이미지 공유, 나머지는 텍스트만
    let blob = null;
    if (isCard) {
      try {
        const heroImg = document.querySelector('[data-saju-card-img]')?.src;
        if (heroImg) blob = await (await fetch(heroImg)).blob();
      } catch (e) { /* 폴백 */ }
    } else if (isTarot && r.tarot.img) {
      try { blob = await (await fetch(r.tarot.img)).blob(); } catch (e) { /* 폴백 */ }
    }
    const filename = isCard ? '천문_사주카드.png' : isTarot ? `천문_타로_${r.tarot.ko}.jpg` : '천문_운세.txt';
    await shareImage({ blob, filename, text });
    vibrate(10);
  };

  const ilju = useMemo(() => calculateIlju(birth.y, birth.m, birth.d, birth.h, birth.min), [birth]);
  const oh = OHAENG[getOhaeng(ilju)];

  return (
    <div>
      {ToastUI}
      {/* 결과·허브 화면에서 본인 오행색으로 배경 오로라가 물든다 */}
      <Background ohaengColor={(step === 'result' || step === 'hub') ? (oh?.color || null) : null}/>
      <main role="main" className="relative z-10 min-h-screen max-w-xl mx-auto" style={{ zoom: fontScale === 1 ? undefined : fontScale, '--fs': fontScale, padding: `0 ${Math.round(20 / (fontScale || 1))}px` }}>

        {step === 'entrance' && <Entrance onEnter={() => { setError(''); playEntrance(); setStep('setup'); vibrate(20); }}/>}

        {step === 'setup' && (
          <Setup nickname={nickname} setNickname={setNickname} birth={birth} setBirth={setBirth}
            error={error} onSubmit={registerBirth}/>
        )}

        {step === 'hub' && (
          <Hub nickname={nickname} birth={birth} oh={oh} streak={streak} error={error}
            onPick={startMode} onEditBirth={() => { setError(''); playTap(); setStep('setup'); }}
            onCategoryKnow={() => { setStep('categoryKnow'); vibrate(14); playNavigation(); }}
            onCategoryRelate={() => { setStep('categoryRelate'); vibrate(14); playNavigation(); }}
            onCategoryRecord={() => { setStep('categoryRecord'); vibrate(14); playNavigation(); }}
            onFood={() => { setStep('food'); vibrate(14); playNavigation(); }}
            onClassics={() => { setStep('classics'); vibrate(14); playNavigation(); }}
            onFont={cycleFont} bigFont={fontIdx >= 2} onReset={clearAndReset}
            soundOn={soundOn} onToggleSound={toggleSound}
            ambientOn={ambientOn} onToggleAmbient={toggleAmbient}
            onShowTerms={() => setInfoSheet('terms')} onShowPrivacy={() => setInfoSheet('privacy')}
            onToast={showToast}/>
        )}

        {step === 'categoryKnow' && (
          <CategoryKnow nickname={nickname} birth={birth} ilju={ilju}
            onBack={() => { setStep('hub'); vibrate(10); playBack(); }}
            onPick={(s) => { setStep(s); vibrate(14); playNavigation(); }}
            onPickMode={(m) => { playNavigation(); startMode(m); }}/>
        )}
        {step === 'categoryRelate' && (
          <CategoryRelate nickname={nickname}
            onBack={() => { setStep('hub'); vibrate(10); playBack(); }}
            onPick={(s) => { setStep(s); vibrate(14); playNavigation(); }}
            onPickMode={(m) => { startMode(m); }}/>
        )}
        {step === 'categoryRecord' && (
          <CategoryRecord nickname={nickname}
            onBack={() => { setStep('hub'); vibrate(10); playBack(); }}
            onPick={(s) => { setStep(s); vibrate(14); playNavigation(); }}/>
        )}
        {step === 'astrology' && (
          <AstrologyScreen nickname={nickname} birth={birth} ilju={ilju}
            onBack={() => { setStep('categoryKnow'); vibrate(10); playBack(); }}/>
        )}
        {step === 'ziwei' && (
          <ZiweiScreen nickname={nickname} birth={birth} ilju={ilju}
            onBack={() => { setStep('categoryKnow'); vibrate(10); playBack(); }}/>
        )}
        {step === 'numerology' && (
          <NumerologyScreen nickname={nickname} birth={birth}
            onBack={() => { setStep('categoryKnow'); vibrate(10); playBack(); }}/>
        )}

        {step === 'studyCompass' && (
          <StudyCompass
            nickname={nickname}
            ilju={ilju}
            onBack={() => { setStep('categoryRelate'); vibrate(10); playBack(); }}
            onReport={() => { setStep('hub'); vibrate(14); playClick(); requestReport('study'); }}
          />
        )}

        {step === 'food' && (
          <FoodTable
            nickname={nickname}
            birth={birth}
            onBack={() => { setStep('hub'); vibrate(10); }}
          />
        )}

        {step === 'classics' && (
          <ClassicsLibrary
            birth={birth}
            onBack={() => { setStep('hub'); vibrate(10); playBack(); }}
          />
        )}

        {step === 'reportSelect' && (
          <ReportSelect
            nickname={nickname}
            birth2={birth2} nickname2={nickname2}
            setNickname2={setNickname2} setBirth2={setBirth2}
            onBack={() => { setStep('hub'); vibrate(10); }}
            onPick={pickReport}
            onMakeGunghap={(b2, n2) => { setBirth2(b2); setNickname2(n2); vibrate(14); playClick(); requestReport('gunghap', { birth2: b2, name2: n2 }); }}
          />
        )}

        {step === 'diary' && (
          <Diary nickname={nickname} birth={birth} onBack={() => { setStep('categoryRecord'); playBack(); vibrate(10); }}
            onManage={() => { setStep('diaryHub'); vibrate(12); }}/>
        )}

        {step === 'diaryHub' && (
          <DiaryHub nickname={nickname} onBack={() => setStep('diary')}/>
        )}

        {step === 'form' && (
          <GunghapForm nickname={nickname} birth={birth} ilju={ilju} birth2={birth2} setBirth2={setBirth2}
            nickname2={nickname2} setNickname2={setNickname2}
            error={error} onBack={() => { setError(''); setStep('hub'); }}
            onSubmit={() => runAnalysis('gunghap', birth, birth2, { partnerName: nickname2 || '상대방' })}/>
        )}

        {step === 'tarotDraw' && (
          <TarotDraw
            onBack={() => {
              if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
              tarotPrefetchRef.current = null;
              setStep('categoryKnow'); playBack(); vibrate(10);
            }}
            onPrefetch={tarotPrefetch}
            onReveal={tarotReveal}/>
        )}

        {step === 'analyzing' && <Analyzing progress={Math.round(progress)} loadStep={loadStep} onCancel={cancelAnalysis}/>}

        {step === 'result' && result && (
          <Result result={result} nickname={nickname} birth={birth} yesterday={yesterday} streak={streak}
            onHome={() => { playTap(); setResult(null); setStep('hub'); vibrate(12); }}
            onRetry={() => { playTap(); runAnalysis(mode); }}
            onGunghapReport={mode === 'gunghap' ? () => { vibrate(14); playClick(); requestReport('gunghap'); } : null}
            onSajuCard={null}
            onShare={share} onFont={cycleFont} fontLabel={['가-', '가', '가+'][fontIdx]}/>
        )}

        {step === 'report' && (
          <ReportDetail
            reportType={reportType}
            onSubmit={requestReport}
            onBack={() => { setStep('reportSelect'); vibrate(10); }}
          />
        )}

        {/* 화면 최하단 — 어느 기능 화면에서든 메인으로 한 번에 (상단 뒤로가기 보조) */}
        {['categoryKnow','categoryRelate','categoryRecord','astrology','ziwei','numerology','studyCompass','food','reportSelect','diary','diaryHub','form','tarotDraw','report'].includes(step) && (
          <div className="pb-12">
            <button onClick={() => { playTap(); setStep('hub'); vibrate(12); }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-[14px] active:scale-[0.98] transition-transform"
              style={{ minHeight: 50, color: 'var(--ink-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <Home size={16}/> 메인으로
            </button>
          </div>
        )}
      </main>

      <ConfirmDialog open={confirmReset} danger
        title="처음으로 되돌릴까요?"
        message={'등록된 정보와 모든 일기 기록이 삭제돼요.\n되돌릴 수 없어요.'}
        confirmLabel="초기화" cancelLabel="취소"
        onConfirm={doReset} onCancel={() => setConfirmReset(false)}/>

      <InfoSheet open={infoSheet === 'terms'} title="서비스 이용약관" onClose={() => setInfoSheet(null)}>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>천문 앱은 사주·타로·운세 등을 AI로 제공하는 <b className="text-white">엔터테인먼트 서비스</b>입니다.</p>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>제공되는 모든 콘텐츠는 오락 목적이며 의료·법률·금융 조언을 대체하지 않습니다.</p>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>생년월일 정보는 기기 내 로컬에만 저장되며 서버로 전송되지 않습니다.</p>
      </InfoSheet>

      <InfoSheet open={infoSheet === 'privacy'} title="개인정보 처리방침" onClose={() => setInfoSheet(null)}>
        <div className="space-y-2">
          {[
            ['수집 항목', '별명, 생년월일, 출생 시간'],
            ['수집 목적', '사주·운세 분석 (기기 내 처리)'],
            ['보관 장소', '사용자 기기 로컬 저장소 (localStorage)'],
            ['제3자 제공', '없음'],
            ['삭제 방법', '설정 > 초기화로 즉시 삭제 가능'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[13px] font-bold flex-shrink-0 w-24" style={{ color: 'var(--gold)' }}>{k}</span>
              <span className="text-[13px]" style={{ color: 'var(--ink-dim)' }}>{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] mt-2" style={{ color: 'var(--ink-faint)' }}>생년월일은 외부 서버로 전송되지 않으며, AI 분석 시 암호화된 API 통신을 사용합니다.</p>
      </InfoSheet>

      <ReportToast bg={bgReport} onDownload={downloadReport} onDismiss={dismissReport}
        onRetry={() => requestReport(bgReport.type)}/>

    </div>
  );
}

/* 백그라운드 리포트 상태 팝업(전역) — 화면 어디서든 떠서 진행/완성/실패를 알린다.
   완성 시 누르면 PDF가 로컬 다운로드된다. */
function ReportToast({ bg, onDownload, onDismiss, onRetry }) {
  if (!bg || bg.status === 'idle') return null;
  const working = bg.status === 'working';
  const done = bg.status === 'done';
  const accent = bg.type === 'study' ? '#10b981' : bg.type === 'gunghap' ? '#fb7185' : '#C8A876';
  return (
    <div className="fixed left-0 right-0 z-[150] px-5 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="max-w-xl mx-auto pointer-events-auto">
        <div className="glass-strong rounded-2xl flex items-center gap-3 animate-fade-up"
          style={{ padding: '14px 16px', border: `1px solid ${accent}55`, boxShadow: `0 12px 36px ${accent}33, 0 2px 10px rgba(0,0,0,0.35)` }}>
          {working && <div className="w-7 h-7 rounded-full animate-spin flex-shrink-0" style={{ border: `3px solid ${accent}33`, borderTopColor: accent }}/>}
          {done && <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accent}1f`, border: `1px solid ${accent}55` }}><span style={{ color: accent, fontSize: 18 }}>✓</span></div>}
          {bg.status === 'error' && <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.4)' }}><span style={{ color: '#fb7185', fontSize: 18, fontWeight: 700 }}>!</span></div>}

          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>
              {working ? '리포트 생성 중' : done ? '리포트 생성 완료' : '리포트 생성 실패'}
            </p>
            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-dim)' }}>
              {working ? '앱은 계속 쓰셔도 돼요'
                : done ? 'PDF로 저장하세요'
                : (bg.err || '잠시 후 다시 시도해 주세요')}
            </p>
          </div>

          {done && (
            <button onClick={onDownload} className="text-[13px] font-bold rounded-xl flex-shrink-0 active:scale-95 transition-transform"
              style={{ minHeight: 44, padding: '0 16px', color: '#fff', background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
              PDF 받기
            </button>
          )}
          {bg.status === 'error' && (
            <button onClick={onRetry} className="text-[13px] font-bold rounded-xl flex-shrink-0 active:scale-95 transition-transform"
              style={{ minHeight: 44, padding: '0 16px', color: '#fff', background: 'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
              다시
            </button>
          )}
          {!working && (
            <button onClick={onDismiss} aria-label="알림 닫기" className="flex-shrink-0 flex items-center justify-center rounded-lg active:scale-90 transition-transform"
              style={{ width: 36, height: 36, color: 'var(--ink-dim)' }}>
              <X size={18}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ENTRANCE
================================================================ */
function Entrance({ onEnter }) {
  const [touched, setTouched] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handleTap = (e) => {
    // 터치/클릭 위치에 리플 효과
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { x, y, id }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 800);
    if (!touched) {
      setTouched(true);
      setTimeout(onEnter, 320);
    }
  };

  return (
    <div role="button" tabIndex={0} aria-label="천문 시작하기 · 화면을 누르면 들어가요"
      className="screen-vh flex flex-col items-center justify-center text-center select-none cursor-pointer relative overflow-hidden"
      onClick={handleTap}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEnter(); } }}>

      {/* 배경 별무리 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {[[12,18],[83,12],[26,80],[71,86],[48,8],[92,46],[8,54],[58,70],[36,40],[66,30],[55,25],[20,60],[75,50]].map(([x,y],i)=>(
          <span key={i} className="absolute rounded-full" style={{
            left:`${x}%`, top:`${y}%`,
            width:i%4===0?3:i%3===0?2.5:2, height:i%4===0?3:i%3===0?2.5:2,
            background:'#fff',
            boxShadow:`0 0 ${i%3===0?8:5}px 1px rgba(167,139,250,${i%3===0?0.9:0.6})`,
            animation:`cm-twinkle ${3+i*0.4}s ease-in-out ${i*0.35}s infinite`
          }}/>
        ))}
      </div>

      {/* 리플 효과 */}
      {ripples.map(rp => (
        <span key={rp.id} className="absolute rounded-full pointer-events-none" style={{
          left: rp.x, top: rp.y,
          width: 10, height: 10,
          marginLeft: -5, marginTop: -5,
          background: 'rgba(167,139,250,0.6)',
          animation: 'ripple-out 0.8s ease-out forwards',
        }}/>
      ))}

      {/* 중앙 아이콘 그룹 */}
      <div className={`relative mb-10 transition-all duration-300 ${touched ? 'scale-110 opacity-70' : 'animate-float'}`}>
        {/* 회전하는 보석빛 오로라 후광 — 장엄한 첫인상 */}
        <div className="absolute inset-0 rounded-full scale-[3.6] pointer-events-none" style={{
          background:'conic-gradient(from 0deg, transparent, rgba(231,185,79,0.20), transparent 38%, rgba(167,139,250,0.20), transparent 68%, rgba(56,189,248,0.15), transparent)',
          filter:'blur(22px)', animation:'halo-spin 26s linear infinite' }}/>
        <div className="absolute inset-0 rounded-full scale-[3]"
          style={{ background:'radial-gradient(circle, rgba(129,140,248,0.25), transparent 68%)', animation:'glow-pulse 3.5s ease-in-out infinite' }}/>
        <div className="absolute inset-0 rounded-full scale-[2]"
          style={{ background:'radial-gradient(circle, rgba(167,139,250,0.15), transparent 68%)', animation:'glow-pulse 5s ease-in-out 1s infinite' }}/>
        <Fingerprint size={92} strokeWidth={0.55} className="relative" style={{ color:'rgba(255,255,255,0.55)' }}/>
      </div>

      <h1 className="serif font-black tracking-[0.32em] leading-none animate-fade-up"
        style={{ fontSize:'clamp(3.2rem,13vw,4.6rem)', color:'#fff', textShadow:'0 0 80px rgba(167,139,250,0.5), 0 0 40px rgba(129,140,248,0.3), 0 0 26px rgba(231,185,79,0.28)' }}>
        천문
      </h1>
      <p className="mt-4 animate-fade-up flex items-center gap-2" style={{ animationDelay:'0.2s' }}>
        <span style={{ color:'#e7b94f', fontSize:'0.6rem' }}>✦</span>
        <span style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.42em', color:'rgba(231,185,79,0.62)' }}>AI 명리 운세</span>
        <span style={{ color:'#e7b94f', fontSize:'0.6rem' }}>✦</span>
      </p>

      {/* 시작 힌트 */}
      <div className="absolute bottom-16 flex flex-col items-center gap-3 animate-fade-up" style={{ animationDelay:'2s', animationFillMode:'both' }}>
        <div className="w-12 h-[1px] mx-auto" style={{ background:'linear-gradient(to right,transparent,rgba(255,255,255,0.25),transparent)' }}/>
        <span style={{ fontSize:'0.65rem', letterSpacing:'0.28em', color:'rgba(255,255,255,0.28)' }}>화면을 눌러 시작하세요</span>
        <ChevronDown size={14} className="animate-bounce" style={{ color:'rgba(255,255,255,0.22)' }}/>
      </div>
    </div>
  );
}

/* ================================================================
   SETUP
================================================================ */
function Setup({ nickname, setNickname, birth, setBirth, error, onSubmit }) {
  const birthRef = useRef(null);
  const nicknameReady = nickname.trim().length > 0;
  const yearReady = birth.y && String(birth.y).length === 4;
  const allReady = nicknameReady && yearReady;

  return (
    <div className="py-10 pb-16 space-y-7 animate-fade-up">
      <header className="space-y-3 pt-2">
        <div className="w-12 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#818cf8,#a78bfa)' }}/>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color:'rgba(167,139,250,0.7)' }}>천문에 오신 걸 환영해요</p>
        <h2 className="serif font-bold text-white leading-snug" style={{ fontSize:'clamp(1.7rem,7vw,2.3rem)', whiteSpace:'pre-line' }}>{'당신에 대해\n알려주세요'}</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>
          태어난 순간의 하늘을 읽어드려요.<br/>이름과 생년월일만 있으면 돼요.
        </p>
        {/* 기능 칩 */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {['오늘의 운세', '평생 사주', '궁합', '타로', '식탁 추천', '학습 나침반'].map(t => (
            <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color:'rgba(167,139,250,0.85)', background:'rgba(129,140,248,0.09)', border:'1px solid rgba(129,140,248,0.18)' }}>
              {t}
            </span>
          ))}
        </div>
      </header>

      {error && <ErrorBox msg={error}/>}

      {/* 닉네임 입력 */}
      <div className="space-y-2">
        <label htmlFor="cm-nickname" className="text-[12px] font-bold uppercase tracking-[0.18em] ml-1 block"
          style={{ color: nicknameReady ? 'rgba(129,140,248,0.9)' : 'rgba(185,174,240,0.9)' }}>
          {nicknameReady ? `✦ ${nickname}님, 반가워요!` : '어떻게 불러드릴까요?'}
        </label>
        <input id="cm-nickname" type="text" placeholder="별명 또는 이름" maxLength={10} value={nickname}
          autoFocus
          onChange={e => { setNickname(e.target.value); vibrate(4); }}
          onKeyDown={e => { if (e.key === 'Enter' && nickname.trim()) { e.target.blur(); vibrate(8); } }}
          className="w-full text-[22px] font-bold text-white outline-none rounded-2xl transition-all"
          style={{ background:'rgba(16,14,36,0.95)', padding:'15px 18px',
            border: nicknameReady ? '1.5px solid rgba(129,140,248,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
            boxShadow: nicknameReady ? '0 0 0 4px rgba(129,140,248,0.08)' : 'none' }}
          onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.7)'}
          onBlur={e => e.target.style.borderColor = nicknameReady ? 'rgba(129,140,248,0.5)' : 'rgba(255,255,255,0.12)'}/>
      </div>

      {/* 생년월일 */}
      <div className="space-y-2" ref={birthRef}>
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] ml-1"
          style={{ color: yearReady ? 'rgba(129,140,248,0.9)' : 'rgba(185,174,240,0.9)' }}>
          {yearReady ? `✦ ${birth.y}년생이시군요` : '언제 태어나셨나요?'}
        </p>
        <BirthInput birthData={birth} setBirthData={setBirth}/>
      </div>

      {/* 제출 버튼 — 준비 여부에 따라 상태 변화 */}
      <div className="pt-2">
        <PrimaryButton onClick={onSubmit} jewel="indigo"
          icon={<Wand2 size={20}/>}
          disabled={!allReady}>
          천문의 문 열기 ✦
        </PrimaryButton>
        {!allReady && (
          <p className="text-center text-[12px] mt-3" style={{ color:'var(--ink-faint)' }}>
            {!nicknameReady ? '이름을 입력하면 시작할 수 있어요' : '출생 연도를 입력하면 시작할 수 있어요'}
          </p>
        )}
      </div>
    </div>
  );
}

/* 허브 모드 카드 — 일일(fortune) 1차 노출과 '더 보기' 2차 그룹에서 재사용 */
function HubModeCard({ k, todayDone, onPick, todayScore }) {
  const m = MODES[k], j = JEWELS[m.jewel];
  const sub = k === 'fortune' && todayDone ? '오늘 확인 완료 · 다시 보기' : m.sub;
  const showScore = k === 'fortune' && todayDone && typeof todayScore === 'number' && !isNaN(todayScore);
  return (
    <button onClick={() => { onPick(k); vibrate(12); }} className="w-full block group active:scale-[0.985] transition-transform">
      <div className="glass rounded-[20px] relative overflow-hidden flex items-center gap-4"
        style={{ padding:'17px 18px', minHeight:82,
          border: k === 'fortune' && !todayDone ? `1px solid ${j.border}` : '1px solid rgba(167,139,250,0.14)',
          boxShadow: k === 'fortune' && !todayDone ? `0 0 24px ${j.glow}` : undefined }}>
        <div className="absolute rounded-full pointer-events-none"
          style={{ left:-14, top:'50%', transform:'translateY(-50%)', width:90, height:90, background:j.glow, filter:'blur(28px)', opacity: k === 'fortune' && !todayDone ? 1 : 0.5 }}/>
        <div className="flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
          style={{ width:48, height:48, borderRadius:15, background:j.soft, border:`1px solid ${j.border}`,
            boxShadow: k === 'fortune' && !todayDone ? `0 4px 22px ${j.glow}` : `0 2px 12px ${j.glow}` }}>
          <span style={{ color:j.main }}>{MODE_ICONS[k]}</span>
        </div>
        <div className="flex-1 min-w-0 text-left relative">
          <div className="flex items-center gap-2.5">
            <p className="text-[17px] font-bold leading-tight" style={{ color:'var(--ink)' }}>{m.title}</p>
            {k === 'fortune' && !todayDone && (
              <span className="relative flex-shrink-0" style={{ width:9, height:9 }}>
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background:j.main, opacity:0.55 }}/>
                <span className="absolute inset-0 rounded-full" style={{ background:j.main, boxShadow:`0 0 6px ${j.main}` }}/>
              </span>
            )}
            {k === 'fortune' && todayDone && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color:`${j.main}`, background:`${j.main}15`, border:`1px solid ${j.main}35` }}>완료</span>
            )}
          </div>
          <p className="text-[13px] mt-1" style={{ color:'var(--ink-dim)' }}>{sub}</p>
        </div>
        {/* 오늘 점수 미리보기 */}
        {showScore && (
          <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ width:54, height:54, background:`${j.main}16`, border:`1.5px solid ${j.main}40` }}>
            <span className="font-black tabular-nums text-[22px] leading-none" style={{ color:j.main }}>{todayScore}</span>
            <span className="text-[9px] font-bold tracking-wide mt-0.5" style={{ color:`${j.main}80` }}>점</span>
          </div>
        )}
        {!showScore && (
          <ChevronRight size={18} className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
            style={{ color: k === 'fortune' && !todayDone ? `${j.main}88` : 'rgba(255,255,255,0.22)' }}/>
        )}
      </div>
    </button>
  );
}

/* ================================================================
   HUB
================================================================ */
/* 허브 보조 세션 타일 — 더보기 그리드에서 아이콘+이름+한 줄 설명 */
const HUB_TILE_DESC = {
  '평생 사주':    '사주팔자 전체 분석',
  '사주 카드':    '나만의 운명 카드',
  '주간 운세':    '이번 주 7일 흐름',
  '궁합':         '두 사람의 기운 맞춤',
  '타로':         '카드로 읽는 지금',
  '학습 나침반':  '공부 집중 방향 안내',
  '다이어리':     '매일의 기운 기록',
  '나만의 리포트':'PDF 심층 분석',
};
function HubTile({ icon, label, color, onClick, index = 0 }) {
  const desc = HUB_TILE_DESC[label] || '';
  return (
    <button onClick={() => { onClick(); vibrate(8); }} className="glass rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform animate-fade-up group" style={{ minHeight:112, padding:'16px 10px', animationDelay:`${index * 55}ms` }}>
      <div className="flex items-center justify-center group-hover:scale-105 transition-transform" style={{ width:44, height:44, borderRadius:13, background:`${color}1f`, border:`1px solid ${color}40` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-[13.5px] font-bold leading-tight text-center" style={{ color:'var(--ink)' }}>{label}</span>
      {desc && <span className="text-[11px] leading-tight text-center" style={{ color:'var(--ink-dim)' }}>{desc}</span>}
    </button>
  );
}

function Hub({ nickname, birth, oh, error, onPick, onEditBirth,
  onCategoryKnow, onCategoryRelate, onCategoryRecord, onFood, onClassics,
  onFont, bigFont, onReset, soundOn, onToggleSound, ambientOn, onToggleAmbient, onShowTerms, onShowPrivacy }) {
  const [showSettings, setShowSettings] = useState(false);
  const line = dailyLine(parseInt(birth.y) || 0);
  const tti = getTti(birth.y);
  const todayDone = hasTodayFortune(birth);
  const todayScore = (() => {
    try { return localStorage.getItem('cm_tk') === todayKey() ? parseInt(localStorage.getItem('cm_ts')) : null; }
    catch { return null; }
  })();
  // 천상의 자아 히어로 — 본인 오행이 화면 전체(배경 오로라까지) 색을 정한다
  const elColor = oh?.color || 'var(--gold)';
  const elName = oh?.name || '토';

  const categories = [
    { id:'know',   label:'운명 풀이',    icon:<Star size={22}/>,   color:'#a78bfa', tags:['평생사주','타로','점성술','자미두수','수비학'], glow:'rgba(167,139,250,0.22)', onClick:onCategoryKnow },
    { id:'relate', label:'맞춤 운세',    icon:<Calendar size={22}/>, color:'#fb7185', tags:['주간','월간','올해','재물운','궁합','학습'], glow:'rgba(251,113,133,0.22)', onClick:onCategoryRelate },
    { id:'record', label:'기록 · 리포트',icon:<Crown size={22}/>,  color:'#C8A876', tags:['다이어리','리포트'], glow:'rgba(200,168,118,0.22)', onClick:onCategoryRecord },
  ];

  return (
    <div className="pt-6 pb-28 space-y-4 animate-fade-up">

      {error && <ErrorBox msg={error}/>}

      {/* ── 천상의 자아 히어로 — 본인 오행을 중심에 둔 몰입형 식별 존 ── */}
      <div className="relative flex flex-col items-center text-center pt-2 pb-1">
        {/* 상단 '수정' 버튼 제거(사용자 요청). 내 정보 수정은 설정 패널에서. */}

        {/* 원소 메달리온 — 오행 심볼 한 점(궤도링·부유 애니메이션 제거: 가독·성능) */}
        <div className="relative flex items-center justify-center" style={{ width:104, height:104, marginTop:8, marginBottom:4 }}>
          {/* 회전하는 오행색 오로라 후광 — 정적 메달리온에 생기 */}
          <div className="absolute rounded-full pointer-events-none" style={{ inset:-9,
            background:`conic-gradient(from 0deg, transparent, ${elColor}44, transparent 42%, ${elColor}26, transparent 72%, ${elColor}44, transparent)`,
            animation:'halo-spin 16s linear infinite' }}/>
          <div className="absolute rounded-full pointer-events-none"
            style={{ width:100, height:100, background:`radial-gradient(circle, ${elColor}33, transparent 70%)`, filter:'blur(13px)' }}/>
          {/* 반짝임 */}
          <span className="absolute rounded-full" style={{ top:7, right:9, width:4, height:4, background:'#fff', boxShadow:`0 0 6px 1px ${elColor}`, animation:'cm-twinkle 3s ease-in-out infinite' }}/>
          <span className="absolute rounded-full" style={{ bottom:11, left:7, width:3, height:3, background:'#fff', boxShadow:`0 0 5px 1px ${elColor}`, animation:'cm-twinkle 4s ease-in-out 1s infinite' }}/>
          <div className="relative flex items-center justify-center rounded-full"
            style={{ width:88, height:88, background:`radial-gradient(circle at 50% 35%, ${elColor}24, rgba(10,14,32,0.55))`,
              border:`1px solid ${elColor}55`, boxShadow:`0 8px 28px ${elColor}2a, inset 0 0 20px ${elColor}1a` }}>
            <OhaengSymbol type={elName} size={58}/>
          </div>
        </div>

        {/* 이름 — 명조(✦ 장식 제거: 사용자 요청) */}
        <h1 className="serif font-black leading-tight" style={{ fontSize:26, color:'var(--ink)' }}>
          {nickname || '사용자'}님
        </h1>

        {/* 생년월일 — 담백하게 (기운 칩 대체: 사용자 요청) */}
        <p className="text-[13px] tabular-nums mt-2" style={{ color:'var(--ink-faint)', letterSpacing:'0.02em' }}>
          {birth.y}.{String(birth.m).padStart(2,'0')}.{String(birth.d).padStart(2,'0')}
        </p>

        {/* 금빛 헤어라인 */}
        <GoldHairline className="mt-3.5 mb-2.5" width="116px"/>

        {/* 오늘의 한 줄 — 시적 인용 */}
        <p className="serif text-[14.5px]" style={{ color:'var(--ink-dim)', lineHeight:1.7, maxWidth:282, letterSpacing:'-0.01em' }}>
          “{line}”
        </p>
      </div>

      {/* ── 균일 카드 리스트 — 오늘의 운세도 다른 항목과 동일 크기 ── */}
      <div className="space-y-2.5">
        {[
          { key:'fortune', color:'#e7b94f', icon:<Sparkles size={20}/>, label:'오늘의 운세',
            sub:'오늘의 기운을 살펴보세요',
            onClick: () => onPick('fortune'), accent:true, done: todayDone },
          { key:'food', color:'#34d399', icon:<Utensils size={20}/>, label:'천문 식탁', sub:'오늘의 오행 밥상 추천', onClick: onFood },
          { key:'classics', color:'#f0b429', icon:<BookOpen size={20}/>, label:'고전 서재', sub:'오늘 새길 고전 한 구절', onClick: onClassics },
          ...categories.map(c => ({ key:c.id, color:c.color, icon:c.icon, label:c.label, tags:c.tags, onClick:c.onClick })),
        ].map((c) => (
          <button key={c.key} onClick={() => { c.onClick(); vibrate(12); playNavigation(); }}
            className="w-full block group active:scale-[0.985] transition-transform">
            <div className={`glass-strong rounded-[20px] relative overflow-hidden text-left ${c.accent ? 'luxe-sheen' : ''}`}
              style={{ border: c.accent ? `1.5px solid ${c.color}55` : `1px solid ${c.color}2e`,
                boxShadow: c.accent ? `0 6px 22px ${c.color}1f` : undefined }}>
              <div className="absolute pointer-events-none" style={{ right:-16, top:-16, width:104, height:104, borderRadius:'50%', background:`${c.color}14`, filter:'blur(26px)' }}/>
              <div className="relative flex items-center gap-3.5 px-4 py-3.5">
                <div className="flex items-center justify-center rounded-full flex-shrink-0 w-11 h-11"
                  style={{ background:`${c.color}18`, border:`1px solid ${c.color}3c` }}>
                  <span style={{ color:c.color }}>{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15.5px] font-bold leading-tight" style={{ color:'var(--ink)' }}>{c.label}</p>
                  {c.tags ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.tags.map((tag, ti) => (
                        <span key={ti} className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md"
                          style={{ color:c.color, background:`${c.color}12` }}>{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{c.sub}</p>
                  )}
                </div>
                {c.done ? (
                  <span className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width:26, height:26, background:'rgba(52,211,153,0.18)', border:'1.5px solid rgba(52,211,153,0.55)' }}>
                    <span style={{ color:'#34d399', fontSize:15, fontWeight:900, lineHeight:1 }}>✓</span>
                  </span>
                ) : (
                  <ChevronRight size={17} style={{ color:`${c.color}66`, flexShrink:0 }} className="group-hover:translate-x-0.5 transition-transform"/>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── 최근 운의 흐름 — 점수 기록이 쌓이면 그래프로 ── */}
      <ScoreHistoryChart/>

      {/* ── 설정 — 접힌 상태가 기본 ── */}
      <div>
        <button onClick={() => { setShowSettings(v => !v); playTap(); vibrate(6); }}
          className="w-full flex items-center justify-between rounded-2xl active:scale-[0.99] transition-all"
          style={{ minHeight:46, padding:'0 14px',
            background: showSettings ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-[12px] font-bold" style={{ color:'var(--ink-faint)' }}>설정</span>
          <ChevronDown size={14} style={{ color:'var(--ink-faint)', transform: showSettings ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
        </button>

        {showSettings && (
          <div className="mt-2 glass rounded-2xl p-3 space-y-2 animate-fade-up">
            {/* 내 정보 수정 — 상단 버튼 대신 설정으로 이동 */}
            <button onClick={onEditBirth}
              className="w-full flex items-center gap-2 rounded-xl active:scale-95 transition-all"
              style={{ minHeight:44, padding:'0 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)' }}>
              <Pencil size={15} style={{ color:'var(--ink-dim)' }}/>
              <span className="text-[12.5px] font-semibold" style={{ color:'var(--ink-dim)' }}>내 정보 수정</span>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onFont}
                className="flex items-center gap-2 rounded-xl active:scale-95 transition-all flex-1"
                style={{ minHeight:44, padding:'0 14px',
                  background: bigFont ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
                  border:`1px solid ${bigFont ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.09)'}` }}>
                <span style={{ fontSize:16, color: bigFont ? '#38bdf8' : 'var(--ink-dim)' }}>가</span>
                <span className="text-[12px] font-semibold" style={{ color: bigFont ? '#38bdf8' : 'var(--ink-dim)' }}>글자 확대 {bigFont ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={onToggleSound}
                className="flex items-center gap-2 rounded-xl active:scale-95 transition-all flex-1"
                style={{ minHeight:44, padding:'0 14px',
                  background: soundOn ? 'rgba(231,185,79,0.08)' : 'rgba(255,255,255,0.04)',
                  border:`1px solid ${soundOn ? 'rgba(231,185,79,0.25)' : 'rgba(255,255,255,0.09)'}` }}>
                {soundOn ? <Volume2 size={16} style={{ color:'var(--gold)' }}/> : <VolumeX size={16} style={{ color:'var(--ink-faint)' }}/>}
                <span className="text-[12px] font-semibold" style={{ color: soundOn ? 'var(--gold)' : 'var(--ink-dim)' }}>효과음 {soundOn ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            {/* 배경음 — 천문 우주 드론 (효과음과 독립 토글) */}
            <button onClick={onToggleAmbient}
              className="w-full flex items-center justify-between rounded-xl active:scale-[0.99] transition-all"
              style={{ minHeight:44, padding:'0 14px',
                background: ambientOn ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${ambientOn ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.09)'}` }}>
              <span className="flex items-center gap-2">
                <Music size={15} style={{ color: ambientOn ? '#c4b5fd' : 'var(--ink-faint)' }}/>
                <span className="text-[12.5px] font-semibold" style={{ color: ambientOn ? '#c4b5fd' : 'var(--ink-dim)' }}>배경 음악</span>
              </span>
              <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: ambientOn ? '#c4b5fd' : 'var(--ink-faint)',
                  background: ambientOn ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.05)' }}>
                {ambientOn ? 'ON' : 'OFF'}
              </span>
            </button>
            <button onClick={onReset}
              className="w-full flex items-center justify-center gap-2 rounded-xl active:scale-95 transition-all"
              style={{ minHeight:40, color:'rgba(251,113,133,0.7)', background:'rgba(251,113,133,0.05)', border:'1px solid rgba(251,113,133,0.14)', fontSize:13, fontWeight:600 }}>
              <Trash2 size={14}/> 전체 초기화 · 모든 기록 삭제
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-[12px] pb-1" style={{ color:'rgba(255,255,255,0.42)', lineHeight:1.9 }}>
        <button className="underline underline-offset-2 active:opacity-60 transition-opacity" style={{ color:'rgba(255,255,255,0.6)', fontSize:12.5 }}
          onClick={() => { vibrate(6); onShowTerms?.(); }}>이용약관</button>
        {' · '}
        <button className="underline underline-offset-2 active:opacity-60 transition-opacity" style={{ color:'rgba(255,255,255,0.6)', fontSize:12.5 }}
          onClick={() => { vibrate(6); onShowPrivacy?.(); }}>개인정보처리방침</button>
      </p>
    </div>
  );
}
const HubMini = ({ children, onClick, danger }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-[12px] rounded-xl transition-all active:scale-95"
    style={{ minHeight:44, padding:'9px 13px', color:danger ? 'rgba(251,113,133,0.7)' : 'var(--ink-dim)',
      background: danger ? 'rgba(251,113,133,0.05)' : 'rgba(255,255,255,0.02)',
      border:`1px solid ${danger ? 'rgba(251,113,133,0.14)' : 'rgba(255,255,255,0.06)'}` }}>
    {children}
  </button>
);

/* ================================================================
   나의 운세 다이어리
================================================================ */
function Diary({ nickname, birth, onBack, onManage }) {
  const tkey = isoDate();
  const [diary, setDiary] = useState(() => getDiary());
  const todayEntry = diary[tkey] || {};
  const [mood, setMood] = useState(todayEntry.mood ?? null);
  const [note, setNote] = useState(todayEntry.note ?? '');
  const [justSaved, setJustSaved] = useState(false);
  const line = dailyLine(parseInt(birth.y) || 0);

  // 오늘 운세 점수(있으면 함께 기록)
  const todayScore = (() => {
    try { return localStorage.getItem('cm_tk') === todayKey() ? parseInt(localStorage.getItem('cm_ts')) : null; } catch { return null; }
  })();

  const canSave = mood !== null || note.trim();
  const save = () => {
    if (!canSave) return;
    const entry = { mood, note: note.trim() };
    if (todayScore) entry.score = todayScore;
    setDiary(setDiaryEntry(tkey, entry));
    setJustSaved(true); vibrate([24, 44, 64]); playSuccess();
    setTimeout(() => setJustSaved(false), 1800);
  };

  // 지난 기록 (오늘 제외, 최신순)
  const past = Object.entries(diary)
    .filter(([d]) => d !== tkey)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14);
  const recordedDays = Object.keys(diary).length;
  const fmtDate = (iso) => { const [, m, d] = iso.split('-'); return `${parseInt(m)}월 ${parseInt(d)}일`; };

  return (
    <div className="py-10 space-y-6 pb-20 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>
      {/* 다이어리 헤더 — 달빛 메달리온 + 명조 타이틀 */}
      <header className="flex flex-col items-center text-center gap-2.5">
        <div className="relative flex items-center justify-center" style={{ width:62, height:62 }}>
          <div className="absolute rounded-full pointer-events-none" style={{ width:62, height:62, background:'radial-gradient(circle, rgba(56,189,248,0.34), transparent 70%)', filter:'blur(11px)' }}/>
          <div className="relative flex items-center justify-center rounded-full"
            style={{ width:52, height:52, background:'radial-gradient(circle at 50% 35%, rgba(56,189,248,0.22), rgba(10,14,32,0.5))',
              border:'1px solid rgba(56,189,248,0.45)', boxShadow:'0 6px 22px rgba(56,189,248,0.24), inset 0 0 16px rgba(56,189,248,0.14)' }}>
            <Calendar size={23} style={{ color:JEWELS.sky.main }}/>
          </div>
        </div>
        <h2 className="serif text-[24px] font-bold text-white leading-tight">나의 운세 다이어리</h2>
        <p className="text-[12.5px]" style={{ color:'var(--ink-dim)' }}>
          {nickname || '나'}님과 함께한 <span style={{ color:JEWELS.sky.main, fontWeight:700 }}>{recordedDays}일</span>의 기록
        </p>
      </header>

      {/* 오늘의 한 문장 — 금빛 인용 카드 */}
      <GlassCard className="px-6 py-7 text-center relative overflow-hidden" jewel="violet">
        <span className="serif absolute pointer-events-none select-none" style={{ top:2, left:16, fontSize:62, lineHeight:1, color:'rgba(167,139,250,0.20)' }}>“</span>
        <Eyebrow className="text-center relative" color="#a78bfa">오늘의 한 문장</Eyebrow>
        <p className="serif relative" style={{ marginTop:14, fontSize:18.5, color:'var(--ink)', lineHeight:1.75, letterSpacing:'-0.01em' }}>{line}</p>
        <GoldHairline width="60px" className="mt-4"/>
      </GlassCard>

      {/* 오늘 기록 */}
      <GlassCard className="p-6" jewel="sky">
        <h3 className="text-[16px] font-bold text-white mb-4">오늘 하루, 어땠나요?</h3>
        <div className="flex justify-between gap-2 mb-5">
          {MOODS.map((mo, i) => {
            const on = mood === i;
            return (
              <button key={i} onClick={() => { setMood(i); vibrate(8); }}
                className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl transition-all active:scale-95"
                style={{ paddingTop:12, paddingBottom:11,
                  background:on ? `${mo.c}26` : 'rgba(255,255,255,0.03)',
                  border:`1px solid ${on ? mo.c + '7a' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow:on ? `0 6px 18px ${mo.c}33, inset 0 0 16px ${mo.c}1a` : 'none',
                  transform:on ? 'translateY(-2px)' : 'none' }}>
                <span style={{ fontSize:on ? 30 : 26, filter:on ? 'none' : 'grayscale(0.45) opacity(0.78)', transition:'all .18s ease' }}>{mo.e}</span>
                <span className="text-[10.5px]" style={{ color:on ? mo.c : 'var(--ink-faint)', fontWeight:on ? 800 : 500 }}>{mo.l}</span>
              </button>
            );
          })}
        </div>
        <textarea aria-label="오늘의 일기 메모" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500}
          placeholder="오늘의 한 줄 일기를 남겨보세요. 마음 가는 대로 적어도 좋아요."
          className="w-full text-[15px] outline-none resize-none"
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:16, padding:'14px 16px', color:'var(--ink)', lineHeight:1.7 }}/>
        <button onClick={save}
          className="w-full mt-3 text-[15px] font-bold transition-all active:scale-[0.97]"
          style={{ minHeight:56, borderRadius:16, cursor: canSave ? 'pointer' : 'default',
            color: justSaved ? '#fff' : canSave ? '#fff' : 'rgba(255,255,255,0.38)',
            background: justSaved
              ? 'linear-gradient(135deg, #34d399, #10b981)'
              : canSave
              ? 'linear-gradient(135deg,#38bdf8,#818cf8)'
              : 'rgba(255,255,255,0.06)',
            border: canSave ? 'none' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: justSaved
              ? '0 8px 28px rgba(52,211,153,0.35)'
              : canSave ? '0 8px 26px rgba(56,189,248,0.25)' : 'none',
          }}>
          {justSaved
            ? <span className="flex items-center justify-center gap-2">
                <span style={{ fontSize: 18 }}>✓</span> 저장됐어요
              </span>
            : !canSave
            ? <span style={{ opacity: 0.6 }}>기분을 고르거나 한 줄을 적어주세요</span>
            : (todayEntry.mood != null || todayEntry.note ? '수정하기' : '오늘 기록 저장')}
        </button>
      </GlassCard>

      {/* 운의 흐름 */}
      <ScoreHistoryChart/>

      {/* 일기 허브 진입 (전체 기록 관리) */}
      {recordedDays > 0 && (
        <button onClick={onManage} className="w-full glass rounded-2xl flex items-center justify-between p-4 active:scale-[0.99] transition-transform">
          <span className="flex items-center gap-2.5 text-[14px] font-bold text-white">
            <Calendar size={17} style={{ color:JEWELS.sky.main }}/> 기록 전체 관리
          </span>
          <span className="flex items-center gap-1 text-[12px]" style={{ color:'var(--ink-dim)' }}>
            {recordedDays}개 · 수정·삭제 <ChevronRight size={15}/>
          </span>
        </button>
      )}

      {/* 지난 기록 (최근 미리보기) */}
      {past.length > 0 && (
        <div className="space-y-2.5">
          <Eyebrow className="ml-1">지난 기록</Eyebrow>
          {past.map(([d, e]) => {
            const mc = e.mood != null ? MOODS[e.mood] : null;
            return (
            <div key={d} className="glass rounded-2xl flex items-start gap-3.5 p-4"
              style={{ borderLeft:`3px solid ${mc ? mc.c + '66' : 'rgba(255,255,255,0.08)'}` }}>
              <span style={{ fontSize:22, lineHeight:1.2 }}>{mc ? mc.e : '🌙'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold" style={{ color:'var(--ink-dim)' }}>{fmtDate(d)}</p>
                  {mc && <span className="text-[11px] font-bold" style={{ color:mc.c }}>{mc.l}</span>}
                </div>
                {e.note && <ExpandableText text={e.note} lines={2} className="text-[14px] mt-0.5" style={{ color:'var(--ink-dim)', lineHeight:1.6 }} accent={JEWELS.sky.main}/>}
              </div>
              {e.score && <span className="text-[12px] font-bold tabular-nums px-2.5 py-1 rounded-full flex-shrink-0" style={{ color:'#a78bfa', background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)' }}>{e.score}</span>}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   일기 허브 — 전체 기록 조회 · 수정 · 삭제 (CRUD 관리 대시보드)
   데이터 소스: localStorage 'cm_diary' (diary.js). 모든 변경은
   diary.js의 set/delete 헬퍼를 거쳐 저장 후, 반환된 전체 맵을
   새 참조로 상태에 반영해 즉시 UI에 나타나게 한다.
================================================================ */
const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const fmtFullDate = (iso) => {
  // 'YYYY-MM-DD' → 'YYYY년 M월 D일 (요일)'. 형식이 어긋나면 원본 그대로 반환(방어).
  const parts = String(iso).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return String(iso);
  const [y, m, d] = parts;
  const wd = WEEKDAYS_KO[new Date(y, m - 1, d).getDay()] ?? '';
  return `${y}년 ${m}월 ${d}일 (${wd})`;
};

function DiaryHub({ nickname, onBack }) {
  const [diary, setDiary] = useState(() => getDiary());
  const [editKey, setEditKey] = useState(null);
  const [editMood, setEditMood] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const entries = Object.entries(diary).sort((a, b) => b[0].localeCompare(a[0]));
  const total = entries.length;

  // 월별 그룹핑
  const grouped = entries.reduce((acc, [key, e]) => {
    const [y, m] = key.split('-');
    const label = `${y}년 ${parseInt(m)}월`;
    if (!acc[label]) acc[label] = [];
    acc[label].push([key, e]);
    return acc;
  }, {});
  const monthKeys = Object.keys(grouped);

  const toggleMonth = (label) => {
    setCollapsedMonths(prev => ({ ...prev, [label]: !prev[label] }));
    vibrate(6);
  };

  // 무드 통계
  const moodCounts = entries.reduce((acc, [, e]) => {
    if (e.mood != null) acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});
  const topMoodIdx = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const beginEdit = (key, e) => { setEditKey(key); setEditMood(e.mood ?? null); setEditNote(e.note ?? ''); vibrate(8); };
  const cancelEdit = () => setEditKey(null);
  const canSaveEdit = editMood !== null || editNote.trim().length > 0;
  const commitEdit = (key) => {
    if (!canSaveEdit) return;
    const updated = setDiaryEntry(key, { mood: editMood, note: editNote.trim() });
    setDiary({ ...updated });
    setEditKey(null); vibrate([20, 44]); playSuccess();
  };

  const remove = (key) => { if (diary[key]) { setPendingDelete(key); vibrate(10); } };
  const confirmDelete = () => {
    const key = pendingDelete;
    if (!key || !diary[key]) { setPendingDelete(null); return; }
    const updated = deleteDiaryEntry(key);
    setDiary({ ...updated });
    if (editKey === key) setEditKey(null);
    setPendingDelete(null); vibrate(30);
  };

  return (
    <div className="py-10 pb-24 animate-fade-up space-y-5">
      <BackBar onBack={onBack} label="뒤로가기"/>

      <header className="space-y-2">
        <h2 className="serif text-[26px] font-bold text-white">{nickname || '나'}님의 다이어리</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px]" style={{ color:'var(--ink-dim)' }}>
            총 <span style={{ color:'rgba(56,189,248,0.9)', fontWeight:700 }}>{total}일</span> 기록
          </span>
          {topMoodIdx != null && MOODS[topMoodIdx] && (
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: MOODS[topMoodIdx].c, background:`${MOODS[topMoodIdx].c}14`, border:`1px solid ${MOODS[topMoodIdx].c}30` }}>
              자주 느낀 감정 {MOODS[topMoodIdx].e} {MOODS[topMoodIdx].l}
            </span>
          )}
        </div>
      </header>

      {total === 0 ? (
        <GlassCard className="p-10 text-center" jewel="sky">
          <div className="text-[48px] mb-4">🌙</div>
          <p className="text-[16px] font-bold text-white mb-2">아직 기록이 없어요</p>
          <p className="text-[13.5px] mb-6" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>
            오늘의 기분과 한 줄 일기를 남기면<br/>여기서 모두 볼 수 있어요
          </p>
          <button onClick={onBack}
            className="text-[14px] font-bold rounded-2xl active:scale-95 transition-transform"
            style={{ minHeight:50, padding:'0 28px', color:'#fff', background:'linear-gradient(135deg,#38bdf8,#818cf8)',
              boxShadow:'0 8px 24px rgba(56,189,248,0.3)' }}>
            ✦ 오늘 기록하기
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {monthKeys.map((monthLabel) => {
            const monthEntries = grouped[monthLabel];
            const isCollapsed = collapsedMonths[monthLabel];
            const monthMoodCounts = monthEntries.reduce((acc, [, e]) => {
              if (e.mood != null) acc[e.mood] = (acc[e.mood] || 0) + 1;
              return acc;
            }, {});
            const topMonthMood = Object.entries(monthMoodCounts).sort((a, b) => b[1] - a[1])[0];

            return (
              <div key={monthLabel} className="space-y-2">
                {/* 월 헤더 */}
                <button onClick={() => toggleMonth(monthLabel)}
                  className="w-full flex items-center justify-between px-1 active:scale-[0.99] transition-transform"
                  style={{ minHeight: 40 }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold text-white">{monthLabel}</span>
                    <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color:'rgba(56,189,248,0.8)', background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)' }}>
                      {monthEntries.length}일
                    </span>
                    {topMonthMood && MOODS[topMonthMood[0]] && (
                      <span style={{ fontSize:14 }}>{MOODS[topMonthMood[0]].e}</span>
                    )}
                  </div>
                  <ChevronDown size={16} style={{ color:'var(--ink-faint)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition:'transform 0.2s ease' }}/>
                </button>

                {/* 해당 월 항목들 */}
                {!isCollapsed && (
                  <div className="space-y-2.5 animate-fade-up">
                    {monthEntries.map(([key, e]) => {
                      const editing = editKey === key;
                      const mc = e.mood != null ? MOODS[e.mood] : null;
                      const parts = key.split('-').map(Number);
                      const dayLabel = parts.length === 3
                        ? `${parts[2]}일 (${WEEKDAYS_KO[new Date(parts[0], parts[1]-1, parts[2]).getDay()]})`
                        : key;

                      if (editing) {
                        return (
                          <GlassCard key={key} className="p-5" jewel="sky">
                            <p className="text-[12px] font-bold mb-3.5" style={{ color:'rgba(56,189,248,0.95)' }}>{fmtFullDate(key)} · 수정</p>
                            <div className="flex justify-between gap-1.5 mb-4">
                              {MOODS.map((mo, i) => {
                                const on = editMood === i;
                                return (
                                  <button key={i} onClick={() => setEditMood(on ? null : i)}
                                    className="flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 transition-all active:scale-95"
                                    style={{ background:on ? `${mo.c}1f` : 'rgba(255,255,255,0.03)', border:`1px solid ${on ? mo.c + '66' : 'rgba(255,255,255,0.06)'}` }}>
                                    <span style={{ fontSize:20, filter:on ? 'none' : 'grayscale(0.5)', opacity:on ? 1 : 0.7 }}>{mo.e}</span>
                                    <span className="text-[10px]" style={{ color:on ? mo.c : 'var(--ink-faint)', fontWeight:on ? 700 : 400 }}>{mo.l}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <textarea aria-label="일기 내용 수정" value={editNote} onChange={ev => setEditNote(ev.target.value)} rows={4} maxLength={500}
                              placeholder="이 날의 한 줄을 적어보세요."
                              className="w-full text-[15px] outline-none resize-none"
                              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:14, padding:'13px 15px', color:'var(--ink)', lineHeight:1.7 }}/>
                            <div className="flex gap-2 mt-3">
                              <button onClick={cancelEdit} className="flex-1 text-[14px] font-bold rounded-2xl" style={{ minHeight:48, color:'var(--ink-dim)', border:'1px solid rgba(255,255,255,0.14)' }}>취소</button>
                              <button onClick={() => commitEdit(key)} disabled={!canSaveEdit}
                                className="flex-1 text-[14px] font-bold rounded-2xl transition-all active:scale-[0.98]"
                                style={{ minHeight:48, color:canSaveEdit ? '#fff' : 'var(--ink-faint)',
                                  background:canSaveEdit ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.05)' }}>
                                저장
                              </button>
                            </div>
                          </GlassCard>
                        );
                      }

                      return (
                        <div key={key} className="glass rounded-2xl p-4"
                          style={{ borderLeft: mc ? `3px solid ${mc.c}60` : '3px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-start gap-3">
                            <span style={{ fontSize:22, lineHeight:1.2, flexShrink:0 }}>{mc ? mc.e : '🌙'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-[13px] font-bold" style={{ color:'var(--ink)' }}>{dayLabel}</p>
                                {mc && <span className="text-[11px] font-bold" style={{ color:mc.c }}>{mc.l}</span>}
                                {e.score && (
                                  <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                                    style={{ color:'#a78bfa', background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)' }}>
                                    {e.score}점
                                  </span>
                                )}
                              </div>
                              {e.note
                                ? <ExpandableText text={e.note} className="text-[13.5px]" style={{ color:'var(--ink-dim)', lineHeight:1.65 }} accent={JEWELS.sky.main}/>
                                : <p className="text-[12.5px]" style={{ color:'var(--ink-faint)' }}>메모 없음</p>}
                            </div>
                            <div className="flex-shrink-0 flex flex-col gap-1.5 ml-1">
                              <button onClick={() => beginEdit(key, e)}
                                className="text-[11px] font-bold rounded-lg active:scale-95 transition-transform"
                                style={{ minHeight:32, padding:'0 10px', color:'var(--ink-dim)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)' }}>
                                수정
                              </button>
                              <button onClick={() => remove(key)} aria-label="삭제"
                                className="text-[11px] font-bold rounded-lg active:scale-95 transition-transform"
                                style={{ minHeight:32, padding:'0 10px', color:'rgba(251,113,133,0.75)', background:'rgba(251,113,133,0.05)', border:'1px solid rgba(251,113,133,0.15)' }}>
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!pendingDelete} danger
        title="이 기록을 삭제할까요?"
        message={pendingDelete ? `${fmtFullDate(pendingDelete)}\n삭제하면 되돌릴 수 없어요.` : ''}
        confirmLabel="삭제" cancelLabel="취소"
        onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)}/>
    </div>
  );
}

/* ================================================================
   GUNGHAP FORM
================================================================ */
function GunghapForm({ nickname, birth, ilju, birth2, setBirth2, nickname2, setNickname2, error, onBack, onSubmit }) {
  return (
    <div className="py-10 space-y-7 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <header className="space-y-3">
        <div className="w-14 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#fb7185,#f0b429)' }}/>
        <h2 className="serif font-bold text-white leading-snug" style={{ fontSize:'clamp(1.6rem,7vw,2.2rem)', whiteSpace:'pre-line' }}>{'상대방의 정보를\n알려주세요'}</h2>
      </header>
      {error && <ErrorBox msg={error}/>}
      {/* 내 정보 표시 카드 */}
      <div className="glass rounded-2xl flex items-center gap-3.5 p-4"
        style={{ border:`1px solid ${JEWELS.indigo.border}`, boxShadow:`0 4px 20px ${JEWELS.indigo.glow}` }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ width:44, height:44, borderRadius:14, background:JEWELS.indigo.soft, border:`1px solid ${JEWELS.indigo.border}` }}>
          <Fingerprint size={20} style={{ color:JEWELS.indigo.main }}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-semibold" style={{ color:'var(--ink-faint)' }}>나의 정보</p>
          <p className="text-[15px] font-bold text-white leading-tight">{nickname || '나'}</p>
          <p className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{birth.y}년 {parseInt(birth.m)}월 {parseInt(birth.d)}일 · <span style={{ color:JEWELS.indigo.main }}>{ilju}</span></p>
        </div>
      </div>
      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background:'linear-gradient(to right, transparent, rgba(251,113,133,0.25))' }}/>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)' }}>
          <Heart size={13} style={{ color:'rgba(251,113,133,0.7)' }}/>
          <span className="text-[11px] font-bold" style={{ color:'rgba(251,113,133,0.65)' }}>상대방 정보</span>
        </div>
        <div className="flex-1 h-px" style={{ background:'linear-gradient(to left, transparent, rgba(251,113,133,0.25))' }}/>
      </div>
      <div className="space-y-2">
        <label htmlFor="cm-nick2" className="text-[12px] font-bold uppercase tracking-[0.18em] ml-1 block" style={{ color:'rgba(251,113,133,0.9)' }}>상대방 이름 (선택)</label>
        <input id="cm-nick2" type="text" placeholder="상대방 별명 또는 이름" maxLength={10} value={nickname2}
          onChange={e => setNickname2(e.target.value)}
          className="w-full text-[18px] font-bold text-white outline-none rounded-2xl transition-colors"
          style={{ background:'rgba(20,24,46,0.9)', border:'1.5px solid rgba(251,113,133,0.2)', padding:'13px 18px' }}
          onFocus={e => e.target.style.borderColor = 'rgba(251,113,133,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(251,113,133,0.2)'}/>
      </div>
      <BirthInput birthData={birth2} setBirthData={setBirth2} label="상대방 생년월일"/>
      <PrimaryButton onClick={onSubmit} jewel="rose" icon={<Heart size={19}/>}>궁합 보기</PrimaryButton>
    </div>
  );
}

/* ================================================================
   TAROT DRAW
================================================================ */
function TarotDraw({ onBack, onPrefetch, onReveal }) {
  const [phase, setPhase] = useState('idle'); // idle | shuffling | spread | picking | flip
  const [selected, setSelected] = useState(null); // 0|1|2
  const [shuffleCount, setShuffleCount] = useState(0);

  // 카드 3장 위치 (펼쳐진 상태)
  const SPREAD = [
    { rotate: -22, x: -80, y: 10 },
    { rotate: 0,   x: 0,   y: -18 },
    { rotate: 22,  x: 80,  y: 10 },
  ];

  const handleShuffle = () => {
    if (phase !== 'idle' && phase !== 'spread') return;
    setPhase('shuffling');
    playClick(); vibrate([10, 20, 10]);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setShuffleCount(c => c + 1);
      if (count >= 5) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('spread');
          // 카드가 펼쳐지는 순간 백그라운드로 분석을 미리 시작 → 뽑을 때 대기 없음
          onPrefetch?.();
        }, 120);
      }
    }, 110);
  };

  const handlePick = (idx) => {
    if (phase !== 'spread') return;
    setSelected(idx);
    setPhase('flip');
    playReveal(); vibrate([20, 40, 0, 30, 60]);
    // 카드 뒤집기 애니메이션(약 1.1초) 동안 prefetch가 완료됨 → 끝나면 결과로 전환
    setTimeout(() => { onReveal?.(); }, 1100);
  };

  // 카드 뒷면 공용 컴포넌트
  const CardBack = ({ style = {}, glowIntensity = 1 }) => (
    <div className="rounded-[24px] flex flex-col items-center justify-center card-glint overflow-hidden"
      style={{
        // card-glint(position:relative)가 Tailwind absolute를 덮어쓰므로 인라인으로 강제
        position:'absolute', top:0, right:0, bottom:0, left:0,
        background:'linear-gradient(160deg,#130e3a 0%,#1a1450 45%,#0e0b28 100%)',
        border:'1.5px solid rgba(167,139,250,0.45)',
        boxShadow:`0 20px 60px rgba(99,102,241,${0.3 * glowIntensity}), inset 0 0 0 1px rgba(255,255,255,0.04)`,
        ...style,
      }}>
      {[[18,14],[82,10],[46,28],[12,72],[88,65],[36,86]].map(([x,y],i) => (
        <span key={i} className="absolute rounded-full"
          style={{ left:`${x}%`,top:`${y}%`,width:i%2?3:2,height:i%2?3:2,
            background:i%3===0?'rgba(167,139,250,0.9)':'#fff',
            opacity:0.25+i*0.06, animation:`cm-twinkle ${3+i*0.5}s ease-in-out ${i*0.4}s infinite` }}/>
      ))}
      <div className="absolute inset-3 rounded-[18px]" style={{ border:'1px solid rgba(167,139,250,0.12)' }}/>
      <div className="flex items-center gap-2 absolute top-5">
        {[0,1,2].map(i=><span key={i} style={{ fontSize:i===1?14:9, color:i===1?'rgba(231,185,79,0.85)':'rgba(167,139,250,0.45)' }}>✦</span>)}
      </div>
      <div className="relative" style={{ width:72,height:72 }}>
        <div className="absolute inset-0 rounded-full" style={{ background:'radial-gradient(circle,rgba(52,211,153,0.28) 0%,rgba(167,139,250,0.18) 55%,transparent 75%)', animation:'glow-pulse 2.8s ease-in-out infinite' }}/>
        <Sparkles size={32} style={{ color:'rgba(167,139,250,0.9)', position:'relative', top:20, left:20, filter:'drop-shadow(0 0 10px rgba(167,139,250,0.5))' }}/>
      </div>
      <span className="serif" style={{ fontSize:36, color:'rgba(255,255,255,0.85)', textShadow:'0 0 30px rgba(167,139,250,0.6)', marginTop:8 }}>✦</span>
    </div>
  );

  return (
    <div className="screen-vh flex flex-col overflow-hidden"
      style={{ background:'radial-gradient(ellipse 140% 70% at 50% -5%, rgba(88,80,210,0.22) 0%, transparent 58%)' }}>

      <div className="px-5 flex-shrink-0" style={{ paddingTop: 'max(2rem, calc(env(safe-area-inset-top) + 0.75rem))' }}>
        <BackBar onBack={onBack} label="뒤로가기"/>
      </div>

      {/* 헤더 */}
      <div className="flex-shrink-0 text-center px-6 pt-3 pb-1 animate-fade-up">
        <p className="text-[10px] font-bold tracking-[0.5em]" style={{ color:'rgba(167,139,250,0.6)' }}>T A R O T</p>
        <h2 className="serif text-[22px] font-black text-white mt-1.5" style={{ letterSpacing:'-0.01em' }}>
          {phase === 'idle' ? '카드를 섞어주세요' : phase === 'shuffling' ? '카드가 섞이고 있어요…' : '하나를 선택하세요'}
        </h2>
        <p className="text-[12px] mt-1" style={{ color:'rgba(255,255,255,0.28)', letterSpacing:'0.04em' }}>
          {phase === 'idle' ? '버튼을 눌러 카드를 섞으세요' : phase === 'spread' ? '세 장 중 하나가 당신을 기다려요' : ''}
        </p>
      </div>

      {/* 카드 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8"
        style={{ perspective: 1200 }}>

        {/* 카드 더미 / 펼쳐진 3장 — 자식이 전부 absolute라 flex-shrink로 눌리지 않게 고정 */}
        <div className="relative flex-shrink-0" style={{ width:240, height:340 }}>
          {[0,1,2].map(idx => {
            const spread = SPREAD[idx];
            const isSpread = phase === 'spread' || phase === 'picking' || phase === 'flip';
            const isPicked = selected === idx && (phase === 'picking' || phase === 'flip');
            const isOther = selected !== null && selected !== idx && (phase === 'picking' || phase === 'flip');

            // 셔플 중 랜덤 흔들림
            const shuffleOff = phase === 'shuffling'
              ? { x: (Math.sin(shuffleCount * 2.1 + idx * 1.3) * 18), y: (Math.cos(shuffleCount * 1.7 + idx) * 10), r: Math.sin(shuffleCount * 3 + idx * 2) * 12 }
              : { x:0, y:0, r:0 };

            return (
              <button key={idx}
                onClick={() => handlePick(idx)}
                disabled={phase !== 'spread'}
                style={{
                  position:'absolute', inset:0,
                  width:'100%', height:'100%',
                  transformStyle:'preserve-3d',
                  transform: isSpread
                    ? isPicked
                      ? `translateX(${spread.x}px) translateY(${spread.y - 28}px) rotate(${spread.rotate}deg) scale(1.07)`
                      : isOther
                        ? `translateX(${spread.x}px) translateY(${spread.y + 12}px) rotate(${spread.rotate}deg) scale(0.92) opacity(0.5)`
                        : `translateX(${spread.x}px) translateY(${spread.y}px) rotate(${spread.rotate}deg)`
                    : `translateX(${shuffleOff.x + (idx-1)*2}px) translateY(${shuffleOff.y + idx*(-2)}px) rotate(${shuffleOff.r + (idx-1)*2}deg)`,
                  transition: phase === 'shuffling' ? 'transform 0.08s ease' : 'transform 0.4s cubic-bezier(.16,.84,.44,1)',
                  cursor: phase === 'spread' ? 'pointer' : 'default',
                  zIndex: isSpread ? (isPicked ? 10 : 3-idx) : (2-idx),
                }}>
                <CardBack glowIntensity={isPicked ? 1.4 : isOther ? 0.4 : 1}
                  style={{ opacity: isOther ? 0.55 : 1 }}/>
                {/* 선택 하이라이트 */}
                {isPicked && (
                  <div className="absolute inset-0 rounded-[24px] pointer-events-none animate-fade-in"
                    style={{ boxShadow:'0 0 0 2.5px rgba(231,185,79,0.8), 0 0 40px rgba(231,185,79,0.4)' }}/>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA 버튼 */}
        <div className="mt-10 w-full max-w-xs">
          {phase === 'idle' && (
            <button onClick={handleShuffle}
              className="w-full font-bold text-[16px] rounded-2xl text-white transition-all active:scale-[0.97] btn-shine animate-fade-up"
              style={{ minHeight:54, background:'linear-gradient(135deg,#6366f1,#a78bfa)', boxShadow:'0 12px 32px rgba(99,102,241,0.4)', letterSpacing:'0.02em' }}>
              ✦ 카드 섞기
            </button>
          )}
          {phase === 'spread' && (
            <p className="text-center text-[12px] animate-fade-up" style={{ color:'rgba(167,139,250,0.6)', letterSpacing:'0.08em' }}>
              ↑ 직감에 따라 하나를 고르세요
            </p>
          )}
          {(phase === 'picking' || phase === 'flip') && (
            <p className="text-center text-[13px] animate-fade-up" style={{ color:'rgba(231,185,79,0.8)', letterSpacing:'0.06em' }}>
              카드가 열리고 있어요…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ANALYZING
================================================================ */
function Analyzing({ progress, loadStep, onCancel }) {
  return (
    <div className="screen-vh flex flex-col items-center justify-center gap-10 animate-fade-in px-6">
      {/* 원형 진행 링 */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
        {/* 외부 궤도 */}
        <div className="absolute inset-0 rounded-full" style={{ border:'1px solid rgba(255,255,255,0.06)', animation:'orbit 16s linear infinite' }}>
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background:'#818cf8', boxShadow:'0 0 16px 4px rgba(129,140,248,0.6)' }}/>
        </div>
        <div className="absolute inset-8 rounded-full" style={{ border:'1px solid rgba(255,255,255,0.04)', animation:'orbit 24s linear infinite reverse' }}>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ background:'rgba(167,139,250,0.7)', boxShadow:'0 0 10px 3px rgba(167,139,250,0.4)' }}/>
        </div>
        {/* SVG 링 */}
        <svg viewBox="0 0 200 200" style={{ width: 200, height: 200, position:'absolute' }} className="-rotate-90">
          <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
          <circle cx="100" cy="100" r="82" fill="none" stroke="url(#loadGrad)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 82}
            strokeDashoffset={2 * Math.PI * 82 * (1 - progress / 100)}
            style={{ transition:'stroke-dashoffset .4s ease', filter:'drop-shadow(0 0 6px rgba(129,140,248,0.7))' }}/>
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
          </defs>
        </svg>
        {/* 숫자 */}
        <div className="flex flex-col items-center relative z-10">
          <span className="font-black tabular-nums leading-none" style={{ fontSize: 62, color:'#fff', textShadow:'0 0 30px rgba(129,140,248,0.5)' }}>{progress}</span>
          <span className="text-[10px] font-bold tracking-[0.35em] mt-1" style={{ color:'rgba(255,255,255,0.22)' }}>%</span>
        </div>
      </div>

      {/* 로딩 메시지 */}
      <div key={loadStep} className="flex flex-col items-center gap-3 text-center w-full max-w-xs" style={{ animation:'fade-up .5s cubic-bezier(.16,.84,.44,1) both' }}>
        <p className="text-[18px] font-semibold text-white leading-snug">{LOADING_STEPS[loadStep].text}</p>
        <p className="text-[13.5px]" style={{ color:'var(--ink-faint)', lineHeight: 1.6 }}>{LOADING_STEPS[loadStep].detail}</p>
        {/* 진행 점 */}
        <div className="flex gap-1.5 mt-1">
          {LOADING_STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-500"
              style={{ width: i === loadStep ? 18 : 7, height: 7,
                background: i <= loadStep ? 'rgba(129,140,248,0.85)' : 'rgba(255,255,255,0.1)',
                transform: i === loadStep ? 'scale(1)' : 'scale(1)' }}/>
          ))}
        </div>


        {onCancel && (
          <button onClick={onCancel} className="mt-1 text-[13px] font-medium active:scale-95 transition-transform px-6 py-3 rounded-2xl"
            style={{ color:'var(--ink-faint)', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)' }}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   RESULT
================================================================ */
/* 결과 히어로 섹션 — 페이지 1에서 공통으로 사용 */
function ResultHero({ r, oh, m, cfg, yesterday, ritualStep }) {
  const arc = m === 'gunghap' ? getRelationshipArchetype(r.score) : null;
  return (
    <section className="flex flex-col items-center text-center pt-6 pb-4 px-4">
      {/* 운세 히어로 = 점수 원 + 숫자만. 날짜·~~날·한줄·일주 텍스트 제거(사용자 요청). */}
      <div style={{ opacity: ritualStep >= 2 ? 1 : 0, transform: ritualStep >= 2 ? 'scale(1)' : 'scale(0.92)', transition:'all 0.8s cubic-bezier(.16,.84,.44,1)' }}>
        <ScoreRing score={r.score} yesterdayScore={m === 'fortune' ? yesterday : null}
          tone={arc ? arc.tone : oh?.color}/>
      </div>
    </section>
  );
}

/* 페이지 인디케이터 점 */
function PageDots({ total, current, color = '#a78bfa', onDotClick }) {
  const labels = ['요약', '상세', '행운'];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i}
            onClick={() => onDotClick?.(i)}
            aria-label={`${i + 1}번째 페이지`}
            style={{
              width: i === current ? 24 : 8, height: 7, borderRadius: 4,
              background: i === current ? color : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s cubic-bezier(.16,.84,.44,1)',
              border: 'none', padding: 0, cursor: 'pointer',
              boxShadow: i === current ? `0 0 8px ${color}88` : 'none',
            }}/>
        ))}
      </div>
      {total > 1 && current < total - 1 && (
        <p className="text-[10.5px] font-medium" style={{ color: 'rgba(255,255,255,0.22)', letterSpacing:'0.06em' }}>
          ← 스와이프 또는 다음 버튼 →
        </p>
      )}
    </div>
  );
}

function Result({ result: r, nickname, birth, yesterday, streak, onHome, onRetry, onGunghapReport, onSajuCard, onShare, onFont, fontLabel }) {
  const m = r.analysisMode;
  const cfg = MODES[m];
  const oh = OHAENG[r.mainOhaeng];
  const [ritualStep, setRitualStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRitualStep(1), 700);
    const t2 = setTimeout(() => setRitualStep(2), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // 타로는 페이지 없음 — 기존 방식 유지(단, 하단 메인으로 네비 포함)
  if (m === 'tarot') return <ResultShell r={r} streak={streak} onFont={onFont} fontLabel={fontLabel} oh={oh}
    onHome={onHome} onShare={onShare}>
    <TarotResult r={r}/>
  </ResultShell>;

  const accentColor = oh?.color || '#a78bfa';
  // 운세 결과는 '연속해서 읽는 글' — 옆으로 넘기는 페이지 대신 한 화면에서 쭉 스크롤.
  // 기존 3개 페이지(0·1·2) 묶음은 섹션 단위 여백으로 구분해 흐름은 유지한다.
  // (사주카드·타로·자미두수·수비학도 스크롤이라 앱 전체 일관성 회복)
  const PAGE_COUNT = { fortune:3, weekly:3, saju:3, gunghap:3, monthly:3, yearly:3, wealth:2 };
  const pages = Array.from({ length: PAGE_COUNT[m] || 1 }, (_, i) => i);

  return (
    <div className="screen-vh flex flex-col overflow-hidden result-descent">
      {/* 오행색 배경 글로우 */}
      {oh?.color && (
        <div className="fixed top-0 left-0 right-0 z-0 pointer-events-none" aria-hidden="true"
          style={{ height: 280,
            background:`radial-gradient(ellipse 120% 80% at 50% -10%, ${oh.color}28 0%, transparent 70%)`,
            transition:'background 1.4s ease' }}/>
      )}

      {/* 상단 바 */}
      <div className="relative z-10 flex justify-between items-center px-5 pt-4 pb-2 flex-shrink-0">
        <div>
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.25)', color:'#f0b429' }}>
              🔥 {streak}일
            </span>
          )}
        </div>
      </div>

      {/* 스크롤 콘텐츠 영역 — 모든 섹션을 세로로 쭉 */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-5 page-in"
        style={{ paddingBottom: 112, overscrollBehavior: 'contain' }}>
        {pages.map((p, idx) => (
          <div key={p} className={idx > 0 ? 'mt-6' : ''}>
            <ResultPage m={m} page={p} r={r} birth={birth} oh={oh} yesterday={yesterday} ritualStep={ritualStep} cfg={cfg} onGunghapReport={onGunghapReport} onSajuCard={onSajuCard}/>
          </div>
        ))}
      </div>

      {/* 하단 네비게이션 — 메인으로 */}
      <div className="relative z-40 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="px-5 pt-8 pb-4" style={{ background:'linear-gradient(to top,var(--bg) 55%,transparent)' }}>
          <div className="max-w-xl mx-auto flex items-center gap-2.5">
            <button onClick={onHome}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] text-white active:scale-[0.98] transition-transform"
              style={{ minHeight:54, background:'linear-gradient(135deg,#6366f1,#a78bfa)', boxShadow:'0 8px 24px rgba(99,102,241,0.35)' }}>
              <Home size={17}/> 메인으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 카드·타로용 기존 레이아웃 래퍼 */
function ResultShell({ r, streak, onFont, fontLabel, oh, children, onHome, onShare, onRetry }) {
  return (
    <div className="py-8 space-y-6 pb-32 result-descent">
      {oh?.color && (
        <div className="fixed top-0 left-0 right-0 z-0 pointer-events-none" aria-hidden
          style={{ height:340, background:`radial-gradient(ellipse 120% 80% at 50% -10%, ${oh.color}30 0%, transparent 70%)`, filter:'blur(2px)' }}/>
      )}
      {streak > 1 && (
        <div className="flex justify-start items-center animate-fade-in relative z-10 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold"
            style={{ background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.28)', color:'#f0b429' }}>🔥 {streak}일 연속</span>
        </div>
      )}
      {children}

      {/* 하단 고정 네비게이션 — 페이지형 결과와 동일하게 공유·재분석·메인으로 */}
      {onHome && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="px-5 pt-10 pb-4" style={{ background:'linear-gradient(to top,var(--bg) 58%,transparent)' }}>
            <div className="max-w-xl mx-auto flex items-center gap-2.5">
              <button onClick={onHome}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] text-white active:scale-[0.98] transition-transform"
                style={{ minHeight:54, background:'linear-gradient(135deg,#6366f1,#a78bfa)', boxShadow:'0 8px 24px rgba(99,102,241,0.35)' }}>
                <Home size={17}/> 메인으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 결과 페이지 콘텐츠 — 모드×페이지 번호에 따라 렌더링 */
function ResultPage({ m, page, r, birth, oh, yesterday, ritualStep, cfg, onGunghapReport, onSajuCard }) {
  const hero = <ResultHero r={r} oh={oh} m={m} cfg={cfg} yesterday={yesterday} ritualStep={ritualStep}/>;

  if (m === 'fortune') {
    if (page === 0) {
      const saju = (() => { try { return birth ? calculateSaju(birth) : null; } catch { return null; } })();
      return (
        <div className="space-y-4">
          {hero}
          {saju && (
            <div className="glass rounded-[20px] p-4 flex items-center gap-3">
              <div className="flex-shrink-0"><ElementConstellation distribution={saju.elements} focus={r.mainOhaeng} size={100}/></div>
              <div className="flex-1 min-w-0">
                <Eyebrow gold>나의 기운</Eyebrow>
                <p className="text-[13px] mt-1.5" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>
                  {r.ohaengSummary || `오늘은 ${OHAENG[r.mainOhaeng]?.plain || ''} 기운이 중심이에요.`}
                </p>
              </div>
            </div>
          )}
          <RevealCard icon={<Eye size={20}/>} title="종합 운세" jewel="indigo" content={r.comprehensive} delay={0}/>
        </div>
      );
    }
    if (page === 1) return (
      <div className="space-y-4">
        <Eyebrow className="ml-0.5" gold>분야별 운세</Eyebrow>
        <RevealCard icon={<Coins size={20}/>} title="재물운" jewel="amber" content={r.wealthText} tip={r.actionTips?.wealth} delay={0}/>
        <RevealCard icon={<Heart size={20}/>} title="애정운" jewel="rose" content={r.loveText} tip={r.actionTips?.love} delay={60}/>
        <RevealCard icon={<TrendingUp size={20}/>} title="성공운" jewel="violet" content={r.successText} tip={r.actionTips?.success} delay={120}/>
        <RevealCard icon={<Shield size={20}/>} title="건강운" jewel="emerald" content={r.healthText} tip={r.actionTips?.health} delay={180}/>
      </div>
    );
    return (
      <div className="space-y-4">
        {r.timeFlow && <TimelineCard title="시간대 흐름" jewel="sky" items={[
          { label:'오전', text:r.timeFlow.morning }, { label:'오후', text:r.timeFlow.afternoon }, { label:'저녁', text:r.timeFlow.evening },
        ]}/>}
        <LuckyBento r={r}/>
        <ClassicBlock classic={r.classic}/>
        {r.basisSummary && <BasisBlock text={r.basisSummary}/>}
      </div>
    );
  }

  if (m === 'weekly') {
    if (page === 0) return (
      <div className="space-y-4">
        {hero}
        <div className="text-center"><span className="text-[12px] px-3 py-1 rounded-full glass" style={{ color:'var(--ink-dim)' }}>{weekRangeStr()}</span></div>
        <RevealCard icon={<Calendar size={20}/>} title="이번 주 총운" jewel="indigo" content={r.overview} delay={0}/>
      </div>
    );
    if (page === 1) {
      const days = r.days || {};
      const dayList = [['mon','월'],['tue','화'],['wed','수'],['thu','목'],['fri','금'],['sat','토'],['sun','일']];
      return (
        <>
          <Eyebrow className="ml-0.5" gold>요일별 흐름</Eyebrow>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ scrollSnapType:'x mandatory' }}>
            {dayList.map(([k, ko]) => {
              const best = r.bestDay?.includes(ko);
              const text = (days[k] || '').slice(0, 60);
              return (
                <div key={k} className="flex-shrink-0 glass rounded-2xl flex flex-col gap-2"
                  style={{ width:148, padding:'14px', scrollSnapAlign:'start',
                    border: best ? '1.5px solid rgba(240,180,41,0.5)' : '1px solid rgba(167,139,250,0.14)',
                    background: best ? 'rgba(240,180,41,0.06)' : undefined }}>
                  <span className="text-[16px] font-black" style={{ color: best ? '#f0b429' : 'var(--ink)' }}>{ko}{best ? ' ✦' : ''}</span>
                  <p className="text-[12px] leading-relaxed" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>{text}{text.length >= 60 ? '…' : ''}</p>
                </div>
              );
            })}
          </div>
          {r.bestDay && <p className="text-[12px]" style={{ color:'var(--ink-dim)' }}><b style={{ color:'#f0b429' }}>{r.bestDay}</b> · {r.bestDayReason}</p>}
        </>
      );
    }
    return (
      <div className="space-y-4">
        <RevealCard icon={<Coins size={20}/>} title="재물" jewel="amber" content={r.wealth} delay={0}/>
        <RevealCard icon={<Heart size={20}/>} title="인연" jewel="rose" content={r.love} delay={60}/>
        <RevealCard icon={<TrendingUp size={20}/>} title="일·학업" jewel="violet" content={r.work} delay={120}/>
        <RevealCard icon={<Star size={20}/>} title="이번 주 조언" jewel="sky" content={r.advice} delay={180}/>
        <QuoteBlock text={r.quote}/>
      </div>
    );
  }

  if (m === 'monthly') {
    const monthLabel = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`;
    if (page === 0) return (
      <div className="space-y-4">
        {hero}
        <div className="text-center"><span className="text-[12px] px-3 py-1 rounded-full glass" style={{ color:'var(--ink-dim)' }}>{monthLabel}</span></div>
        <RevealCard icon={<Calendar size={20}/>} title="이번 달 총운" jewel="indigo" content={r.overview} delay={0}/>
      </div>
    );
    if (page === 1) return (
      <div className="space-y-4">
        {r.phases && <TimelineCard title="이번 달의 흐름" jewel="indigo" items={[
          { label:'상순', sub:'1~10일', text:r.phases.early },
          { label:'중순', sub:'11~20일', text:r.phases.mid },
          { label:'하순', sub:'21일~', text:r.phases.late },
        ]}/>}
        {r.bestPeriod && <p className="text-[12.5px]" style={{ color:'var(--ink-dim)' }}><b style={{ color:'#818cf8' }}>{r.bestPeriod}</b> · {r.bestPeriodReason}</p>}
      </div>
    );
    return (
      <div className="space-y-4">
        <RevealCard icon={<Coins size={20}/>} title="이번 달 재물" jewel="amber" content={r.wealth} delay={0}/>
        <RevealCard icon={<Heart size={20}/>} title="이번 달 인연" jewel="rose" content={r.love} delay={60}/>
        <RevealCard icon={<TrendingUp size={20}/>} title="일·학업" jewel="violet" content={r.work} delay={120}/>
        <RevealCard icon={<Star size={20}/>} title="이번 달 조언" jewel="sky" content={r.advice} delay={180}/>
        <QuoteBlock text={r.quote}/>
      </div>
    );
  }

  if (m === 'yearly') {
    const yearLabel = `${new Date().getFullYear()}년`;
    if (page === 0) return (
      <div className="space-y-4">
        {hero}
        <div className="text-center"><span className="text-[12px] px-3 py-1 rounded-full glass" style={{ color:'var(--ink-dim)' }}>{yearLabel}</span></div>
        <RevealCard icon={<TrendingUp size={20}/>} title="올해의 총운" jewel="violet" content={r.overview} delay={0}/>
      </div>
    );
    if (page === 1) return (
      <div className="space-y-4">
        {r.quarters && <TimelineCard title="분기별 흐름" jewel="violet" items={[
          { label:'1분기', sub:'1~3월', text:r.quarters.q1 },
          { label:'2분기', sub:'4~6월', text:r.quarters.q2 },
          { label:'3분기', sub:'7~9월', text:r.quarters.q3 },
          { label:'4분기', sub:'10~12월', text:r.quarters.q4 },
        ]}/>}
        {r.turningPoint && <RevealCard icon={<Zap size={20}/>} title="올해의 전환점" jewel="amber" content={r.turningPoint} delay={60}/>}
      </div>
    );
    return (
      <div className="space-y-4">
        <RevealCard icon={<Coins size={20}/>} title="올해 재물운" jewel="amber" content={r.wealth} delay={0}/>
        <RevealCard icon={<Heart size={20}/>} title="올해 인연·관계" jewel="rose" content={r.love} delay={60}/>
        <RevealCard icon={<TrendingUp size={20}/>} title="올해 일·사회운" jewel="indigo" content={r.career} delay={120}/>
        <RevealCard icon={<Shield size={20}/>} title="건강 주의점" jewel="emerald" content={r.health} delay={180}/>
        <RevealCard icon={<Star size={20}/>} title="올해의 조언" jewel="sky" content={r.advice} delay={240}/>
        <QuoteBlock text={r.quote}/>
        {r.basisSummary && <BasisBlock text={r.basisSummary}/>}
      </div>
    );
  }

  if (m === 'wealth') {
    if (page === 0) return (
      <div className="space-y-4">
        {hero}
        <RevealCard icon={<Coins size={20}/>} title="재물 총운" jewel="amber" content={r.overview} delay={0}/>
      </div>
    );
    return (
      <div className="space-y-4">
        <RevealCard icon={<TrendingUp size={20}/>} title="수입·재물이 들어오는 길" jewel="emerald" content={r.incomeText} delay={0}/>
        <RevealCard icon={<Shield size={20}/>} title="지출·관리" jewel="sky" content={r.spendingText} delay={60}/>
        <RevealCard icon={<Zap size={20}/>} title="투자·기회" jewel="violet" content={r.investText} delay={120}/>
        {(r.luckyMonth || r.luckyItem) && (
          <div className="flex gap-2.5">
            {r.luckyMonth && (
              <div className="flex-1 glass rounded-2xl p-4 text-center">
                <Eyebrow gold className="text-center">재물 좋은 시기</Eyebrow>
                <p className="text-[15px] font-bold mt-1.5" style={{ color:'#f0b429' }}>{r.luckyMonth}</p>
              </div>
            )}
            {r.luckyItem && (
              <div className="flex-1 glass rounded-2xl p-4 text-center">
                <Eyebrow gold className="text-center">재물을 부르는 것</Eyebrow>
                <p className="text-[15px] font-bold mt-1.5" style={{ color:'#f0b429' }}>{r.luckyItem}</p>
              </div>
            )}
          </div>
        )}
        <RevealCard icon={<Star size={20}/>} title="재물을 키우는 조언" jewel="rose" content={r.advice} delay={180}/>
        <QuoteBlock text={r.quote}/>
        {r.basisSummary && <BasisBlock text={r.basisSummary}/>}
      </div>
    );
  }

  if (m === 'saju') {
    if (page === 0) return (
      <div className="space-y-5">
        {/* 평생사주 히어로 = 사주 카드 한 장 (오행 한자·점수링·대길의날 히어로 대체) */}
        <SajuCardTop r={r} oh={oh}/>
        <RevealCard icon={<Eye size={20}/>} title="타고난 성격" jewel="indigo" content={r.personality} delay={0}/>
      </div>
    );
    if (page === 1) return (
      <div className="space-y-4">
        <RevealCard icon={<Sparkles size={20}/>} title="재능과 적성" jewel="violet" content={r.talent} delay={0}/>
        <RevealCard icon={<Coins size={20}/>} title="평생 재물운" jewel="amber" content={r.wealth} delay={60}/>
        <RevealCard icon={<Heart size={20}/>} title="연애와 결혼" jewel="rose" content={r.love} delay={120}/>
        <RevealCard icon={<TrendingUp size={20}/>} title="직업과 사회운" jewel="sky" content={r.career} delay={180}/>
      </div>
    );
    return (
      <div className="space-y-4">
        <RevealCard icon={<Shield size={20}/>} title="건강 주의점" jewel="emerald" content={r.health} delay={0}/>
        {r.lifeFlow && <TimelineCard title="인생의 흐름" jewel="amber" items={[
          { label:'초년', sub:'~30대', text:r.lifeFlow.early },
          { label:'중년', sub:'40~50대', text:r.lifeFlow.middle },
          { label:'말년', sub:'60대~', text:r.lifeFlow.late },
        ]}/>}
        <RevealCard icon={<Star size={20}/>} title="인생 조언" jewel="violet" content={r.advice} delay={60}/>
        <QuoteBlock text={r.quote}/>
        {r.basisSummary && <BasisBlock text={r.basisSummary}/>}
      </div>
    );
  }

  if (m === 'gunghap') {
    if (page === 0) return (<>{hero}<GunghapOhaengCard r={r}/></>);
    if (page === 1) return (
      <div className="space-y-4">
        <RevealCard icon={<Eye size={20}/>} title="종합 궁합" jewel="rose" content={r.comprehensive} delay={0}/>
        <RevealCard icon={<Heart size={20}/>} title="애정 궁합" jewel="rose" content={r.loveText} delay={60}/>
        <RevealCard icon={<Users size={20}/>} title="소통 궁합" jewel="indigo" content={r.communicationText} delay={120}/>
      </div>
    );
    return (
      <div className="space-y-4">
        <RevealCard icon={<TrendingUp size={20}/>} title="미래 전망" jewel="emerald" content={r.futureText} delay={0}/>
        {r.relationFlow && <TimelineCard title="관계의 흐름" jewel="rose" items={[
          { label:'만남 초기', sub:'설렘과 탐색', text:r.relationFlow.early },
          { label:'안정기', sub:'깊어지는 유대', text:r.relationFlow.stable },
          { label:'장기적 관계', sub:'함께 성장', text:r.relationFlow.longterm },
        ]}/>}
        <RevealCard icon={<Star size={20}/>} title="서로를 위한 조언" jewel="amber" content={r.advice} tip="오늘 따뜻한 말 한마디를 건네보세요." delay={60}/>
        <QuoteBlock text={r.quote}/>
        {onGunghapReport && (
          <button onClick={onGunghapReport} className="w-full block group active:scale-[0.985] transition-transform">
            <div className="glass-strong rounded-[22px] relative overflow-hidden p-5 text-left"
              style={{ border:'1.5px solid rgba(251,113,133,0.35)', boxShadow:'0 12px 40px rgba(251,113,133,0.12)' }}>
              <div className="absolute rounded-full pointer-events-none" style={{ right:-20, top:-20, width:120, height:120, background:'rgba(251,113,133,0.18)', filter:'blur(40px)' }}/>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:52, height:52, background:'rgba(251,113,133,0.14)', border:'1.5px solid rgba(251,113,133,0.4)' }}>
                  <Heart size={24} style={{ color:'#fb7185' }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-bold" style={{ color:'var(--ink)' }}>궁합 심층 리포트</p>
                  <p className="text-[13px] mt-0.5" style={{ color:'var(--ink-dim)' }}>관계 본질 · 갈등 패턴 · 1·3·5년 전망 — PDF 저장</p>
                </div>
                <ChevronRight size={18} style={{ color:'rgba(251,113,133,0.5)', flexShrink:0 }}/>
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  return hero;
}

/* 궁합 오행 비교 카드 */
function GunghapOhaengCard({ r }) {
  const myOh = OHAENG[r.mainOhaeng];
  const partnerOh = OHAENG[r.partnerOhaeng];
  if (!myOh || !partnerOh) return null;
  const RELATION = {
    '목화':'상생', '화토':'상생', '토금':'상생', '금수':'상생', '수목':'상생',
    '목토':'상극', '토수':'상극', '수화':'상극', '화금':'상극', '금목':'상극',
  };
  const relKey = RELATION[`${myOh.name}${partnerOh.name}`] || RELATION[`${partnerOh.name}${myOh.name}`];
  const isCompatible = relKey === '상생';
  return (
    <div className="glass-strong rounded-3xl overflow-hidden animate-fade-up relative"
      style={{ border:'1px solid rgba(251,113,133,0.25)', boxShadow:'0 12px 48px rgba(251,113,133,0.12)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:`linear-gradient(135deg, ${myOh.color}14 0%, transparent 45%, ${partnerOh.color}14 100%)` }}/>
      <div className="relative p-6">
        <Eyebrow className="text-center mb-5" color="rgba(251,113,133,0.7)">오행 기운 비교</Eyebrow>
        <div className="flex items-stretch gap-3">
          {[{ oh:myOh, ilju:r.ilju, label:'나' }, { oh:partnerOh, ilju:r.partnerIlju, label:'상대' }].map((p, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3 rounded-2xl p-4 relative overflow-hidden"
              style={{ background:`${p.oh.color}12`, border:`1px solid ${p.oh.color}35` }}>
              <div style={{ width:60, height:60, borderRadius:18, background:`${p.oh.color}22`, border:`1.5px solid ${p.oh.color}60`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 6px 24px ${p.oh.color}30` }}>
                <span className="serif text-[28px] font-black" style={{ color:p.oh.color }}>{p.oh.hanja}</span>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-bold" style={{ color:p.oh.color }}>{p.oh.plain} 기운</p>
                {p.ilju && <p className="text-[11px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{p.ilju}</p>}
                <p className="text-[11px] mt-1 font-bold" style={{ color:'var(--ink-faint)' }}>{p.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl py-2.5 px-4 text-center"
          style={{ background: isCompatible ? 'rgba(52,211,153,0.08)' : 'rgba(251,113,133,0.08)',
            border:`1px solid ${isCompatible ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.22)'}` }}>
          <span className="text-[12.5px] font-semibold"
            style={{ color: isCompatible ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.85)' }}>
            {isCompatible ? '✦ 서로의 기운이 자연스럽게 어우러져요' : '· 서로 다른 기운 — 배울 점이 많은 관계예요'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* 평생사주 상단 사주카드 — 절차적 카드 이미지만 표시(텍스트는 사주 내용 사용).
   별도 AI 분석 없이 일주·오행 시드로 자체 생성. 저장/공유 가능. */
function SajuCardTop({ r, oh }) {
  const [cardImg, setCardImg] = useState(null);
  useEffect(() => {
    let alive = true;
    generateSajuCardImageAsync({ ilju: r.ilju, ohaeng: r.mainOhaeng })
      .then(url => { if (alive) setCardImg(url); }).catch(() => {});
    return () => { alive = false; };
  }, [r.ilju, r.mainOhaeng]);
  const accent = oh?.color || '#a78bfa';
  // 평생사주 히어로 = 사주 카드 한 장. 공유·저장 기능 폐기, 오행 심볼 폴백 제거.
  return (
    <div className="flex flex-col items-center text-center gap-3 pt-1 pb-1">
      <Eyebrow gold>평생 사주 · 나의 카드</Eyebrow>
      <div className="relative" style={{ width:'100%', maxWidth:252, aspectRatio:'3/4' }}>
        <div className="absolute rounded-full pointer-events-none" style={{ inset:-14, background:`${accent}22`, filter:'blur(40px)' }}/>
        {cardImg && <img src={cardImg} alt={`사주 카드 — 일주 ${r.ilju}`} draggable={false}
          className="relative w-full rounded-[22px]"
          style={{ boxShadow:`0 18px 54px ${accent}33, 0 0 0 1px rgba(255,255,255,0.08) inset` }}/>}
      </div>
      {r.oneliner && (
        <p className="serif text-[18px] font-bold italic leading-snug px-3" style={{ color:'rgba(255,255,255,0.92)' }}>
          “{r.oneliner}”
        </p>
      )}
    </div>
  );
}

function TarotResult({ r }) {
  const c = r.tarot || {};
  const ori = c.upright ? '정방향' : '역방향';
  const roman = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col items-center text-center gap-5 pt-2">
        {/* 타로 카드 이미지 — 강화된 프레임 */}
        <div className="relative tarot-enter">
          {/* 다중 glow 레이어 */}
          <div className="absolute rounded-3xl" style={{ inset:-20, background:'radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(99,102,241,0.1) 50%, transparent 75%)', filter:'blur(28px)' }}/>
          <div className="absolute rounded-3xl" style={{ inset:-8, background:'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)', filter:'blur(16px)' }}/>
          {/* 카드 프레임 — 대형화 */}
          <div className="relative rounded-[22px] overflow-hidden"
            style={{ width:220, height:380,
              background:'linear-gradient(160deg,#1a1535 0%, #200e3a 50%, #0e0a24 100%)',
              border:'1.5px solid rgba(167,139,250,0.55)',
              boxShadow:'0 32px 80px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.07) inset',
              padding:10 }}>
            {/* 내부 별가루 (이미지 없을 때만) */}
            {!c.img && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[[15,12],[85,8],[50,50],[12,80],[88,75]].map(([x,y],i)=>(
                  <span key={i} className="absolute rounded-full bg-white"
                    style={{ left:`${x}%`, top:`${y}%`, width:2, height:2, opacity:0.2+i*0.04,
                      animation:`cm-twinkle ${3+i*0.6}s ease-in-out ${i*0.5}s infinite` }}/>
                ))}
              </div>
            )}
            {c.img
              ? <img src={c.img} alt={c.ko} draggable={false}
                  className="w-full h-full object-cover rounded-xl"
                  style={{ transform:c.upright ? 'none' : 'rotate(180deg)',
                    boxShadow:'0 0 0 1px rgba(255,255,255,0.06) inset',
                    borderRadius:14 }}/>
              : <div className="w-full h-full rounded-[14px] flex flex-col items-center justify-center gap-3"
                  style={{ background:'linear-gradient(160deg,#17123a,#0d0920)' }}>
                  <span className="serif text-[38px] font-black" style={{ color:'rgba(167,139,250,0.9)' }}>{roman[c.n] || ''}</span>
                  <span className="serif text-[20px] font-bold text-white px-3 text-center leading-snug">{c.ko}</span>
                </div>}
          </div>
          {/* 방향 배지 */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ background: c.upright ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)',
              border:`1px solid ${c.upright ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)'}`,
              color: c.upright ? '#34d399' : '#fb7185', whiteSpace:'nowrap' }}>
            {ori}
          </div>
        </div>

        {/* 카드 이름 + 키워드 */}
        <div className="space-y-3 mt-2">
          <p className="serif text-[24px] font-bold text-white">{c.ko}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {String(c.kw || '').split('·').filter(Boolean).map((kw, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ color:JEWELS.emerald.main, background:JEWELS.emerald.soft, border:`1px solid ${JEWELS.emerald.border}` }}>
                {kw.trim()}
              </span>
            ))}
          </div>
        </div>
        {r.mood && (
          <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>
            오늘의 분위기 · <b style={{ color:JEWELS.emerald.main }}>{r.mood}</b>
          </p>
        )}
      </div>
      <RevealCard icon={<Sparkles size={20}/>} title="카드 해석" jewel="emerald" content={r.interpretation} delay={0}/>
      <RevealCard icon={<Heart size={20}/>} title="오늘의 메시지" jewel="violet" content={r.message} tip={r.advice} delay={80}/>
      {r.luckyTip && (
        <div className="glass rounded-2xl p-5 flex items-start gap-3"
          style={{ border:`1px solid ${JEWELS.amber.border}` }}>
          <Zap size={16} style={{ color:JEWELS.amber.main, marginTop:2, flexShrink:0 }}/>
          <p className="text-[14px]" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>
            <b className="text-white">행운의 한 조각 </b>{r.luckyTip}
          </p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   공용 결과 조각
================================================================ */
function ModeBadge({ mode, cfg }) {
  const j = JEWELS[cfg.jewel];
  // 결과 배지: 오늘운세는 날짜, 궁합은 '보기' 떼고 '궁합'으로(결과 화면에 '보기'는 어색)
  const label = mode === 'fortune' ? todayStr() : mode === 'gunghap' ? '궁합' : cfg.title;
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
      <span className="inline-flex" style={{ color:j.main }}>{MODE_ICONS[mode]}</span>
      <span className="text-[12px] font-bold tracking-wide" style={{ color:'var(--ink-dim)' }}>{label}</span>
    </div>
  );
}

function TimelineCard({ title, items, jewel = 'indigo' }) {
  const j = JEWELS[jewel];
  return (
    <GlassCard className="p-6" jewel={jewel}>
      <div className="flex items-center gap-2.5 mb-5">
        <Clock size={16} style={{ color:j.main }}/>
        <h3 className="text-[17px] font-bold text-white">{title}</h3>
      </div>
      <div className="relative pl-6 space-y-5" style={{ borderLeft:`2px solid ${j.border}` }}>
        {items.map((it, i) => (
          <div key={i} className="relative">
            <div className="absolute rounded-full" style={{ left:-26.5, top:3, width:11, height:11, background:j.main, border:'2px solid var(--bg)' }}/>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[14px] font-bold" style={{ color:'var(--ink)' }}>{it.label}</span>
              {it.sub && <span className="text-[10px]" style={{ color:'var(--ink-faint)' }}>{it.sub}</span>}
            </div>
            <p className="text-[14px]" style={{ color:'var(--ink-dim)', lineHeight:1.75 }}>{it.text}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* 행운의 색 이름 → 색 스와치(부분일치). 매칭 안 되면 null */
const COLOR_MAP = [
  ['빨','#ef4444'],['적','#ef4444'],['red','#ef4444'],
  ['주황','#f97316'],['오렌지','#f97316'],['귤','#f97316'],
  ['노','#facc15'],['황','#eab308'],['금','#e7b94f'],['골드','#e7b94f'],['yellow','#facc15'],
  ['연두','#a3e635'],['초록','#22c55e'],['녹','#22c55e'],['그린','#22c55e'],['green','#22c55e'],
  ['하늘','#38bdf8'],['청','#38bdf8'],['파','#3b82f6'],['blue','#3b82f6'],['남','#1e3a8a'],
  ['보라','#a855f7'],['자','#a855f7'],['purple','#a855f7'],['바이올렛','#a855f7'],
  ['분홍','#f9a8d4'],['핑크','#f9a8d4'],['pink','#f9a8d4'],
  ['갈','#92400e'],['브라운','#92400e'],['밤','#78350f'],
  ['검','#1f2937'],['흑','#1f2937'],['black','#1f2937'],
  ['하양','#f8fafc'],['흰','#f8fafc'],['백','#f8fafc'],['white','#f8fafc'],
  ['회','#9ca3af'],['은','#cbd5e1'],['실버','#cbd5e1'],['gray','#9ca3af'],
];
function colorNameToHex(name) {
  if (!name) return null;
  const s = String(name).toLowerCase();
  for (const [k, hex] of COLOR_MAP) if (s.includes(k)) return hex;
  return null;
}

function LuckyBento({ r }) {
  const tiles = [
    { label:'행운의 색', value:r.luckyColor, jewel:'rose', swatch:colorNameToHex(r.luckyColor), icon:'🎨' },
    { label:'행운의 숫자', value:r.luckyNumber, jewel:'amber', icon:'🔢' },
    { label:'행운의 음식', value:r.luckyFood, jewel:'emerald', icon:'🍀' },
    { label:'행운의 스타일', value:r.luckyStyle, jewel:'violet', icon:'✨' },
  ].filter(t => t.value !== undefined && t.value !== null && t.value !== '');
  if (!tiles.length) return null;
  return (
    <div className="space-y-2">
      <Eyebrow className="ml-1" gold>오늘의 행운</Eyebrow>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => {
          const j = JEWELS[t.jewel];
          return (
            <div key={i} className="glass rounded-2xl p-4 relative overflow-hidden"
              style={{ border:`1px solid ${j.border}` }}>
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                style={{ background:j.glow, filter:'blur(30px)' }}/>
              <div className="relative">
                <p className="text-[10.5px] font-bold tracking-[0.14em]" style={{ color:j.main }}>{t.label}</p>
                <div className="flex items-center gap-2 mt-2">
                  {t.swatch
                    ? <span className="rounded-full flex-shrink-0"
                        style={{ width:18, height:18, background:t.swatch, border:'2px solid rgba(255,255,255,0.3)',
                          boxShadow:`0 0 10px ${t.swatch}bb` }}/>
                    : <span style={{ fontSize:16 }}>{t.icon}</span>}
                  <p className="text-[16px] font-bold text-white leading-tight break-keep">{t.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuoteBlock({ text }) {
  if (!text) return null;
  return (
    <div className="relative py-8 px-4 text-center overflow-hidden">
      {/* 배경 별빛 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(167,139,250,0.06) 0%, transparent 70%)' }}/>
      {/* 상단 선 */}
      <div className="w-16 h-px mx-auto mb-5" style={{ background:'linear-gradient(to right, transparent, rgba(167,139,250,0.4), transparent)' }}/>
      <span className="serif text-[32px] leading-none block" style={{ color:'rgba(167,139,250,0.35)', marginBottom:-8 }}>"</span>
      <p className="serif text-[16.5px] italic leading-relaxed px-4" style={{ color:'var(--ink-dim)', lineHeight:1.85 }}>{text}</p>
      <span className="serif text-[32px] leading-none block" style={{ color:'rgba(167,139,250,0.35)', marginTop:-8 }}>"</span>
      {/* 하단 선 */}
      <div className="w-16 h-px mx-auto mt-4" style={{ background:'linear-gradient(to right, transparent, rgba(167,139,250,0.4), transparent)' }}/>
    </div>
  );
}

/* 오늘 새길 한 구절 — 동양 고전 명구(사자성어·고사성어·불교구절·사서삼경 중 하나) */
function ClassicBlock({ classic }) {
  if (!classic || !classic.hanja) return null;
  return (
    <div className="rounded-2xl px-5 py-6 text-center relative overflow-hidden"
      style={{ background:'linear-gradient(160deg, rgba(240,180,41,0.10), rgba(240,180,41,0.02))',
        border:'1px solid rgba(240,180,41,0.28)', boxShadow:'0 8px 30px rgba(240,180,41,0.10)' }}>
      {/* 금빛 후광 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(240,180,41,0.12), transparent 70%)' }}/>
      <p className="relative text-[10.5px] font-bold tracking-[0.26em] mb-3" style={{ color:'rgba(240,180,41,0.85)' }}>✦ 오늘 새길 한 구절 ✦</p>
      <p className="relative serif font-black leading-tight" style={{ fontSize:34, letterSpacing:'0.12em', color:'#f0b429', textShadow:'0 2px 16px rgba(240,180,41,0.35)' }}>{classic.hanja}</p>
      {classic.eum && <p className="relative text-[12px] font-semibold tracking-[0.3em] mt-2" style={{ color:'rgba(255,255,255,0.62)' }}>{classic.eum}</p>}
      {classic.meaning && <p className="relative serif text-[15px] italic mt-3.5 px-2" style={{ color:'var(--ink)', lineHeight:1.7 }}>&ldquo;{classic.meaning}&rdquo;</p>}
      {classic.source && <p className="relative text-[11px] font-bold tracking-wide mt-3" style={{ color:'rgba(240,180,41,0.8)' }}>— {classic.source}</p>}
    </div>
  );
}

function BasisBlock({ text }) {
  return (
    <div className="glass rounded-2xl overflow-hidden px-5 py-4" style={{ borderLeft:'3px solid rgba(167,139,250,0.3)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color:'rgba(167,139,250,0.65)' }}>명리학적 근거</p>
      <div className="space-y-2">
        {text.split('\n').filter(Boolean).map((l, i) => (
          <p key={i} className="text-[13px]" style={{ color:'var(--ink-dim)', lineHeight:1.75 }}>{l.replace(/^[•\-*\d.●]\s*/, '')}</p>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   REPORT — 이메일 신청
================================================================ */
const REPORT_META = {
  signature: {
    eyebrow: '인생 시그니처', title: '인생 시그니처 리포트', jewel: 'violet',
    accent: '#a78bfa', grad: 'linear-gradient(135deg,#6366f1,#a78bfa)', glow: 'rgba(99,102,241,0.3)',
    desc: ['AI가 당신의 사주 명식을 깊이 읽어', '인생 전반을 한 권의 PDF로 정리해 드려요'],
    contents: ['사주 명식 네 기둥 + 오행 분포 분석', '타고난 성격·재능 + 재물·애정·직업·건강운', `${new Date().getFullYear()}년 월별 운세 12개월 전체`, '초년·중년·말년 인생 흐름 + 향후 5년', '맞춤형 인생 조언'],
  },
  study: {
    eyebrow: '학습 상세', title: '학습 상세 리포트', jewel: 'emerald',
    accent: '#10b981', grad: 'linear-gradient(135deg,#059669,#10b981)', glow: 'rgba(16,185,129,0.3)',
    desc: ['AI가 당신의 사주로 학습 기질을 분석해', '맞춤 학습 전략을 한 권의 PDF로 정리해 드려요'],
    contents: ['타고난 두뇌 유형 + 학습 성향 키워드', '잘 맞는 과목·분야 적성 분석', '최적 공부법 · 집중이 잘 되는 시간대', '기억력 강화 & 슬럼프 극복법', '시험 단계별(D-100~D-7) 전략과 응원'],
  },
};
/* 리포트 상세 — 이메일 없이 PDF 로컬 저장만 제공 */
function ReportDetail({ reportType = 'signature', onSubmit, onBack }) {
  const m = REPORT_META[reportType] || REPORT_META.signature;
  return (
    <div className="py-10 pb-56 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>

      {/* 리포트 실물 미리보기 */}
      <div className="flex justify-center mt-7 mb-8">
        <ReportPreview accent={m.accent} eyebrow={m.eyebrow}/>
      </div>

      <div className="text-center mb-7">
        <Eyebrow className="text-center mb-2" color={m.accent}>{m.eyebrow}</Eyebrow>
        <h1 className="serif text-[26px] font-black text-white leading-snug">{m.title}</h1>
        <p className="text-[13.5px] mt-3 leading-relaxed" style={{ color:'var(--ink-dim)' }}>
          {m.desc[0]}<br/>{m.desc[1]}
        </p>
      </div>

      <GlassCard className="p-6" jewel={m.jewel}>
        <Eyebrow className="mb-5" color={m.accent}>포함 내용</Eyebrow>
        <div className="space-y-3.5">
          {m.contents.map((it, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[12px] mt-0.5" style={{ color:m.accent }}>✦</span>
              <p className="text-[14px]" style={{ color:'var(--ink-dim)', lineHeight:1.5 }}>{it}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="px-5 pt-12 pb-5" style={{ background:'linear-gradient(to top,var(--bg) 64%,transparent)' }}>
          <div className="max-w-xl mx-auto space-y-2">
            <button onClick={() => onSubmit(reportType)}
              className="w-full text-[16px] font-bold transition-all active:scale-[0.98]"
              style={{ minHeight:58, borderRadius:16, color:'#fff', background:m.grad, boxShadow:`0 10px 30px ${m.glow}` }}>
              ✦ 리포트 만들기
            </button>
            <p className="text-[12px] text-center" style={{ color:'var(--ink-faint)' }}>
              완성되면 기기에 PDF로 저장돼요 · 만드는 동안 앱은 계속 쓰셔도 돼요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 리포트 실물 느낌의 미리보기 — 겹친 흰 페이지 + 표지 힌트 */
function ReportPreview({ accent = '#a78bfa', eyebrow = 'SIGNATURE REPORT' }) {
  const gold = OHAENG['토'].print;
  const bars = ['목', '화', '토', '금', '수'].map(k => OHAENG[k].print); // 단일 소스에서 파생
  const pg = (extra) => ({ position:'absolute', inset:0, borderRadius:14, background:'#fdfcfa', border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 12px 30px rgba(0,0,0,0.35)', ...extra });
  return (
    <div className="relative" style={{ width:172, height:208 }}>
      <div style={pg({ transform:'rotate(-7deg) translateX(-10px)', opacity:0.5 })}/>
      <div style={pg({ transform:'rotate(5deg) translateX(8px)', opacity:0.75 })}/>
      <div style={pg({ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 18px' })}>
        <span style={{ fontSize:7, fontWeight:700, letterSpacing:'0.35em', color:accent, textTransform:'uppercase' }}>{eyebrow}</span>
        <span className="serif" style={{ fontSize:30, fontWeight:900, letterSpacing:'0.2em', color:'#211d2b', marginTop:10 }}>天 文</span>
        <span style={{ color:gold, fontSize:11, margin:'8px 0 12px' }}>✦</span>
        <div style={{ width:'70%', height:3, borderRadius:2, background:'rgba(0,0,0,0.09)', marginBottom:5 }}/>
        <div style={{ width:'54%', height:3, borderRadius:2, background:'rgba(0,0,0,0.07)' }}/>
        <div className="flex items-end gap-1.5" style={{ marginTop:16, height:22 }}>
          {bars.map((c, i) => <span key={i} style={{ width:6, height:[20,12,22,9,15][i], background:c, borderRadius:2, display:'block' }}/>)}
        </div>
      </div>
      <div className="absolute" style={{ bottom:-10, right:-8, background:accent, color:'#fff', fontSize:11.5, fontWeight:700, padding:'5px 11px', borderRadius:999, boxShadow:`0 8px 20px ${accent}66` }}>✦ PDF 리포트</div>
    </div>
  );
}

/* ================================================================
   REPORT SELECT — 프리미엄 리포트 2종 택1 (인생 시그니처 / 학습 상세)
================================================================ */
function ReportSelect({ nickname, birth2, nickname2, setNickname2, setBirth2, onBack, onPick, onMakeGunghap }) {
  const [gunghapOpen, setGunghapOpen] = useState(false);
  const [localNick2, setLocalNick2] = useState(nickname2 || '');
  const [localBirth2, setLocalBirth2] = useState(birth2 || { y:'', m:'1', d:'1', h:'모름', min:'0' });
  const [err2, setErr2] = useState('');
  // 보관소 통합 — 제작된 리포트는 같은 화면에서 '다시 다운로드'/삭제
  const [saved, setSaved] = useState([]); // [{type, name}]
  const [busy, setBusy] = useState(null);
  const refreshSaved = () => listSavedReports().then(setSaved).catch(() => {});
  useEffect(() => { refreshSaved(); }, []);
  const savedFor = (type) => saved.filter(s => s.type === type);
  const reDownload = async (type, name) => {
    const id = name ? `${type}:${name}` : type; setBusy(id);
    try {
      const blob = await loadPdf(type, name);
      if (!blob) { refreshSaved(); return; }
      const who = type === 'gunghap' && name ? `_${name}` : '';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = VAULT_META[type].filename((nickname || '천문') + who); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      playTap(); vibrate(12);
    } finally { setBusy(null); }
  };
  const removeSaved = async (type, name) => {
    await clearPdf(type, name); playDelete(); vibrate(8); refreshSaved();
  };

  const cards = [
    {
      type: 'signature', icon: <Crown size={26}/>, accent: '#C8A876',
      title: '인생 시그니처 리포트',
      tags: ['사주 명식', '성격·재능', '재물·애정', '직업·건강', '월별 12개월', '인생 흐름'],
      border: 'rgba(200,168,118,0.34)',
      desc: '태어난 순간의 하늘을 완전히 펼쳐 인생 전반을 한 권에 담아드려요',
    },
    {
      type: 'study', icon: <GraduationCap size={26}/>, accent: '#10b981',
      title: '학습 상세 리포트',
      tags: ['두뇌 유형', '과목 적성', '공부법', '집중 시간대', '슬럼프 극복', '시험 단계별'],
      border: 'rgba(16,185,129,0.34)',
      desc: '사주 기반으로 나만의 학습 기질과 맞춤 전략을 알아보세요',
    },
    {
      type: 'gunghap', icon: <Heart size={26}/>, accent: '#fb7185',
      title: '궁합 심층 리포트',
      tags: ['관계 본질', '애정 역학', '소통 방식', '갈등 해소', '미래 전망', '개인 조언'],
      border: 'rgba(251,113,133,0.34)',
      desc: '두 사람의 사주로 인연의 깊이와 함께할 미래를 한 권에 담아드려요',
    },
  ];

  const submitGunghap = () => {
    if (!localNick2.trim()) { setErr2('상대방 이름을 입력해 주세요.'); return; }
    const y = parseInt(localBirth2.y);
    if (!localBirth2.y || String(localBirth2.y).length < 4 || y < 1900 || y > new Date().getFullYear()) {
      setErr2('상대방 출생 연도를 정확히 입력해 주세요.'); return;
    }
    setNickname2(localNick2);
    setBirth2(localBirth2);
    setErr2('');
    // 입력=생성 확정. ReportDetail 미리보기를 거치지 않고 바로 궁합 리포트 생성.
    // (상대방 정보를 직접 넘겨 state 비동기 반영 문제 회피)
    onMakeGunghap(localBirth2, localNick2);
  };

  return (
    <div className="py-10 space-y-5 pb-24 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>

      <header className="space-y-2.5">
        <div className="w-12 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#C8A876,#a78bfa)' }}/>
        <h2 className="serif font-bold text-white leading-snug" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>프리미엄 리포트</h2>
        <p className="text-[14px]" style={{ color:'var(--ink-dim)', lineHeight:1.6 }}>
          {nickname || '사용자'}님의 사주를 AI로 깊이 분석해 PDF 한 권으로 정리해 드려요.
        </p>
      </header>

      {cards.map((c, ci) => (
        <div key={c.type} className="animate-fade-up" style={{ animationDelay:`${ci * 70}ms` }}>
          <button className="w-full block group active:scale-[0.985] transition-transform"
            onClick={() => c.type === 'gunghap' ? setGunghapOpen(o => !o) : onPick(c.type)}>
            <div className="glass-strong rounded-[24px] relative overflow-hidden text-left"
              style={{ border:`1.5px solid ${gunghapOpen && c.type === 'gunghap' ? c.accent + '80' : c.border}`, boxShadow:`0 14px 48px ${c.accent}20` }}>
              <div className="absolute pointer-events-none" style={{ right:-24, top:-24, width:160, height:160, borderRadius:'50%', background:`${c.accent}20`, filter:'blur(52px)' }}/>
              <div className="relative p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                    style={{ width:58, height:58, background:`${c.accent}1e`, border:`1.5px solid ${c.accent}50`, boxShadow:`0 6px 24px ${c.accent}30` }}>
                    <span style={{ color:c.accent }}>{c.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[18px] font-bold leading-tight" style={{ color:'var(--ink)' }}>{c.title}</p>
                    <p className="text-[13px] mt-1.5" style={{ color:'var(--ink-dim)', lineHeight:1.55 }}>{c.desc}</p>
                  </div>
                  {c.type === 'gunghap'
                    ? <ChevronDown size={20} style={{ color:`${c.accent}99`, flexShrink:0, marginTop:4, transform: gunghapOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
                    : <ChevronRight size={20} style={{ color:`${c.accent}99`, flexShrink:0, marginTop:4 }} className="group-hover:translate-x-1 transition-transform"/>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((tag, i) => (
                    <span key={i} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ color:c.accent, background:`${c.accent}16`, border:`1px solid ${c.accent}35` }}>{tag}</span>
                  ))}
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold rounded-xl px-3 py-2"
                  style={{ color:c.accent, background:`${c.accent}1a`, border:`1px solid ${c.accent}38` }}>
                  ✦ PDF로 기기에 저장
                </div>
              </div>
            </div>
          </button>

          {/* 궁합 — 상대방 입력 패널 (인라인 펼침) */}
          {c.type === 'gunghap' && gunghapOpen && (
            <div className="mt-2 glass rounded-[20px] p-5 animate-fade-up"
              style={{ border:'1.5px solid rgba(251,113,133,0.30)', boxShadow:'0 8px 28px rgba(251,113,133,0.12)' }}>
              <p className="text-[13px] font-bold mb-4" style={{ color:'#fb7185' }}>상대방 정보 입력</p>
              {err2 && <p className="text-[12px] mb-3 px-3 py-2 rounded-xl" style={{ color:'#fb7185', background:'rgba(251,113,133,0.10)', border:'1px solid rgba(251,113,133,0.25)' }}>{err2}</p>}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color:'var(--ink-dim)' }}>이름 또는 별명</p>
                  <input value={localNick2} onChange={e => setLocalNick2(e.target.value)}
                    placeholder="상대방 이름"
                    className="w-full rounded-xl px-4 text-[14px] font-medium outline-none"
                    style={{ height:44, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', color:'var(--ink)' }}/>
                </div>
                <BirthInput birthData={localBirth2} setBirthData={setLocalBirth2} label="상대방 생년월일"/>
              </div>
              <button onClick={submitGunghap}
                className="w-full mt-4 font-bold text-[15px] rounded-2xl transition-all active:scale-[0.98]"
                style={{ minHeight:50, color:'#fff', background:'linear-gradient(135deg,#f43f5e,#fb7185)', boxShadow:'0 8px 24px rgba(251,113,133,0.35)' }}>
                ✦ 궁합 리포트 만들기
              </button>
            </div>
          )}
          {/* 제작된 리포트 — 같은 화면에서 다시 다운로드/삭제(보관소 통합). 궁합은 상대별 여러 개. */}
          {savedFor(c.type).length > 0 && (
            <div className="mt-2 space-y-1.5">
              {savedFor(c.type).map((s) => (
                <div key={s.name || s.type} className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${c.accent}33` }}>
                  <span style={{ fontSize:14, color:c.accent }}>✓</span>
                  <span className="flex-1 text-[12.5px] font-semibold truncate" style={{ color:'var(--ink-dim)' }}>
                    제작됨{s.name ? ` · ${s.name}` : ''}
                  </span>
                  <button onClick={() => reDownload(s.type, s.name)} disabled={!!busy}
                    className="text-[12px] font-bold rounded-lg active:scale-95 transition-transform flex-shrink-0"
                    style={{ minHeight:34, padding:'0 12px', color:c.accent, background:`${c.accent}1a`, border:`1px solid ${c.accent}45` }}>
                    다시 다운로드
                  </button>
                  <button onClick={() => removeSaved(s.type, s.name)} aria-label="삭제"
                    className="text-[12px] font-bold rounded-lg active:scale-95 transition-transform flex-shrink-0"
                    style={{ minHeight:34, padding:'0 10px', color:'rgba(251,113,133,0.8)', background:'rgba(251,113,133,0.06)', border:'1px solid rgba(251,113,133,0.2)' }}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <p className="text-[12px] text-center pt-1" style={{ color:'var(--ink-faint)', lineHeight:1.8 }}>
        AI가 사주를 분석해 PDF로 만들어드려요<br/>완성되면 기기에 저장 · 위에서 다시 받을 수 있어요
      </p>
    </div>
  );
}

/* ================================================================
   REPORT VAULT — 저장된 리포트 보관함 (3종 독립 저장)
================================================================ */
const VAULT_META = {
  signature: {
    label: '인생 시그니처', eyebrow: 'SIGNATURE REPORT',
    accent: '#C8A876', glow: 'rgba(200,168,118,0.22)',
    border: 'rgba(200,168,118,0.35)', icon: <Crown size={22}/>,
    filename: (name) => `천문_시그니처리포트_${name}.pdf`,
  },
  study: {
    label: '학습 상세', eyebrow: 'STUDY REPORT',
    accent: '#10b981', glow: 'rgba(16,185,129,0.22)',
    border: 'rgba(16,185,129,0.35)', icon: <GraduationCap size={22}/>,
    filename: (name) => `천문_학습상세리포트_${name}.pdf`,
  },
  gunghap: {
    label: '궁합 심층', eyebrow: 'LOVE REPORT',
    accent: '#fb7185', glow: 'rgba(251,113,133,0.22)',
    border: 'rgba(251,113,133,0.35)', icon: <Heart size={22}/>,
    filename: (name) => `천문_궁합심층리포트_${name}.pdf`,
  },
};


/* ================================================================
   천문 식탁 — 음식 성분 확인 (Gemini AI)
================================================================ */
const FOOD_CAT = {
  A_SUPPLEMENT: { label: '건강기능식품 · 인증', color: '#34d399', icon: '✓' },
  B_HERBAL: { label: '한방 식품', color: '#a78bfa', icon: '✦' },
  C_GENERAL: { label: '일반식품', color: '#38bdf8', icon: '·' },
  D_PSEUDO: { label: '미검증 · 유사과학', color: '#fb7185', icon: '!' },
};
/* 카카오 인앱 지도 — 추천 식당을 핀으로 표시(JS 키 있을 때만). 실패 시 호출부가 리스트만 보여줌. */
function RestaurantMap({ places, accent = '#34d399' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!places || !places.length) return;
    let cancelled = false;
    loadKakaoMaps().then((kakao) => {
      if (cancelled || !ref.current) return;
      const pts = places.filter(p => p.x && p.y).map(p => ({ p, ll: new kakao.maps.LatLng(Number(p.y), Number(p.x)) }));
      if (!pts.length) return;
      const map = new kakao.maps.Map(ref.current, { center: pts[0].ll, level: 5 });
      const bounds = new kakao.maps.LatLngBounds();
      pts.forEach(({ p, ll }, i) => {
        new kakao.maps.Marker({ position: ll, map });
        bounds.extend(ll);
        const ov = new kakao.maps.CustomOverlay({ position: ll, yAnchor: 2.0,
          content: `<div style="background:#15122e;color:#fff;border:1px solid ${accent};border-radius:8px;padding:2px 7px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.45)">${i + 1}. ${p.name}</div>` });
        ov.setMap(map);
      });
      if (pts.length > 1) map.setBounds(bounds);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [places]);
  return <div ref={ref} className="w-full rounded-2xl overflow-hidden" style={{ height: 200, border: `1px solid ${accent}33` }} aria-label="주변 식당 지도"/>;
}

function FoodTable({ nickname, birth, onBack }) {
  const EM = '#34d399';
  const CARD_W = 320;       // 카드·검색창 공통 폭 — 검색 입력+버튼이 위 카드와 같은 가로 폭을 유지
  const SHOW_SEARCH = true; // 음식 직접 검색 활성화
  const [uid, setUid] = useState(null);
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false); // 공개 의식: 카드 뒤집힘 여부
  const [analyzing, setAnalyzing] = useState(false);
  const [anErr, setAnErr] = useState('');
  const [loadErr, setLoadErr] = useState(false); // 식탁 백엔드 연결 실패 여부
  const [places, setPlaces] = useState(null);    // 카카오 주변 식당(오행 매칭)
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesErr, setPlacesErr] = useState('');

  // 내 기운(오행 분포) — '오늘의 기운' 진단 비주얼/문구의 근거
  const saju = useMemo(() => { try { return calculateSaju(birth); } catch (e) { return null; } }, [birth]);
  // 동반자 톤 — 시간대 인사로 '매일 밤 곁의 식탁' 느낌
  const greet = (() => { const h = new Date().getHours(); return h < 6 ? '고요한 밤이에요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '나른한 오후예요' : '편안한 저녁이에요'; })();

  useEffect(() => {
    playOpen(); // 식탁에 들어설 때 부드러운 환영음(장면 전환 단서)
    if (!SHOW_SEARCH) return;
    let alive = true;
    ensureFoodUser(nickname, birth)
      .then(id => { if (alive) { setUid(id); setLoadErr(false); } })
      .catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, []);

  const doSearch = async () => {
    const query = q.trim();
    if (!query) return;
    if (!hasApiKey()) { setAnErr('AI 연결이 필요해요. 잠시 후 다시 시도해 주세요.'); return; }
    setAnalyzing(true); setAnErr(''); setResult(null); setRevealed(false); setPlaces(null); setPlacesErr(''); playClick(); vibrate(10);
    try {
      // 백엔드 DB → 없거나 느리면 Gemini 직접 분석으로 폴백 (4초 타임아웃)
      let res;
      if (uid && !loadErr) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000); // 4초 내 응답 없으면 폴백
          res = await Promise.race([
            analyzeFood(uid, query),
            new Promise((_, rej) => ctrl.signal.addEventListener('abort', () => rej(new Error('timeout')))),
          ]);
          clearTimeout(timer);
        } catch (_) {
          res = null; // 타임아웃/실패 → Gemini 직접 경로
        }
      }
      if (!res) {
        res = await analyzeFoodLocal(query, saju);
      }
      setResult(res); vibrate(12);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setAnErr('분석에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setAnalyzing(false); }
  };

  // 검색 결과를 닫고 '오늘의 추천'으로 돌아가기
  const askAnother = () => { setResult(null); setRevealed(false); setQ(''); setAnErr(''); playTap(); vibrate(8); };

  // 카카오 주변 식당 추천 — 위치 → 주변 음식점 → 오늘 부족한 기운에 맞는 업종 우선.
  // 키 없거나 위치 불가면 기존 지도 검색 링크로 폴백.
  const findNearby = () => {
    playClick(); vibrate(10);
    const food = shown?.foodName || '';
    if (!hasPlacesKey() || !navigator.geolocation) { openNearbyRestaurants(food); return; }
    // 메인 메뉴 + 대안 3개를 키워드로 주변 식당 검색
    const dishes = [food, ...(shown?.alternatives || [])].filter(Boolean);
    setPlacesLoading(true); setPlacesErr(''); setPlaces(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await searchRestaurantsByDishes(dishes, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (list.length) { setPlaces(list); playSuccess(); vibrate([18, 30]); }
          else setPlacesErr('주변에 해당 메뉴 식당이 안 보여요. 조금 멀리서 다시 시도해 보세요.');
        } catch (e) { setPlacesErr(`주변 식당을 불러오지 못했어요 — ${e.message || '오류'}`); }
        finally { setPlacesLoading(false); }
      },
      () => { setPlacesLoading(false); setPlacesErr('위치 권한을 허용하면 주변 식당을 찾아드려요.'); },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  // 오늘의 한 그릇 — 검색 결과 > AI 추천 > 즉시 로컬 추천(폴백) 순. AI는 진입 시 백그라운드로 받아둔다.
  const todayReco = useMemo(() => (saju ? recommendTodayFood(saju) : null), [saju]);
  const shown = result || todayReco;
  const isReco = !result;
  const cat = shown ? (FOOD_CAT[shown.category] || FOOD_CAT.C_GENERAL) : null;
  const danger = shown?.category === 'D_PSEUDO';

  // 메뉴가 바뀌면 이전 주변 식당 결과는 비운다(사진 연동 → 이모지 연동으로 전환)
  useEffect(() => {
    setPlaces(null); setPlacesErr('');
  }, [shown?.foodName]);

  // 음식별 대표 이모지 — 추천 데이터(emoji)를 우선, 없으면 이름 키워드로 폴백(결정적·매번 동일)
  const foodEmoji = shown ? (shown.emoji || pickFoodEmoji(shown.foodName)) : '🍽️';

  // 공개될 카드 — 사진 대신 큼직한 이모지 + 금빛 후광으로 따뜻한 식탁 분위기
  const foodCard = shown && (
    <div className="w-full h-full rounded-[24px] overflow-hidden relative flex flex-col items-center justify-center text-center px-6"
      style={{ background: `linear-gradient(160deg, #20140a 0%, #140d07 55%, #0e0b08 100%)`,
        border: `1px solid ${danger ? 'rgba(251,113,133,0.4)' : 'rgba(240,180,41,0.28)'}` }}>
      {/* 따뜻한 빛 — 수증기처럼 퍼지는 중앙 글로우 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:`radial-gradient(ellipse 72% 56% at 50% 42%, rgba(240,180,41,0.20) 0%, transparent 70%)`}}/>
      {/* 회전하는 금빛 후광 — 이모지 뒤 화려한 빛 */}
      <div className="absolute pointer-events-none" style={{ width:'80%', aspectRatio:'1/1', borderRadius:'50%',
        background:'conic-gradient(from 0deg, transparent, rgba(240,180,41,0.18), transparent 40%, rgba(255,221,148,0.13), transparent 70%, rgba(240,180,41,0.18), transparent)',
        animation:'halo-spin 18s linear infinite' }}/>
      {/* 식재료 결 텍스처 — 가로 얇은 줄 */}
      {[20,35,52,68,83].map(y => (
        <div key={y} className="absolute left-0 right-0 pointer-events-none"
          style={{ top:`${y}%`, height:1, background:'rgba(240,180,41,0.04)' }}/>
      ))}
      <div className="relative z-10 flex flex-col items-center">
        <span className="mb-3" style={{ fontSize:76, filter:'drop-shadow(0 6px 20px rgba(240,180,41,0.45))', animation:'float-y 3.4s ease-in-out infinite' }}>{foodEmoji}</span>
        <p className="serif text-[27px] font-black leading-tight break-keep" style={{ color:'#fff5e4' }}>{shown.foodName}</p>
        {/* 성질 태그 */}
        {shown.nature && (
          <span className="mt-2.5 text-[12px] font-medium px-3 py-1 rounded-full"
            style={{ color:'rgba(240,180,41,0.95)', background:'rgba(240,180,41,0.16)', border:'1px solid rgba(240,180,41,0.34)' }}>
            {shown.nature}
          </span>
        )}
        {/* 적합도 */}
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="serif text-[28px] font-black tabular-nums" style={{ color: danger ? '#fb7185' : 'rgba(240,180,41,0.98)' }}>{shown.suitabilityScore}%</span>
          <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.6)' }}>기운 적합</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-10 space-y-5 pb-24 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0"
            style={{ width:48, height:48, borderRadius:16, background:'rgba(240,180,41,0.12)', border:'1px solid rgba(240,180,41,0.28)' }}>
            <span style={{ fontSize:26 }}>🍽️</span>
          </div>
          <div className="min-w-0">
            <h2 className="serif font-bold text-white leading-tight" style={{ fontSize:'clamp(1.4rem,5.5vw,1.9rem)' }}>천문 식탁</h2>
          </div>
        </div>
      </header>

      {anErr && <ErrorBox msg={anErr}/>}
      {!anErr && loadErr && <ErrorBox msg="지금 천문 식탁 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요 🙏"/>}

      {/* 오늘의 한 그릇 — 단일 추천 카드(즉시·네트워크 0) + 공개 의식 */}
      {shown && (
        <section className="space-y-3">
          <div className="flex items-center justify-between mx-auto w-full px-1" style={{ maxWidth: CARD_W }}>
            <Eyebrow color={EM}>{isReco ? '오늘의 추천 메뉴' : '검색 결과'}</Eyebrow>
            {isReco && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>매일 바뀌어요</span>}
          </div>

          <div className="mx-auto w-full" style={{ maxWidth: CARD_W }}>
            {!revealed ? (
              /* 뚜껑 덮인 그릇 — 탭하면 열린다 */
              <button onClick={() => { setRevealed(true); playReveal(); vibrate([28,50,80]); }}
                className="w-full active:scale-[0.98] transition-transform"
                aria-label="오늘의 한 그릇 열기">
                <div className="w-full rounded-[24px] flex flex-col items-center justify-center gap-4 relative overflow-hidden"
                  style={{ aspectRatio:'1/1', background:'linear-gradient(160deg,#1a120a,#0e0b08)',
                    border:'1px solid rgba(240,180,41,0.22)', boxShadow:'0 16px 48px rgba(0,0,0,0.5)' }}>
                  {/* 따뜻한 빛 */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background:'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(240,180,41,0.12) 0%, transparent 70%)'}}/>
                  {/* 뚜껑 그릇 아이콘 */}
                  <span className="text-[72px]" style={{ filter:'drop-shadow(0 6px 18px rgba(240,180,41,0.35))',
                    animation:'float-y 3s ease-in-out infinite' }}>🍲</span>
                  <div className="flex flex-col items-center gap-1">
                    {!isReco && <span className="text-[14px] font-bold" style={{ color:'rgba(240,180,41,0.85)' }}>&ldquo;{shown.foodName}&rdquo;</span>}
                    <span className="text-[12.5px] font-semibold" style={{ color:'rgba(240,180,41,0.8)' }}>뚜껑을 열어보세요</span>
                  </div>
                </div>
              </button>
            ) : (
              /* 공개된 카드 — 안개 걷히듯 */
              <div className="w-full rounded-[24px] overflow-hidden animate-scale-in" style={{ aspectRatio:'1/1' }}>
                {foodCard}
              </div>
            )}
          </div>

          {/* 공개 후 — 설명/추천/단점 + 액션(progressive disclosure) */}
          {revealed && (
            <div className="rounded-2xl p-5 animate-fade-up mx-auto w-full" style={{
              maxWidth: CARD_W,
              background:'linear-gradient(160deg, rgba(30,20,10,0.9), rgba(18,14,8,0.95))',
              border:`1px solid rgba(240,180,41,0.18)`,
              boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
              {!isReco && <div className="mb-2.5"><Eyebrow color={cat.color}>{cat.icon} {cat.label}</Eyebrow></div>}
              {/* 사주 연결 풀이 — 왜 이 메뉴인지(부족한 오행 보강) */}
              {shown.focusReason && (
                <div className="mb-3 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{ background:'rgba(240,180,41,0.10)', border:'1px solid rgba(240,180,41,0.26)' }}>
                  <span className="text-[14px] flex-shrink-0">🧭</span>
                  <p className="text-[12.5px] font-semibold" style={{ color:'rgba(240,180,41,0.96)', lineHeight:1.55 }}>{shown.focusReason}</p>
                </div>
              )}
              {shown.summary && <p className="serif text-[14.5px]" style={{ color:'rgba(255,245,228,0.9)', lineHeight:1.7 }}>{shown.summary}</p>}
              {(shown.nutrition || shown.tip) && (
                <div className="mt-4 space-y-2">
                  {shown.nutrition && (
                    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.22)' }}>
                      <span className="text-[13px] font-bold flex-shrink-0" style={{ color: EM }}>영양 포인트</span>
                      <p className="text-[13px]" style={{ color: 'var(--ink-dim)', lineHeight: 1.55 }}>{shown.nutrition}</p>
                    </div>
                  )}
                  {shown.tip && (
                    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.22)' }}>
                      <span className="text-[13px] font-bold flex-shrink-0" style={{ color: '#f0b429' }}>이렇게 드세요</span>
                      <p className="text-[13px]" style={{ color: 'var(--ink-dim)', lineHeight: 1.55 }}>{shown.tip}</p>
                    </div>
                  )}
                </div>
              )}
              {shown.warning && (
                <div className="mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px]" style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'rgba(251,113,133,0.95)', lineHeight: 1.55 }}>{shown.warning}</div>
              )}
              {shown.functionalClaims?.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <p className="text-[11px] font-bold mb-1.5" style={{ color: cat.color }}>인증 기능성</p>
                  {shown.functionalClaims.map((c, i) => <p key={i} className="text-[12.5px]" style={{ color: 'var(--ink-dim)' }}>· {c}</p>)}
                </div>
              )}
              {/* 오늘의 추천 — 음식의 기대 효과를 타원형 칩으로 정리(대안 메뉴 칩과 동일 스타일) */}
              {isReco && shown.benefits?.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <p className="text-[11px] font-bold mb-2" style={{ color: EM }}>이런 점이 좋아요</p>
                  <div className="flex flex-wrap gap-2">
                    {shown.benefits.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full break-keep"
                        style={{ color: 'var(--ink)', background: `${EM}12`, border: `1px solid ${EM}33` }}>
                        <span style={{ color: EM, fontSize: 10 }}>✦</span>{b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* 액션 — 주변 식당(주행동) + 공유 + (검색결과면) 오늘의 추천 복귀 */}
              <div className="mt-4 pt-4 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <button onClick={findNearby} disabled={placesLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] text-white active:scale-[0.98] transition-transform"
                  style={{ minHeight: 52, background: `linear-gradient(135deg, ${cat.color}, #10b981)`, boxShadow: `0 8px 24px ${cat.color}33` }}>
                  {placesLoading
                    ? <><div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }}/> 주변 찾는 중…</>
                    : <><MapPin size={17}/> 주변 식당 추천받기</>}
                </button>
                {!isReco && (
                  <button onClick={askAnother} className="w-full flex items-center justify-center rounded-2xl font-bold text-[14px] active:scale-[0.98] transition-transform"
                    style={{ minHeight: 48, color: EM, background: `${EM}14`, border: `1px solid ${EM}40` }}>
                    오늘의 추천
                  </button>
                )}
              </div>
              {/* 주변 식당(카카오) — 위치 기반 오행 매칭 결과 */}
              {placesErr && <p className="text-[12px] text-center mt-3" style={{ color: 'rgba(251,113,133,0.85)' }}>{placesErr}</p>}
              {places && places.length > 0 && (
                <div className="mt-3.5 pt-3.5 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <p className="text-[11px] font-bold" style={{ color: 'var(--ink-faint)' }}>{shown.foodName}을(를) 파는 주변 식당</p>
                  {hasKakaoJsKey() && <RestaurantMap places={places} accent={cat.color}/>}
                  {places.map((p, i) => (
                    /* 카드 전체가 카카오 장소 페이지 링크 — 거기서 길찾기·전화·리뷰를 네이티브로 */
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 active:scale-[0.99] transition-transform"
                      style={{ background: i === 0 ? `${cat.color}14` : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? cat.color + '40' : 'rgba(255,255,255,0.08)'}` }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate" style={{ color: 'var(--ink)' }}>{i + 1}. {p.name}</p>
                        <p className="text-[12px] truncate" style={{ color: 'var(--ink-dim)' }}><span style={{ color: cat.color }}>{p.dish}</span> · {p.catShort} · {p.distance}m</p>
                      </div>
                      <span className="flex items-center gap-1 flex-shrink-0 text-[12px] font-bold" style={{ color: cat.color }}>
                        지도 <ChevronRight size={14}/>
                      </span>
                    </a>
                  ))}
                  <p className="text-[11px] text-center pt-1" style={{ color: 'var(--ink-faint)' }}>식당을 누르면 카카오맵에서 위치·길찾기를 볼 수 있어요</p>
                </div>
              )}
              {/* 대안 메뉴 3개 — 추천이 맘에 안 들 때(칩으로 스캔하기 쉽게) */}
              {isReco && shown.alternatives?.length > 0 && (
                <div className="mt-3.5 pt-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--ink-faint)' }}>이런 메뉴도 잘 맞아요</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {shown.alternatives.map((alt, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold px-3 py-1.5 rounded-full break-keep"
                        style={{ color: 'var(--ink)', background: `${EM}12`, border: `1px solid ${EM}33` }}>
                        <span style={{ color: EM, fontSize: 10 }}>✦</span>{alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 다른 음식 검색 — 현재 숨김. 코드 보존(추후 SHOW_SEARCH=true 로 되살림) */}
      {SHOW_SEARCH && (
        <section className="space-y-2.5 pt-1 mx-auto w-full" style={{ maxWidth: CARD_W }}>
          <Eyebrow color="rgba(52,211,153,0.85)" className="ml-1">식품 검색</Eyebrow>
          <div className="flex gap-2 w-full">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="식품명 검색 (예: 홍삼)" aria-label="식품 검색"
              className="flex-1 min-w-0 text-[15px] outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,211,153,0.40)', borderRadius: 14, padding: '13px 16px', minHeight: 50, color: 'var(--ink)' }}/>
            <button onClick={doSearch} disabled={!q.trim() || analyzing} aria-label="분석"
              className="flex items-center justify-center rounded-2xl active:scale-95 transition-transform flex-shrink-0"
              style={{ width: 54, minHeight: 50, background: q.trim() ? `linear-gradient(135deg,#059669,${EM})` : 'rgba(255,255,255,0.05)', color: '#fff' }}>
              {analyzing ? <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}/> : <Search size={20}/>}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ================================================================
   오늘의 학습나침반 — 간단한 학습 분석 (1회 API 호출)
================================================================ */
function StudyCompass({ nickname, ilju, onBack, onReport }) {
  const EM = '#10b981';
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('cm_study_compass');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.date === todayKey()) return p;
      }
    } catch (_) {}
    return null;
  });
  const [err, setErr] = useState('');

  const fetchCompass = async () => {
    if (!hasApiKey()) { setErr('지금 분석을 불러올 수 없어요. 잠시 후 다시 시도해 주세요 🙏'); return; }
    setLoading(true); setErr('');
    playClick();
    const userName = nickname || '사용자';
    const mainOhaeng = OHAENG[getOhaeng(ilju)]?.plain || '흙';
    const today = todayStr();
    const WARM = '톤 규칙: 친근하고 따뜻하게. 한자 절대 금지, 순한글. 문장 앞 기호 금지.';
    try {
      const result = await callGeminiRetry({
        system: `당신은 ${userName}님의 편에서 응원하는 따뜻한 명리학자 '천문'입니다. 일주 ${ilju}(본명오행 ${mainOhaeng}) 기반으로 오늘(${today}) 학습 에너지를 간단히 분석합니다.\n${WARM}\n필드: brainType(오늘의 두뇌 유형 한 단어, 예: 집중형·탐구형·창의형), todayEnergy(오늘 학습 에너지 3문장), bestTime(오늘 공부하기 좋은 시간대 1~2문장), studyTip(오늘 가장 효과적인 공부법 3문장), subjectTip(오늘 집중하면 좋은 과목이나 분야 1~2문장), avoidTip(오늘 공부에 도움이 되는 작은 습관 1문장, 반드시 '~하면 좋아요'처럼 긍정형으로), encouragement(${userName}님을 위한 오늘의 응원 한마디).`,
        user: `${userName}님, 일주:${ilju}. 오늘(${today}) 학습나침반 분석 요청.`,
        schema: {
          type: 'OBJECT',
          properties: { brainType: { type: 'STRING' }, todayEnergy: { type: 'STRING' }, bestTime: { type: 'STRING' }, studyTip: { type: 'STRING' }, subjectTip: { type: 'STRING' }, avoidTip: { type: 'STRING' }, encouragement: { type: 'STRING' } },
          required: ['brainType', 'todayEnergy', 'bestTime', 'studyTip', 'subjectTip', 'avoidTip', 'encouragement'],
        },
      }, 3);
      const save = { ...result, date: todayKey() };
      localStorage.setItem('cm_study_compass', JSON.stringify(save));
      setData(save);
      playSuccess(); vibrate([20, 38, 60]);
    } catch (_) {
      setErr('분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally { setLoading(false); }
  };

  return (
    <div className="py-10 space-y-5 pb-16 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <header className="space-y-2">
        <div className="w-12 h-[3px] rounded-full" style={{ background:`linear-gradient(to right, ${EM}, #818cf8)` }}/>
        <h2 className="serif font-bold text-white leading-snug" style={{ fontSize:'clamp(1.6rem,7vw,2.2rem)' }}>오늘의 학습나침반</h2>
        <p className="text-[14px]" style={{ color:'rgba(255,255,255,0.52)' }}>
          {nickname || '사용자'}님의 오늘 두뇌 에너지 분석
        </p>
      </header>

      {err && <ErrorBox msg={err}/>}

      {!data && !loading && (
        <div className="glass-strong rounded-3xl overflow-hidden relative" style={{ border:`1.5px solid rgba(16,185,129,0.3)` }}>
          {/* 배경 글로우 */}
          <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 65%)' }}/>
          <div className="relative p-8 text-center space-y-5">
            {/* 나침반 아이콘 — 더 크고 임팩트 있게 */}
            <div className="flex justify-center">
              <div className="relative" style={{ width:88, height:88 }}>
                <div className="absolute inset-0 rounded-full" style={{ background:`radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)`, animation:'glow-pulse 3s ease-in-out infinite' }}/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontSize:48, filter:`drop-shadow(0 0 16px rgba(16,185,129,0.6))` }}>🧭</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[18px] font-bold text-white">오늘의 학습 에너지를 분석할까요?</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>
                타고난 기운 <span style={{ color:EM, fontWeight:700 }}>{ilju}</span>(일주)을 바탕으로<br/>오늘의 두뇌 상태와 공부법을 알려드려요
              </p>
            </div>
            {/* 포함 내용 미리보기 */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {['두뇌 유형', '학습 에너지', '최적 시간', '오늘 공부법', '집중 과목'].map((t,i) => (
                <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ color:EM, background:'rgba(16,185,129,0.1)', border:`1px solid rgba(16,185,129,0.25)` }}>
                  {t}
                </span>
              ))}
            </div>
            <button onClick={fetchCompass}
              className="w-full text-[16px] font-bold rounded-2xl text-white transition-all active:scale-[0.98] btn-shine"
              style={{ minHeight:58, background:`linear-gradient(135deg, #059669, ${EM})`,
                boxShadow:`0 12px 32px rgba(16,185,129,0.35)`, letterSpacing:'-0.01em' }}>
              ✦ 학습나침반 열기
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-6 py-20 animate-fade-in">
          <div className="relative" style={{ width: 72, height: 72 }}>
            <div className="absolute inset-0 rounded-full animate-spin" style={{ border:`3px solid rgba(16,185,129,0.12)`, borderTopColor:EM }}/>
            <div className="absolute inset-3 rounded-full animate-spin" style={{ border:`2px solid rgba(16,185,129,0.08)`, borderTopColor:'rgba(16,185,129,0.5)', animationDirection:'reverse', animationDuration:'1.4s' }}/>
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ fontSize: 22 }}>🧭</span>
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[16px] font-semibold text-white">두뇌 에너지 분석 중</p>
            <p className="text-[13px]" style={{ color:'var(--ink-faint)' }}>타고난 기운을 바탕으로 오늘의 학습 상태를 읽고 있어요</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4 animate-fade-up">
          {/* 오늘의 두뇌 유형 배지 — 히어로 카드 */}
          <div className="glass-strong rounded-3xl p-7 text-center relative overflow-hidden"
            style={{ border:`1.5px solid rgba(16,185,129,0.35)`, boxShadow:`0 12px 48px rgba(16,185,129,0.15)` }}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-28 rounded-full pointer-events-none"
              style={{ background:'rgba(16,185,129,0.18)', filter:'blur(40px)' }}/>
            <div className="absolute -bottom-10 right-0 w-36 h-36 rounded-full pointer-events-none"
              style={{ background:'rgba(129,140,248,0.10)', filter:'blur(36px)' }}/>
            <span className="relative text-[40px] block mb-3">🧠</span>
            <Eyebrow className="text-center" color="rgba(16,185,129,0.8)">오늘의 두뇌 유형</Eyebrow>
            <p className="serif font-black mt-2 relative" style={{ fontSize:'2rem', color:'#34d399',
              textShadow:'0 0 30px rgba(16,185,129,0.4)', letterSpacing:'-0.02em' }}>
              {data.brainType}
            </p>
            <p className="text-[12.5px] mt-2 relative" style={{ color:'var(--ink-faint)' }}>{todayStr()}</p>
          </div>

          {/* 오늘 학습 에너지 */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span style={{ fontSize:18 }}>⚡</span>
              <p className="text-[15px] font-bold text-white">오늘의 학습 에너지</p>
            </div>
            {(data.todayEnergy || '').split(/\n+/).filter(Boolean).map((l, i) => (
              <p key={i} className="text-[14px] leading-relaxed mb-1.5" style={{ color:'var(--ink-dim)' }}>{l}</p>
            ))}
          </div>

          {/* 공부하기 좋은 시간대 */}
          <div className="glass rounded-2xl p-5" style={{ borderLeft:`3px solid rgba(16,185,129,0.5)` }}>
            <div className="flex items-center gap-2.5 mb-2">
              <span style={{ fontSize:16 }}>🕐</span>
              <p className="text-[14px] font-bold text-white">공부하기 좋은 시간</p>
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{data.bestTime}</p>
          </div>

          {/* 오늘의 공부법 */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span style={{ fontSize:18 }}>📖</span>
              <p className="text-[15px] font-bold text-white">오늘의 공부법</p>
            </div>
            {(data.studyTip || '').split(/\n+/).filter(Boolean).map((l, i) => (
              <p key={i} className="text-[14px] leading-relaxed mb-1.5" style={{ color:'var(--ink-dim)' }}>{l}</p>
            ))}
          </div>

          {/* 집중 과목 & 주의사항 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4" style={{ border:`1px solid rgba(16,185,129,0.2)` }}>
              <p className="text-[13px] font-bold mb-2 tracking-[0.05em]" style={{ color:EM }}>집중 과목</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{data.subjectTip}</p>
            </div>
            <div className="glass rounded-2xl p-4" style={{ border:'1px solid rgba(56,189,248,0.22)' }}>
              <p className="text-[13px] font-bold mb-2 tracking-[0.05em]" style={{ color:'#38bdf8' }}>도움이 되는 습관</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{data.avoidTip}</p>
            </div>
          </div>

          {/* 응원 메시지 */}
          <div className="rounded-2xl p-5 text-center"
            style={{ background:`linear-gradient(135deg, rgba(16,185,129,0.12), rgba(129,140,248,0.08))`, border:`1px solid rgba(16,185,129,0.25)` }}>
            <span className="serif text-[24px]" style={{ color:`rgba(16,185,129,0.45)` }}>"</span>
            <p className="serif text-[15px] italic -mt-1" style={{ color:'rgba(255,255,255,0.9)', lineHeight:1.8 }}>{data.encouragement}</p>
          </div>

          {/* 학습 심층 리포트 유도 */}
          {onReport && (
            <button onClick={onReport} className="w-full block group active:scale-[0.985] transition-transform">
              <div className="glass-strong rounded-[22px] relative overflow-hidden p-5 text-left"
                style={{ border:'1.5px solid rgba(16,185,129,0.35)', boxShadow:'0 12px 40px rgba(16,185,129,0.1)' }}>
                <div className="absolute rounded-full pointer-events-none" style={{ right:-16, top:-16, width:100, height:100, background:'rgba(16,185,129,0.16)', filter:'blur(36px)' }}/>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                    style={{ width:48, height:48, background:'rgba(16,185,129,0.14)', border:'1.5px solid rgba(16,185,129,0.4)' }}>
                    <GraduationCap size={22} style={{ color:EM }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold" style={{ color:'var(--ink)' }}>학습 상세 리포트</p>
                    <p className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-dim)' }}>두뇌유형 · 공부법 · 시험전략 · 과목적성 — PDF 저장</p>
                  </div>
                  <ChevronRight size={18} style={{ color:'rgba(16,185,129,0.5)', flexShrink:0 }} className="group-hover:translate-x-0.5 transition-transform"/>
                </div>
              </div>
            </button>
          )}

          {/* 다시 분석 */}
          <button onClick={fetchCompass} className="w-full text-[14px] font-bold rounded-2xl transition-all active:scale-[0.98]"
            style={{ minHeight:48, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)' }}>
            🔄 다시 분석하기
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   카테고리 화면들
================================================================ */
function CategoryKnow({ nickname, birth, ilju, onBack, onPick, onPickMode }) {
  const sunSign = getSunSign(birth.m, birth.d);
  // type:'mode' → 분석 실행(runAnalysis), type:'step' → 화면 전환(setStep)
  // type:'mode' → 분석 실행(runAnalysis), type:'step' → 화면 전환(setStep)
  // 사주 카드는 평생 사주 결과 안에서 만들 수 있어 별도 항목에서 통합 제거.
  const items = [
    { type:'mode', mode:'saju',  icon:<Star size={22}/>,        color:'#38bdf8', label:'평생 사주',    sub:'타고난 성격·재능·인생의 흐름' },
    { type:'step', step:'tarotDraw', icon:<Wand2 size={22}/>,   color:'#34d399', label:'타로',         sub:'오늘의 카드를 뽑아보세요' },
    { type:'step', step:'astrology', icon:<span style={{fontSize:20}}>♈</span>, color:'#f59e0b', label:'점성술', sub:`내 별자리 ${sunSign.ko} ${sunSign.symbol}` },
    { type:'step', step:'ziwei',     icon:<span style={{fontSize:20}}>☯</span>, color:'#e879f9', label:'자미두수', sub:'동양 최고의 별자리 명반' },
    { type:'step', step:'numerology',icon:<span style={{fontSize:20}}>∞</span>, color:'#06b6d4', label:'수비학',   sub:'생년월일로 읽는 운명의 숫자' },
  ];
  return (
    <div className="py-10 pb-24 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mt-2 mb-8 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#a78bfa,#38bdf8)' }}/>
        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>운명 풀이</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>{nickname}님의 사주와 별자리를 다양한 시선으로 풀어드려요.</p>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <button key={it.step || it.mode} onClick={() => it.type === 'mode' ? onPickMode(it.mode) : onPick(it.step)}
            className="w-full block group active:scale-[0.985] transition-transform animate-fade-up"
            style={{ animationDelay: i*60+'ms' }}>
            <div className="glass-strong rounded-[20px] relative overflow-hidden text-left"
              style={{ border:`1.5px solid ${it.color}30`, boxShadow:`0 6px 24px ${it.color}15` }}>
              <div className="absolute pointer-events-none" style={{ right:-16, top:-16, width:100, height:100, borderRadius:'50%', background:`${it.color}14`, filter:'blur(28px)' }}/>
              <div className="relative flex items-center gap-4 px-5 py-4">
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:50, height:50, background:`${it.color}18`, border:`1.5px solid ${it.color}40` }}>
                  <span style={{ color:it.color }}>{it.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-bold" style={{ color:'var(--ink)' }}>{it.label}</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{it.sub}</p>
                </div>
                <ChevronRight size={17} style={{ color:`${it.color}60`, flexShrink:0 }} className="group-hover:translate-x-1 transition-transform"/>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryRelate({ nickname, onBack, onPick, onPickMode }) {
  const items = [
    { type:'mode', mode:'weekly',  icon:<Calendar size={22}/>,      color:'#818cf8', label:'주간 운세',     sub:'이번 주 흐름을 미리 살펴봐요' },
    { type:'mode', mode:'monthly', icon:<Clock size={22}/>,         color:'#38bdf8', label:'월간 운세',     sub:'이번 달 흐름과 기회를 미리' },
    { type:'mode', mode:'yearly',  icon:<TrendingUp size={22}/>,    color:'#a78bfa', label:'올해의 운세',   sub:'한 해의 큰 흐름과 전환점' },
    { type:'mode', mode:'wealth',  icon:<Coins size={22}/>,         color:'#f0b429', label:'재물 · 금전운', sub:'돈·투자·기회의 흐름' },
    { type:'mode', mode:'gunghap', icon:<Heart size={22}/>,         color:'#fb7185', label:'궁합',          sub:'두 사람의 인연과 어울림' },
    { type:'step', step:'studyCompass', icon:<GraduationCap size={22}/>, color:'#10b981', label:'학습 나침반', sub:'사주 기반 맞춤 학습 분석' },
  ];
  return (
    <div className="py-10 pb-24 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mt-2 mb-8 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#818cf8,#f0b429)' }}/>
        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>맞춤 운세</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>시간대별 운세부터 인연·학습까지, 내게 맞춘 길잡이.</p>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <button key={it.mode||it.step} onClick={() => it.type==='mode' ? onPickMode(it.mode) : onPick(it.step)}
            className="w-full block group active:scale-[0.985] transition-transform animate-fade-up"
            style={{ animationDelay: i*60+'ms' }}>
            <div className="glass-strong rounded-[20px] relative overflow-hidden text-left"
              style={{ border:`1.5px solid ${it.color}30`, boxShadow:`0 6px 24px ${it.color}15` }}>
              <div className="absolute pointer-events-none" style={{ right:-16, top:-16, width:100, height:100, borderRadius:'50%', background:`${it.color}14`, filter:'blur(28px)' }}/>
              <div className="relative flex items-center gap-4 px-5 py-4">
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:50, height:50, background:`${it.color}18`, border:`1.5px solid ${it.color}40` }}>
                  <span style={{ color:it.color }}>{it.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-bold" style={{ color:'var(--ink)' }}>{it.label}</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{it.sub}</p>
                </div>
                <ChevronRight size={17} style={{ color:`${it.color}60`, flexShrink:0 }} className="group-hover:translate-x-1 transition-transform"/>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryRecord({ nickname, onBack, onPick }) {
  // 리포트 보관함은 '리포트' 화면(ReportSelect) 안에서 바로 열 수 있어 별도 항목 통합 제거.
  const items = [
    { step:'diary',        icon:<span style={{fontSize:20}}>📓</span>, color:'#38bdf8', label:'다이어리', sub:'오늘의 감정과 운세를 기록' },
    { step:'reportSelect', icon:<Crown size={22}/>,  color:'#C8A876', label:'프리미엄 리포트', sub:'시그니처·학습·궁합 PDF · 보관함' },
  ];
  return (
    <div className="py-10 pb-24 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mt-2 mb-8 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:'linear-gradient(to right,#10b981,#C8A876)' }}/>
        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>기록 · 리포트</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>나의 기록을 남기고 심층 리포트를 PDF로 저장하세요.</p>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <button key={it.step} onClick={() => onPick(it.step)}
            className="w-full block group active:scale-[0.985] transition-transform animate-fade-up"
            style={{ animationDelay: i*60+'ms' }}>
            <div className="glass-strong rounded-[20px] relative overflow-hidden text-left"
              style={{ border:`1.5px solid ${it.color}30`, boxShadow:`0 6px 24px ${it.color}18` }}>
              <div className="absolute pointer-events-none" style={{ right:-16, top:-16, width:100, height:100, borderRadius:'50%', background:`${it.color}14`, filter:'blur(28px)' }}/>
              <div className="relative flex items-center gap-4 px-5 py-4">
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:50, height:50, background:`${it.color}18`, border:`1.5px solid ${it.color}40` }}>
                  <span style={{ color:it.color }}>{it.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-bold" style={{ color:'var(--ink)' }}>{it.label}</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-dim)' }}>{it.sub}</p>
                </div>
                <ChevronRight size={17} style={{ color:`${it.color}60`, flexShrink:0 }} className="group-hover:translate-x-1 transition-transform"/>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   점성술 화면
================================================================ */
function AstrologyScreen({ nickname, birth, ilju, onBack }) {
  const sunSign = getSunSign(birth.m, birth.d);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const AC = sunSign.color;
  // 원소·상태(모달리티) 의미 — 분석 전 별자리 기본 정보 표시용
  const EL = { '화':'열정과 추진력', '지':'안정과 현실감', '풍':'지성과 소통', '수':'감성과 직관' };
  const MOD = { '활동':'시작하는 힘', '고정':'지키는 힘', '변통':'적응하는 힘' };

  const run = async () => {
    setLoading(true); setErr('');
    try {
      const r = await analyzeAstrology({ birth, userName: nickname, sunSign, sajuIlju: ilju });
      setResult(r); playSuccess(); vibrate([20,40,70]);
    } catch(e) { setErr(e.message || '분석에 실패했어요.'); playError(); }
    finally { setLoading(false); }
  };

  return (
    <div className="py-10 pb-28 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mb-8 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:`linear-gradient(to right,${AC},#a78bfa)` }}/>
        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>점성술</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>별이 전하는 {nickname}님만의 이야기</p>
      </div>
      <div className="glass-strong rounded-[24px] relative overflow-hidden mb-6"
        style={{ border:`1.5px solid ${AC}45`, boxShadow:`0 12px 48px ${AC}25` }}>
        <div className="absolute pointer-events-none" style={{ right:-30, top:-30, width:180, height:180, borderRadius:'50%', background:`${AC}18`, filter:'blur(50px)' }}/>
        <div className="relative p-6 flex items-center gap-5">
          <div className="flex flex-col items-center justify-center rounded-[20px] flex-shrink-0"
            style={{ width:76, height:76, background:`${AC}14`, border:`1.5px solid ${AC}45` }}>
            <ConstellationSVG signKey={sunSign.key} color={AC} size={52}/>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold tracking-[0.3em]" style={{ color:AC }}>SUN SIGN</p>
              <span className="text-[14px]" style={{ color:AC, opacity:0.7 }}>{sunSign.symbol}</span>
            </div>
            <p className="serif text-[26px] font-black text-white leading-tight">{sunSign.ko}</p>
            <p className="text-[12px] mt-1" style={{ color:'var(--ink-dim)' }}>{sunSign.date} · {sunSign.element}원소 · {sunSign.ruling} 지배</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {sunSign.traits.map((t,i) => (
                <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color:AC, background:`${AC}18`, border:`1px solid ${AC}35` }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {!result && !loading && (
        <div className="space-y-5">
          <button onClick={run}
            className="w-full text-[16px] font-bold rounded-2xl text-white transition-all active:scale-[0.98] btn-shine"
            style={{ minHeight:58, background:`linear-gradient(135deg,${AC}cc,${AC})`, boxShadow:`0 12px 32px ${AC}40` }}>
            ✦ {sunSign.ko} 점성술 분석하기
          </button>

          {/* 분석 전 별자리 기본 정보 — 허전함 해소 + 정보성 */}
          <div className="glass rounded-[18px] p-5" style={{ border:`1px solid ${AC}28` }}>
            <p className="serif text-[15.5px] italic text-center" style={{ color:AC, lineHeight:1.65 }}>&ldquo;{sunSign.desc}&rdquo;</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[['원소', `${sunSign.element}원소`, EL[sunSign.element]],
              ['상태', sunSign.modality, MOD[sunSign.modality]],
              ['지배 행성', sunSign.ruling, '나를 이끄는 별']].map(([label, val, desc], i) => (
              <div key={i} className="glass rounded-[16px] px-2.5 py-4 text-center" style={{ border:'1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[9.5px] font-bold tracking-[0.08em] mb-1.5" style={{ color:AC }}>{label}</p>
                <p className="text-[14px] font-black text-white leading-tight">{val}</p>
                {desc && <p className="text-[10.5px] mt-1.5" style={{ color:'var(--ink-faint)', lineHeight:1.45 }}>{desc}</p>}
              </div>
            ))}
          </div>
          <p className="text-center text-[12px]" style={{ color:'var(--ink-faint)' }}>
            위 버튼을 누르면 사주와 별자리를 함께 풀어드려요
          </p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 animate-fade-in">
          <div className="relative" style={{ width:64, height:64 }}>
            <div className="absolute inset-0 rounded-full animate-spin" style={{ border:`3px solid ${AC}20`, borderTopColor:AC }}/>
            <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize:24 }}>{sunSign.symbol}</div>
          </div>
          <p className="text-[14px] font-medium" style={{ color:'var(--ink-dim)' }}>별이 이야기를 전하고 있어요…</p>
        </div>
      )}
      {err && <ErrorBox msg={err}/>}
      {result && (
        <div className="space-y-5 animate-fade-up">
          {result.quote && <div className="text-center py-5 px-4"><p className="serif text-[18px] font-bold italic" style={{ color:AC, lineHeight:1.7 }}>"{result.quote}"</p></div>}
          {result.eastWestSynergy && (
            <div className="glass rounded-[18px] p-5" style={{ border:`1px solid ${AC}30` }}>
              <p className="text-[10px] font-bold tracking-[0.25em] mb-3" style={{ color:AC }}>동서양의 만남</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{result.eastWestSynergy}</p>
            </div>
          )}
          {result.todayMessage && (
            <div className="glass rounded-[18px] p-5">
              <p className="text-[10px] font-bold tracking-[0.25em] mb-3" style={{ color:'var(--gold)' }}>오늘의 메시지</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{result.todayMessage}</p>
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.strengths.map((s,i) => (
                <span key={i} className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ color:AC, background:`${AC}16`, border:`1px solid ${AC}35` }}>{s}</span>
              ))}
            </div>
          )}
          {[{key:'personality',label:'성격과 기질'},{key:'love',label:'연애 스타일'},{key:'career',label:'직업과 적성'},{key:'challenges',label:'내면의 도전'}].map(({key,label}) => result[key] && (
            <div key={key} className="glass rounded-[18px] p-5">
              <p className="text-[10px] font-bold tracking-[0.25em] mb-3" style={{ color:AC }}>{label.toUpperCase()}</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{result[key]}</p>
            </div>
          ))}
          <button onClick={run} className="w-full rounded-2xl font-bold text-[14px] active:scale-[0.98] transition-transform"
            style={{ minHeight:46, color:'var(--ink-dim)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)' }}>
            ↺ 다시 분석하기
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   자미두수 화면
================================================================ */
function ZiweiScreen({ nickname, birth, ilju, onBack }) {
  const [gender, setGender] = useState('female');
  const ziwei = useMemo(() => calcZiwei(birth, gender), [birth, gender]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('map');
  const AC = '#e879f9';

  const PALACE_ORDER = ['soulPalace','siblingsPalace','spousePalace','childrenPalace',
    'wealthPalace','healthPalace','surfacePalace','friendsPalace',
    'careerPalace','propertyPalace','spiritPalace','parentsPalace'];

  const run = async () => {
    if (!ziwei.ok) { setErr('명반 계산에 실패했어요.'); return; }
    setLoading(true); setErr(''); setTab('analysis');
    try {
      const r = await analyzeZiwei({ birth, userName: nickname, ziwei, sajuIlju: ilju, gender });
      setResult(r); playSuccess(); vibrate([20,40,70]);
    } catch(e) { setErr(e.message || '분석에 실패했어요.'); playError(); }
    finally { setLoading(false); }
  };

  return (
    <div className="py-10 pb-28 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mb-6 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:`linear-gradient(to right,${AC},#a78bfa)` }}/>

        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>자미두수</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>동양 최고의 별자리 명리 — {nickname}님의 명반</p>
      </div>

      {/* 명반 기준 성별 — 작은 보조 토글 (보기 탭과 구분) */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-[11.5px] font-semibold flex-shrink-0" style={{ color:'var(--ink-faint)' }}>명반 기준</span>
        <div className="flex gap-1.5">
          {[['female','여성','♀'],['male','남성','♂']].map(([g, label, sym]) => (
            <button key={g} onClick={() => { setGender(g); setResult(null); playTap(); vibrate(8); }}
              className="flex items-center gap-1 rounded-full font-semibold text-[12.5px] transition-all active:scale-95 px-3"
              style={{ minHeight:34,
                color: gender===g ? '#fff' : 'var(--ink-dim)',
                background: gender===g ? AC : 'rgba(255,255,255,0.05)',
                border: gender===g ? 'none' : '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ fontSize:13 }}>{sym}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {/* 보기 모드 — 밑줄 탭 (성별 토글과 시각적으로 분리) */}
      <div className="flex gap-6 mb-5" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        {[['map','명반 보기'],['analysis','AI 해석']].map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-bold text-[14.5px] transition-all pb-2.5 -mb-px"
            style={{ color:tab===t?'#fff':'var(--ink-faint)',
              borderBottom: tab===t?`2px solid ${AC}`:'2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'map' && ziwei.ok && (
        <div className="space-y-4 animate-fade-up">
          <div className="glass-strong rounded-[20px] p-5" style={{ border:`1.5px solid ${AC}35` }}>
            <p className="text-[10px] font-bold tracking-[0.28em] mb-1" style={{ color:AC }}>명반 핵심</p>
            <p className="serif text-[20px] font-black text-white">{ziwei.mainStar?.name || '—'} 명궁</p>
            <p className="text-[12px] mt-1" style={{ color:'var(--ink-dim)' }}>{ziwei.fiveElements}{ziwei.sign ? ' · '+ziwei.sign : ''}</p>
            {ziwei.mainStar?.desc && <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color:'var(--ink-dim)' }}>{ziwei.mainStar.desc}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PALACE_ORDER.map(key => {
              const p = ziwei.palaces?.find(pl => pl.key === key);
              if (!p) return null;
              return (
                <div key={key} className="rounded-[14px] px-2.5 py-3 relative"
                  style={{ background:p.isSoul?`${AC}18`:'rgba(255,255,255,0.04)',
                    border:p.isSoul?`1.5px solid ${AC}55`:p.isBody?'1.5px solid rgba(255,255,255,0.18)':'1px solid rgba(255,255,255,0.08)',
                    minHeight:96 }}>
                  {p.isSoul && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background:AC }}/>}
                  <p className="text-[11px] font-bold mb-1.5" style={{ color:p.isSoul?AC:'var(--ink-dim)' }}>{p.name}</p>
                  {p.majorStars?.map((s,i) => <p key={i} className="text-[12.5px] font-bold leading-snug" style={{ color:p.isSoul?'var(--ink)':'var(--ink-dim)' }}>{s.name}</p>)}
                  {(!p.majorStars||p.majorStars.length===0) && <p className="text-[12px]" style={{ color:'var(--ink-faint)' }}>—</p>}
                </div>
              );
            })}
          </div>
          <button onClick={run}
            className="w-full text-[16px] font-bold rounded-2xl text-white transition-all active:scale-[0.98] btn-shine"
            style={{ minHeight:58, background:`linear-gradient(135deg,${AC}cc,${AC})`, boxShadow:`0 12px 32px ${AC}35` }}>
            ✦ AI로 명반 해석받기
          </button>
        </div>
      )}
      {tab === 'analysis' && (
        <div className="animate-fade-up">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="relative" style={{ width:64, height:64 }}>
                <div className="absolute inset-0 rounded-full animate-spin" style={{ border:`3px solid ${AC}20`, borderTopColor:AC }}/>
                <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize:24 }}>☯</div>
              </div>
              <p className="text-[14px] font-medium" style={{ color:'var(--ink-dim)' }}>명반을 풀어내는 중이에요…</p>
            </div>
          )}
          {err && <ErrorBox msg={err}/>}
          {!result && !loading && (
            <div className="text-center py-12">
              <p className="text-[14px] mb-6" style={{ color:'var(--ink-dim)' }}>명반 보기 탭에서 분석을 시작해주세요.</p>
              <button onClick={() => setTab('map')} className="rounded-2xl font-bold text-[14px] px-8 active:scale-[0.97] transition-transform"
                style={{ minHeight:48, color:AC, background:`${AC}18`, border:`1px solid ${AC}35` }}>
                명반 보러가기
              </button>
            </div>
          )}
          {result && (
            <div className="space-y-5">
              {result.quote && <div className="text-center py-5 px-4"><p className="serif text-[17px] font-bold italic" style={{ color:AC, lineHeight:1.7 }}>"{result.quote}"</p></div>}
              {result.strengths?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s,i) => <span key={i} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ color:AC, background:`${AC}16`, border:`1px solid ${AC}35` }}>{s}</span>)}
                </div>
              )}
              {[{key:'overview',label:'명반 총론'},{key:'personality',label:'타고난 기질'},{key:'wealth',label:'재물운'},{key:'career',label:'직업운'},{key:'love',label:'연애운'},{key:'advice',label:'자미두수의 지혜'}].map(({key,label}) => result[key] && (
                <div key={key} className="glass rounded-[18px] p-5">
                  <p className="text-[10px] font-bold tracking-[0.25em] mb-3" style={{ color:AC }}>{label.toUpperCase()}</p>
                  <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{result[key]}</p>
                </div>
              ))}
              <button onClick={run} className="w-full rounded-2xl font-bold text-[14px] active:scale-[0.98] transition-transform"
                style={{ minHeight:46, color:'var(--ink-dim)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)' }}>
                ↺ 다시 해석받기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   수비학 — 라이프패스 넘버
================================================================ */
const LIFE_PATH_DATA = {
  1: {
    title: '리더', symbol: '☀', color: '#f59e0b',
    desc: '독립적이고 개척자 기질을 가진 숫자 1은 강한 의지와 창의력으로 새로운 길을 여는 선구자입니다.',
    strengths: ['독립심', '창의력', '결단력', '리더십', '개척 정신'],
    challenges: '타인의 의견을 수용하는 것이 어렵고, 혼자 짊어지려는 경향이 있어요.',
    love: '자신감 넘치는 파트너를 원하며, 자유로운 관계를 선호합니다. 상대방의 독립성도 존중해요.',
    career: '기업가, 경영자, 발명가, 예술가, 탐험가 등 스스로 이끄는 직업에서 빛납니다.',
    year: '2026년은 새로운 시작을 위한 기반을 다지는 해. 과거의 무게를 내려놓고 순수한 의지로 나아가세요.',
  },
  2: {
    title: '조화', symbol: '☯', color: '#818cf8',
    desc: '섬세하고 공감 능력이 뛰어난 숫자 2는 관계와 균형 속에서 진정한 힘을 발휘하는 평화의 수호자입니다.',
    strengths: ['공감 능력', '외교력', '협력', '직관', '섬세함'],
    challenges: '결단이 어렵고 지나치게 타인을 배려하다 자신을 잃을 수 있어요.',
    love: '깊은 정서적 유대를 원하며, 섬세한 배려로 관계를 가꿉니다. 진심 어린 소통이 핵심이에요.',
    career: '상담사, 외교관, 교사, 치료사, 예술가 등 사람 사이를 잇는 역할에서 탁월합니다.',
    year: '2026년은 관계의 해. 신뢰를 쌓고 협력을 통해 꿈을 확장하는 시간입니다.',
  },
  3: {
    title: '표현', symbol: '✦', color: '#34d399',
    desc: '창의적이고 낙천적인 숫자 3은 자신의 감정과 생각을 예술과 언어로 세상과 나누는 창조자입니다.',
    strengths: ['표현력', '창의성', '낙관주의', '사교성', '예술 감각'],
    challenges: '산만함과 과도한 낙관으로 집중력이 흐려질 수 있어요.',
    love: '활기차고 유머 넘치는 관계를 즐깁니다. 표현을 아끼지 않는 솔직한 파트너와 잘 맞아요.',
    career: '작가, 배우, 음악가, 강사, 마케터 등 창의적 표현이 가능한 분야에서 두각을 나타냅니다.',
    year: '2026년은 자기 표현의 해. 오래 묵혀둔 아이디어를 세상 밖으로 꺼낼 최고의 타이밍이에요.',
  },
  4: {
    title: '안정', symbol: '⊞', color: '#38bdf8',
    desc: '성실하고 체계적인 숫자 4는 꾸준한 노력과 탄탄한 기반으로 지속 가능한 성공을 만드는 건축가입니다.',
    strengths: ['성실함', '체계성', '신뢰성', '인내력', '실용성'],
    challenges: '융통성이 부족하고 변화에 저항하는 경향이 있어요.',
    love: '안정과 신뢰를 최우선으로 여기며, 오래 함께할 파트너를 원합니다. 천천히 깊어지는 사랑을 해요.',
    career: '엔지니어, 건축가, 회계사, 관리자, 연구자 등 꼼꼼함이 요구되는 분야에서 강합니다.',
    year: '2026년은 내실을 다지는 해. 급하지 않아도 됩니다. 한 걸음씩 쌓아가는 과정 자체가 성공입니다.',
  },
  5: {
    title: '자유', symbol: '★', color: '#fb7185',
    desc: '모험적이고 다재다능한 숫자 5는 끊임없는 변화와 경험을 통해 삶의 넓이를 확장하는 탐험가입니다.',
    strengths: ['적응력', '호기심', '자유로운 정신', '다재다능', '설득력'],
    challenges: '변화를 쫓다 한 자리에 정착하기 어렵고, 충동적 결정을 할 수 있어요.',
    love: '구속받지 않는 자유로운 관계를 원합니다. 지적이고 다양한 면모를 가진 파트너에게 끌려요.',
    career: '여행가, 기자, 영업, 마케터, 엔터테이너 등 변화와 이동이 많은 직업이 잘 맞습니다.',
    year: '2026년은 새로운 경험을 받아들이는 해. 익숙함에서 벗어나는 용기가 당신을 성장시킵니다.',
  },
  6: {
    title: '사랑', symbol: '♡', color: '#f472b6',
    desc: '따뜻하고 책임감 강한 숫자 6은 가족과 공동체를 위해 헌신하며 세상에 아름다움을 더하는 보호자입니다.',
    strengths: ['책임감', '돌봄', '조화', '예술 안목', '헌신'],
    challenges: '과도한 희생으로 자신을 소진하거나 완벽주의적 면모가 스트레스로 이어질 수 있어요.',
    love: '깊은 사랑과 헌신을 추구합니다. 가정적이며 따뜻한 관계를 원하고 파트너를 아낌없이 지원해요.',
    career: '의료, 상담, 교육, 인테리어, 요리, 사회복지 등 보살핌과 아름다움을 추구하는 분야에서 뛰어납니다.',
    year: '2026년은 관계를 깊게 가꾸는 해. 자기 자신을 사랑하는 것에서 출발해 주변으로 사랑을 넓혀가세요.',
  },
  7: {
    title: '탐구', symbol: '🔭', color: '#a78bfa',
    desc: '내면을 향한 깊은 통찰력을 가진 숫자 7은 진리와 지혜를 탐구하며 세상의 비밀을 풀어내는 철학자입니다.',
    strengths: ['분석력', '직관', '철학적 사고', '집중력', '학문'],
    challenges: '고독을 즐기다 고립될 수 있고, 타인과의 소통에서 어려움을 느끼기도 해요.',
    love: '지적 교감을 중시하며, 영적·정신적으로 통하는 파트너를 찾습니다. 시간이 필요한 깊은 사랑을 해요.',
    career: '연구원, 과학자, 철학자, 심리학자, 작가, 영성 지도자 등 탐구하는 직업에서 능력을 발휘합니다.',
    year: '2026년은 내면의 해. 외부의 소음을 줄이고 자신의 내면 깊은 곳에서 오는 목소리에 귀 기울여보세요.',
  },
  8: {
    title: '풍요', symbol: '∞', color: '#C8A876',
    desc: '실용적이고 목표 지향적인 숫자 8은 물질적 성공과 권한을 통해 세상에 영향력을 발휘하는 성취자입니다.',
    strengths: ['사업 감각', '목표 의식', '의지력', '리더십', '현실 감각'],
    challenges: '권력에 집착하거나 물질적 성공을 삶의 전부로 여길 위험이 있어요.',
    love: '강인하고 야망 있는 파트너를 원합니다. 현실적이고 안정된 관계를 추구하며 물질적 풍요도 중시해요.',
    career: '경영자, 투자가, 은행가, 변호사, 정치가 등 큰 조직을 이끄는 분야에서 두각을 나타냅니다.',
    year: '2026년은 성과의 해. 지금까지의 노력이 현실로 나타나기 시작합니다. 올바른 방향에 집중하세요.',
  },
  9: {
    title: '완성', symbol: '◎', color: '#e879f9',
    desc: '깊은 인류애와 보편적 지혜를 지닌 숫자 9는 세상을 더 나은 곳으로 만들고자 헌신하는 이타적인 현인입니다.',
    strengths: ['인류애', '포용력', '영적 지혜', '예술성', '관대함'],
    challenges: '자신을 잊고 타인만 챙기다 지치거나, 이상과 현실 사이에서 방황할 수 있어요.',
    love: '조건 없는 사랑을 주지만, 상처받기 쉽습니다. 자신의 감정을 솔직히 표현하는 연습이 필요해요.',
    career: '예술가, 치료사, 사회사업가, 영적 지도자, 인도주의자 등 세상에 빛을 더하는 직업이 맞습니다.',
    year: '2026년은 마무리와 해방의 해. 완성하지 못한 것들을 정리하고 더 높은 차원으로 도약할 준비를 하세요.',
  },
  11: {
    title: '영감', symbol: '⚡', color: '#818cf8',
    desc: '마스터 넘버 11은 직관과 감수성이 풍부한 유형으로 여겨져요. 영감을 주변과 나누는 데서 보람을 느끼는 경향이 있다고 해요.',
    strengths: ['직관', '감수성', '창의성', '영감', '이상주의'],
    challenges: '예민한 감수성 탓에 쉽게 지치거나, 이상과 현실 사이에서 흔들릴 수 있어요.',
    love: '깊고 정신적인 유대를 중요하게 여기는 편이에요. 마음이 통하는 관계에서 안정감을 느껴요.',
    career: '예술, 상담, 교육처럼 직관과 공감을 활용하는 분야와 잘 맞는다고 알려져 있어요.',
    year: '2026년은 새로운 깨달음의 해가 될 수 있어요. 마음의 목소리에 귀 기울여 보세요.',
  },
  22: {
    title: '마스터 빌더', symbol: '⊡', color: '#C8A876',
    desc: '마스터 넘버 22는 비전과 실행력을 함께 갖춘 유형으로 여겨져요. 큰 그림을 차근차근 현실로 옮기는 데 강점이 있다고 해요.',
    strengths: ['비전', '실행력', '리더십', '인내', '넓은 시야'],
    challenges: '큰 책임감이 부담이 되거나, 완벽주의 탓에 시작을 망설일 수 있어요.',
    love: '함께 목표를 향해 나아갈 동반자와 잘 맞는 편이에요. 서로의 지지와 안정이 중요해요.',
    career: '기획, 경영, 큰 프로젝트를 이끄는 일처럼 비전과 실행을 함께 쓰는 분야와 잘 맞는다고 알려져 있어요.',
    year: '2026년은 계획을 하나씩 실행에 옮기기 좋은 해가 될 수 있어요. 작은 첫걸음부터 시작해 보세요.',
  },
  33: {
    title: '마스터 교사', symbol: '✿', color: '#34d399',
    desc: '마스터 넘버 33은 따뜻한 보살핌과 공감의 에너지를 지닌 유형으로 여겨져요. 주변을 돌보고 가르치는 데서 보람을 느끼는 경향이 있다고 해요.',
    strengths: ['공감', '따뜻함', '돌봄', '교육', '봉사'],
    challenges: '남을 챙기느라 자신을 돌보지 못해 쉽게 지칠 수 있어요. 적절한 경계가 필요해요.',
    love: '깊고 헌신적인 사랑을 추구하는 편이에요. 베푸는 만큼 받는 것도 익히면 더 건강한 관계가 돼요.',
    career: '교육, 상담, 돌봄, 예술처럼 사람을 보살피고 북돋는 분야와 잘 맞는다고 알려져 있어요.',
    year: '2026년은 따뜻함을 나누기 좋은 해가 될 수 있어요. 작은 친절이 큰 의미가 될 거예요.',
  },
};

function calcLifePath(birth) {
  const digits = `${birth.y}${String(birth.m).padStart(2,'0')}${String(birth.d).padStart(2,'0')}`;
  const reduce = (n) => {
    if (n === 11 || n === 22 || n === 33) return n;
    const s = String(n).split('').reduce((a, c) => a + parseInt(c), 0);
    return s > 9 && s !== 11 && s !== 22 && s !== 33 ? reduce(s) : s;
  };
  const sum = digits.split('').reduce((a, c) => a + parseInt(c), 0);
  return reduce(sum);
}

function NumerologyScreen({ nickname, birth, onBack }) {
  const lifePath = calcLifePath(birth);
  const data = LIFE_PATH_DATA[lifePath] || LIFE_PATH_DATA[9];
  const AC = data.color;
  const [revealed, setRevealed] = useState(false);

  const digits = `${birth.y}${String(birth.m).padStart(2,'0')}${String(birth.d).padStart(2,'0')}`;
  const digitArr = digits.split('').map(Number);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="py-10 pb-28 page-transition-smooth">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <div className="mb-6 space-y-2">
        <div className="w-10 h-[3px] rounded-full" style={{ background:`linear-gradient(to right,${AC},#a78bfa)` }}/>
        <h2 className="serif font-black text-white" style={{ fontSize:'clamp(1.7rem,7vw,2.2rem)' }}>수비학</h2>
        <p className="text-[13.5px]" style={{ color:'var(--ink-dim)' }}>생년월일에 숨겨진 {nickname}님의 운명 숫자</p>
      </div>

      {/* 계산 과정 시각화 */}
      <div className="glass-strong rounded-[22px] p-5 mb-5" style={{ border:`1.5px solid ${AC}30` }}>
        <p className="text-[10px] font-bold tracking-[0.28em] mb-3" style={{ color:AC }}>계산 과정</p>
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {digitArr.map((d, i) => (
            <span key={i} className="text-[15px] font-bold tabular-nums"
              style={{ color: i < 4 ? 'rgba(255,255,255,0.5)' : i < 6 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.85)',
                fontSize: i < 4 ? 13 : 14 }}>
              {d}{i < digitArr.length-1 ? <span style={{ color:'rgba(255,255,255,0.2)', marginLeft:2 }}>+</span> : ''}
            </span>
          ))}
        </div>
        <p className="text-[12px]" style={{ color:'var(--ink-dim)' }}>
          합계 {digitArr.reduce((a,c) => a+c, 0)} → 반복 환원 →
          <span className="font-bold ml-1" style={{ color:AC }}>라이프패스 {lifePath}</span>
        </p>
      </div>

      {/* 라이프패스 히어로 */}
      <div className={`glass-strong rounded-[28px] p-7 mb-6 text-center relative overflow-hidden transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ border:`1.5px solid ${AC}45`, boxShadow:`0 16px 56px ${AC}25` }}>
        <div className="absolute pointer-events-none inset-0" style={{ background:`radial-gradient(ellipse at 50% 0%, ${AC}14 0%, transparent 70%)` }}/>
        <div className="relative">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center rounded-full"
              style={{ width:88, height:88, background:`${AC}14`, border:`2px solid ${AC}50`, boxShadow:`0 0 40px ${AC}30` }}>
              <span className="serif font-black" style={{ fontSize:40, color:AC, lineHeight:1, textShadow:`0 0 20px ${AC}60` }}>{lifePath}</span>
            </div>
          </div>
          <p className="text-[11.5px] font-bold tracking-[0.28em] mb-1.5" style={{ color:`${AC}` }}>나의 운명 수</p>
          <p className="serif font-black text-white mb-1" style={{ fontSize:'clamp(1.5rem,6vw,2rem)' }}>
            {data.symbol} {data.title}
          </p>
          {lifePath > 9 && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full mb-3 inline-block"
              style={{ color:AC, background:`${AC}18`, border:`1px solid ${AC}40` }}>✦ 마스터 넘버</span>
          )}
          <p className="text-[13.5px] leading-relaxed mt-3" style={{ color:'var(--ink-dim)' }}>{data.desc}</p>
        </div>
      </div>

      {/* 강점 태그 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {data.strengths.map((s, i) => (
          <span key={i} className="text-[12px] font-semibold px-3 py-1.5 rounded-full animate-fade-up"
            style={{ color:AC, background:`${AC}16`, border:`1px solid ${AC}35`, animationDelay:`${i*60}ms` }}>{s}</span>
        ))}
      </div>

      {/* 상세 섹션 */}
      <div className="space-y-4">
        {[
          { key:'challenges', label:'내면의 과제', icon:'⚡' },
          { key:'love',       label:'연애 스타일', icon:'♡' },
          { key:'career',     label:'직업과 적성', icon:'★' },
          { key:'year',       label:'2026년 메시지', icon:'☀' },
        ].map(({ key, label, icon }) => (
          <RevealCard key={key} delay={100}>
            <div className="glass rounded-[18px] p-5" style={{ border:`1px solid ${AC}22` }}>
              <p className="text-[10px] font-bold tracking-[0.28em] mb-3" style={{ color:AC }}>
                {icon} {label.toUpperCase()}
              </p>
              <p className="text-[13.5px] leading-relaxed" style={{ color:'var(--ink-dim)' }}>{data[key]}</p>
            </div>
          </RevealCard>
        ))}
      </div>

      {/* 잘 맞는 숫자 */}
      <div className="glass rounded-[18px] p-5 mt-4" style={{ border:`1px solid ${AC}22` }}>
        <p className="text-[11px] font-bold tracking-[0.16em] mb-3.5" style={{ color:AC }}>나와 잘 맞는 숫자</p>
        <div className="flex gap-3">
          {[lifePath === 1 ? [3,5] : lifePath === 2 ? [4,8] : lifePath === 3 ? [1,9] :
             lifePath === 4 ? [2,8] : lifePath === 5 ? [1,7] : lifePath === 6 ? [2,9] :
             lifePath === 7 ? [5,9] : lifePath === 8 ? [2,4] : [3,6]][0].map((n) => {
            const nd = LIFE_PATH_DATA[n];
            return nd ? (
              <div key={n} className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-4"
                style={{ background:`${nd.color}12`, border:`1px solid ${nd.color}35` }}>
                <span className="serif font-black text-[26px] leading-none" style={{ color:nd.color }}>{n}</span>
                <span className="text-[11.5px] font-semibold" style={{ color:'var(--ink-dim)' }}>{nd.title}</span>
              </div>
            ) : null;
          })}
        </div>
        <p className="text-[12px] text-center mt-3.5" style={{ color:'var(--ink-faint)', lineHeight:1.6 }}>
          서로 다른 결이 만나 부족한 부분을 채워주는 인연이에요
        </p>
      </div>
    </div>
  );
}

/* BackBar · ErrorBox 는 ui/bits.jsx 로 분리(여러 화면 공유) */
