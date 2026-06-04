/* ================================================================
   천문 — Celestial Premium UI 프리미티브
   배경 / 글래스 카드 / 점수링 / 휠피커 / 생년월일 입력 / 오행 심볼
================================================================ */
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  OHAENG, getScoreInfo, getOhaeng, vibrate,
} from '../lib/saju.js';
import { playScoreReveal } from '../lib/audio.js';

/* ── 보석 팔레트 ───────────────────────────────────────────── */
export const JEWELS = {
  amber:   { main:'#f0b429', soft:'rgba(240,180,41,0.12)',  border:'rgba(240,180,41,0.30)',  glow:'rgba(240,180,41,0.22)' },
  indigo:  { main:'#818cf8', soft:'rgba(129,140,248,0.12)', border:'rgba(129,140,248,0.30)', glow:'rgba(129,140,248,0.24)' },
  violet:  { main:'#a78bfa', soft:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.30)', glow:'rgba(167,139,250,0.24)' },
  rose:    { main:'#fb7185', soft:'rgba(251,113,133,0.12)', border:'rgba(251,113,133,0.30)', glow:'rgba(251,113,133,0.22)' },
  emerald: { main:'#34d399', soft:'rgba(52,211,153,0.12)',  border:'rgba(52,211,153,0.30)',  glow:'rgba(52,211,153,0.22)' },
  sky:     { main:'#38bdf8', soft:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.30)',  glow:'rgba(56,189,248,0.22)' },
};

/* ── 셀레스철 배경: 오로라 + 별 ────────────────────────────── */
// 별은 장식용이라 모듈 로드 시 한 번만 생성 (렌더마다 난수 재계산 방지)
const STARS = [...Array(46)].map((_, i) => ({
  x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2.0 + 0.3,
  opacity: Math.random() * 0.45 + 0.05,
  delay: Math.random() * 10, dur: 3 + Math.random() * 7,
  // 일부는 십자 빛살 효과 (큰 별)
  cross: i < 5,
}));
// 보석빛 글로우 별 — 깊이감을 더하는 소수의 큰 별 (골드·바이올렛·스카이 틴트)
const GLOW_STARS = [
  { x: 16, y: 22, c: '#e7b94f', size: 2.6, dur: 5.5, delay: 0 },
  { x: 82, y: 16, c: '#a78bfa', size: 2.2, dur: 6.5, delay: 1.2 },
  { x: 70, y: 38, c: '#38bdf8', size: 2.0, dur: 7, delay: 2.4 },
  { x: 28, y: 64, c: '#a78bfa', size: 2.3, dur: 6, delay: 0.8 },
  { x: 90, y: 72, c: '#e7b94f', size: 2.1, dur: 7.5, delay: 3 },
  { x: 48, y: 84, c: '#38bdf8', size: 1.9, dur: 6.2, delay: 1.8 },
  { x: 60, y: 60, c: '#fb7185', size: 1.7, dur: 7.2, delay: 4.2 },
];
// 유성(긴 별)은 텍스트를 가리고 산만해 제거(사용자 요청).
const SHOOTING = [];
export const Background = memo(({ ohaengColor = null }) => {
  // 오행색이 주어지면 배경 오로라를 그 색으로 물들임 (결과/허브 화면 개성화)
  const tint = ohaengColor;
  const stars = STARS;
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0" style={{ background:
        'radial-gradient(120% 80% at 50% -10%, #0e1a38 0%, transparent 55%), radial-gradient(100% 70% at 90% 110%, #0a1430 0%, transparent 50%)' }}/>
      {/* 오행색 오로라 — 본인 오행에 맞춰 배경이 미묘하게 달라진다 */}
      {tint && (
        <div className="absolute rounded-full" style={{
          top:'-10%', left:'10%', width:'80%', height:'60%',
          background:`radial-gradient(circle, ${tint}28, transparent 68%)`,
          filter:'blur(80px)', animation:'aurora-drift 18s ease-in-out infinite',
          transition:'background 1.2s ease' }}/>
      )}
      {/* 오로라 블롭 — 딥 네이비 + 따뜻한 골드 한 점 (Digital Heritage) */}
      <div className="absolute rounded-full" style={{
        top:'-18%', left:'-12%', width:'70%', height:'70%',
        background:`radial-gradient(circle, ${tint ? tint+'22' : 'rgba(70,104,210,0.18)'}, transparent 70%)`,
        filter:'blur(60px)', animation:'aurora-drift 22s ease-in-out infinite' }}/>
      <div className="absolute rounded-full" style={{
        bottom:'-22%', right:'-14%', width:'62%', height:'62%',
        background:'radial-gradient(circle, rgba(167,139,250,0.16), transparent 70%)',
        filter:'blur(70px)', animation:'aurora-drift 28s ease-in-out infinite reverse' }}/>
      <div className="absolute rounded-full" style={{
        top:'40%', left:'46%', width:'48%', height:'48%',
        background:'radial-gradient(circle, rgba(231,185,79,0.11), transparent 70%)',
        filter:'blur(74px)', animation:'aurora-drift 32s ease-in-out infinite' }}/>
      {stars.map((s, i) => (
        s.cross ? (
          <div key={i} className="absolute" style={{
            left:`${s.x}%`, top:`${s.y}%`,
            opacity: s.opacity + 0.1,
            animation:`star-pulse ${s.dur}s ease-in-out infinite`, animationDelay:`${s.delay}s`,
            transform: 'translate(-50%,-50%)',
          }}>
            <div style={{ width: s.size * 4, height: 1, background: `rgba(255,255,255,0.5)`,
              position:'absolute', top:'50%', left:0, transform:'translateY(-50%)',
              boxShadow:`0 0 ${s.size * 2}px rgba(255,255,255,0.4)` }}/>
            <div style={{ width: 1, height: s.size * 4, background: `rgba(255,255,255,0.5)`,
              position:'absolute', left:'50%', top:0, transform:'translateX(-50%)',
              boxShadow:`0 0 ${s.size * 2}px rgba(255,255,255,0.4)` }}/>
            <div className="absolute rounded-full bg-white" style={{
              width: s.size * 1.5, height: s.size * 1.5,
              top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}/>
          </div>
        ) : (
          <div key={i} className="absolute rounded-full bg-white" style={{
            left:`${s.x}%`, top:`${s.y}%`, width:`${s.size}px`, height:`${s.size}px`,
            opacity:s.opacity, animation:`twinkle ${s.dur}s ease-in-out infinite`, animationDelay:`${s.delay}s`,
            transform: 'translate(-50%,-50%)' }}/>
        )
      ))}
      {/* 보석빛 글로우 별 — 깊이감 */}
      {GLOW_STARS.map((s, i) => (
        <div key={`g${i}`} className="absolute rounded-full" style={{
          left:`${s.x}%`, top:`${s.y}%`, width:`${s.size}px`, height:`${s.size}px`,
          background:s.c, boxShadow:`0 0 ${s.size * 3}px ${s.size}px ${s.c}`,
          animation:`star-pulse ${s.dur}s ease-in-out infinite`, animationDelay:`${s.delay}s` }}/>
      ))}
      {/* 유성 — 가는 빛줄기 */}
      {SHOOTING.map((s, i) => (
        <div key={`s${i}`} className="absolute" style={{
          top:s.top, left:s.left, width:90, height:1.4, borderRadius:2,
          background:'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 100%)',
          boxShadow:'0 0 6px rgba(255,255,255,0.5)',
          animation:`shoot ${s.dur}s ease-in infinite`, animationDelay:`${s.delay}s` }}/>
      ))}
      {/* 초승달 — 절차적 SVG(마스크 크레센트) + 부드러운 헤일로. 천문의 상징 오브제 */}
      <div className="absolute pointer-events-none" style={{ top:'6.5%', left:'11%', width:54, height:54, opacity:0.5 }}>
        <div className="absolute rounded-full" style={{ inset:-16, background:'radial-gradient(circle, rgba(220,226,255,0.22), transparent 68%)', filter:'blur(11px)' }}/>
        <svg viewBox="0 0 64 64" width="54" height="54" style={{ position:'relative', display:'block' }}>
          <defs>
            <radialGradient id="cmMoon" cx="38%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#fdfbff"/>
              <stop offset="72%" stopColor="#e8ecff"/>
              <stop offset="100%" stopColor="#c5cce6"/>
            </radialGradient>
            <mask id="cmCres">
              <rect x="0" y="0" width="64" height="64" fill="#fff"/>
              <circle cx="43" cy="27" r="23" fill="#000"/>
            </mask>
          </defs>
          <circle cx="32" cy="32" r="22" fill="url(#cmMoon)" mask="url(#cmCres)"/>
          <circle cx="23" cy="39" r="2.4" fill="rgba(150,160,195,0.45)" mask="url(#cmCres)"/>
          <circle cx="19" cy="29" r="1.5" fill="rgba(150,160,195,0.4)" mask="url(#cmCres)"/>
          <circle cx="28" cy="46" r="1.5" fill="rgba(150,160,195,0.35)" mask="url(#cmCres)"/>
        </svg>
      </div>
      {/* 성운 SVG — 절차적 생성, CC0 (순수 코드). 아주 느린 패럴랙스 드리프트 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ opacity:0.19 }}>
        <defs>
          <radialGradient id="neb1" cx="25%" cy="20%" r="35%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6"/>
            <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="neb2" cx="75%" cy="70%" r="30%">
            <stop offset="0%" stopColor="#e7b94f" stopOpacity="0.45"/>
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="neb3" cx="60%" cy="15%" r="25%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <filter id="nebBlur"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>
        <ellipse cx="25" cy="22" rx="28" ry="20" fill="url(#neb1)" filter="url(#nebBlur)"/>
        <ellipse cx="75" cy="72" rx="24" ry="18" fill="url(#neb2)" filter="url(#nebBlur)"/>
        <ellipse cx="62" cy="14" rx="18" ry="12" fill="url(#neb3)" filter="url(#nebBlur)"/>
        {/* 은하수 형태 미세 점들 */}
        {[...Array(28)].map((_,i) => (
          <circle key={i} cx={15 + (i*3.1 % 70)} cy={30 + Math.sin(i*0.8)*22} r={0.2 + (i%3)*0.15}
            fill="white" opacity={0.15 + (i%4)*0.07}/>
        ))}
      </svg>
      {/* 가장자리 비네팅 — 중앙 콘텐츠 집중 */}
      <div className="absolute inset-0" style={{ background:'radial-gradient(130% 100% at 50% 50%, transparent 58%, rgba(3,5,14,0.60) 100%)' }}/>
    </div>
  );
});

/* ── 글래스 카드 ───────────────────────────────────────────── */
export const GlassCard = ({ children, className = '', jewel, style, ...rest }) => {
  const j = jewel ? JEWELS[jewel] : null;
  return (
    <div className={`glass rounded-3xl relative overflow-hidden ${className}`}
      style={{ boxShadow: j ? `0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px ${j.border}` : undefined, ...style }}
      {...rest}>
      {j && <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ background:j.glow, filter:'blur(48px)', opacity: 0.75 }}/>}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/* ── 섹션 카드: 아이콘 + 제목 + 본문 ──────────────────────── */
export const RevealCard = memo(({ icon, title, jewel = 'indigo', content, tip, delay = 0, children }) => {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // 살짝 일찍 + 한 번만 등장 (화면에 들어오기 전 미리 트리거해 빈 칸 방지)
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); vibrate(5); ob.disconnect(); }
    }, { threshold: 0.02, rootMargin: '0px 0px 14% 0px' });
    ob.observe(el);
    // 안전장치: 관찰이 어긋나도 일정 시간 뒤 반드시 표시
    const t = setTimeout(() => setVis(true), 900 + delay);
    return () => { ob.disconnect(); clearTimeout(t); };
  }, [delay]);
  const j = JEWELS[jewel];
  // 문장 단위로 분리 — 문장부호(.!?…) 뒤 공백에서만 끊어 '주요/필요/이렇다' 같은
  // 단어 끝 다·요에서 잘리던 버그를 막는다. 앞쪽 군더더기 기호는 제거.
  const lines = content
    ?.split(/\n+|(?<=[.!?…])\s+/)
    .map(l => l.trim().replace(/^[•\-*·●▪◦•\d.]+\s*/, ''))
    .filter(Boolean) || [];
  return (
    <div ref={ref} className={`glass rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all`}
      style={{
        transitionDuration: '600ms',
        transitionTimingFunction: 'cubic-bezier(.16,.84,.44,1)',
        transitionDelay:`${delay}ms`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.98)',
      }}>
      <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full pointer-events-none"
        style={{ background:j.glow, filter:'blur(52px)', opacity: vis ? 0.55 : 0, transition:'opacity 0.8s ease' }}/>
      <div className="relative z-10">
        {/* 아이콘/제목이 없으면(애니메이션 래퍼로만 쓰일 때) 헤더 박스를 그리지 않음 — 빈 네모칸 방지 */}
        {(icon || title) && (
          <div className="flex items-center gap-3 mb-4">
            {icon && (
              <div className="flex items-center justify-center flex-shrink-0"
                style={{ width:44, height:44, borderRadius:14, background:j.soft, border:`1px solid ${j.border}`,
                  boxShadow:`0 4px 16px ${j.glow}` }}>
                <span style={{ color:j.main }}>{icon}</span>
              </div>
            )}
            {title && <h3 className="text-[18px] font-bold" style={{ color:'var(--ink)', letterSpacing:'-0.02em' }}>{title}</h3>}
          </div>
        )}
        {lines.length > 0 && (
          <ul className="space-y-3">
            {lines.map((l, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 rounded-full" style={{ width:5, height:5, marginTop:11, background:j.main, opacity:0.8,
                  boxShadow:`0 0 6px ${j.main}` }}/>
                <p className="flex-1 text-[15.5px]" style={{ color:'var(--ink-dim)', lineHeight:1.85, wordBreak:'keep-all', overflowWrap:'break-word' }}>
                  {l}
                </p>
              </li>
            ))}
          </ul>
        )}
        {children}
        {tip && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl" style={{ background:j.soft, border:`1px solid ${j.border}` }}>
            <span className="text-[14px] mt-0.5" style={{ color:j.main }}>✦</span>
            <p className="text-[14px]" style={{ color:'var(--ink-dim)', lineHeight:1.65 }}>{tip}</p>
          </div>
        )}
      </div>
    </div>
  );
});

/* ── 전체 노출 텍스트 ──────────────────────────────────────────
   '더보기/접기' 토글 없이 전문을 항상 보여준다(전 영역 정보 완전 노출 정책).
   여분 props(lines·accent)는 호환을 위해 받기만 하고 무시한다. */
export const ExpandableText = memo(({ text, className = '', style = {} }) => (
  <p className={className} style={{ whiteSpace:'pre-wrap', ...style }}>{text}</p>
));

/* ── 확인 모달 (앱 테마 인앱 다이얼로그) ──────────────────────
   네이티브 alert 대신 쓰는 프리미엄 모달. 고대비·큰 버튼·Esc/바깥탭 닫기.
   children으로 요약 정보 등 커스텀 본문 삽입 가능(시그니처 발송 확인 등). */
export const ConfirmDialog = memo(({ open, title, message, confirmLabel = '확인', cancelLabel = '취소', danger = false, onConfirm, onCancel, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const accent = danger ? '#fb7185' : '#a78bfa';
  return (
    <div onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}
      style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
        padding:24, background:'rgba(5,4,12,0.66)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', animation:'fade-in .18s ease both' }}>
      <div onClick={e => e.stopPropagation()} className="glass-strong"
        style={{ width:'100%', maxWidth:380, borderRadius:24, padding:'28px 24px 22px', textAlign:'center',
          border:`1px solid ${accent}44`, animation:'scale-in .24s cubic-bezier(.16,.84,.44,1) both' }}>
        <div style={{ width:56, height:56, margin:'0 auto 16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${accent}1f`, border:`1px solid ${accent}55` }}>
          <span style={{ fontSize:24 }}>{danger ? '🗑️' : '✦'}</span>
        </div>
        <h3 className="serif" style={{ fontSize:20, fontWeight:700, color:'var(--ink)', marginBottom:message ? 10 : 0 }}>{title}</h3>
        {message && <p style={{ fontSize:15, lineHeight:1.7, color:'var(--ink-dim)', whiteSpace:'pre-wrap' }}>{message}</p>}
        {children}
        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          <button onClick={onCancel} style={{ flex:1, minHeight:52, borderRadius:16, fontSize:15, fontWeight:700, color:'var(--ink-dim)', border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.04)' }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ flex:1, minHeight:52, borderRadius:16, fontSize:15, fontWeight:700, color:'#fff',
            background: danger ? 'linear-gradient(135deg,#fb7185,#f43f5e)' : 'linear-gradient(135deg,#6366f1,#a78bfa)', boxShadow:`0 10px 28px ${accent}3a` }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
});

/* ── 점수 링 (원형 SVG) ────────────────────────────────────── */
export const ScoreRing = memo(({ score, yesterdayScore, tone, labelOverride, emojiOverride, descOverride }) => {
  const [displayed, setDisplayed] = useState(0);  // 카운트업 표시값
  const [ringFill, setRingFill] = useState(0);     // 링 채움 0→score
  const [revealed, setRevealed] = useState(false);
  const [burst, setBurst] = useState(false);       // 파티클 터짐
  const R = 92, C = 2 * Math.PI * R;
  const info = getScoreInfo(score);
  const accent = tone || info.tone;
  const label = labelOverride || info.label;
  const emoji = emojiOverride !== undefined ? emojiOverride : info.emoji;
  const diff = yesterdayScore ? score - yesterdayScore : null;

  useEffect(() => {
    // 0.5s 후 링+숫자 카운트업 시작
    const t0 = setTimeout(() => setRingFill(score), 500);
    // 숫자는 직접 카운트업 (0 → score, 1.8초)
    let frame;
    const start = performance.now();
    const DURATION = 1800;
    const tick = (now) => {
      const p = Math.min(1, (now - start - 500) / DURATION);
      if (p < 0) { frame = requestAnimationFrame(tick); return; }
      // easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(ease * score));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // 공개 + 점수 반응형 사운드/햅틱(의식의 정점) + 파티클
    const t2 = setTimeout(() => {
      setRevealed(true);
      // 점수가 높을수록 더 풍부한 햅틱 패턴
      const hap = score >= 88 ? [30, 40, 60, 40, 90] : score >= 75 ? [28, 40, 70] : [24, 50];
      vibrate(hap);
      playScoreReveal(score);
    }, 2400);
    const t3 = setTimeout(() => setBurst(true), 2500);
    return () => { clearTimeout(t0); clearTimeout(t2); clearTimeout(t3); cancelAnimationFrame(frame); };
  }, [score]);

  // 파티클 위치 — 링 바깥 원에 12개
  const PARTICLES = [0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
    const rad = deg * Math.PI / 180, rr = 108 + (i%3===0 ? 14 : i%3===1 ? 6 : -2);
    const x = 115 + Math.cos(rad) * rr, y = 115 + Math.sin(rad) * rr;
    const s = i%3===0 ? 8 : i%3===1 ? 5 : 4;
    return { x, y, s, delay: i * 0.05 };
  });

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative" style={{ width:230, aspectRatio:'1/1' }}>
        {/* 공개 후 오행색 외곽 글로우 */}
        <div className="absolute inset-[-22px] rounded-full transition-all duration-1000"
          style={{ boxShadow:`0 0 ${revealed?'130px':'0px'} ${accent}${revealed?'50':'00'}`, opacity:revealed ? 1 : 0 }}/>

        <svg viewBox="0 0 230 230" style={{ display:'block', width:'100%', height:'100%' }} className="-rotate-90">
          {/* 배경 링 */}
          <circle cx="115" cy="115" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
          {/* 채움 링 */}
          <circle cx="115" cy="115" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C - (ringFill / 100) * C}
            style={{ transition:'stroke-dashoffset 2.2s cubic-bezier(.16,.84,.44,1)', filter:`drop-shadow(0 0 8px ${accent}88)` }}/>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent}/><stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
          </defs>
        </svg>

        {/* 숫자 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black tabular-nums leading-none"
            style={{ fontSize:78, color:'#fff', textShadow:`0 0 40px ${accent}66`,
              transform: revealed ? 'scale(1)' : 'scale(0.85)', opacity: displayed > 0 ? 1 : 0,
              transition:'transform .6s cubic-bezier(.16,.84,.44,1), opacity .4s ease' }}>{displayed}</span>
        </div>

        {/* 공개 순간 파티클 버스트 */}
        <div className="absolute inset-0 pointer-events-none">
          {PARTICLES.map((p, i) => (
            <span key={i} style={{
              position:'absolute', left:`${(p.x/230)*100}%`, top:`${(p.y/230)*100}%`,
              width:p.s, height:p.s, marginLeft:-p.s/2, marginTop:-p.s/2,
              borderRadius:'50%',
              background: i%4===0 ? accent : i%4===1 ? '#fff' : i%4===2 ? '#fde047' : accent,
              boxShadow:`0 0 ${p.s*2}px ${p.s/2}px ${accent}`,
              opacity: burst ? 0.85 : 0,
              animation: burst ? `cm-twinkle 2.4s ease-in-out ${p.delay}s infinite` : 'none',
              transition:`opacity .4s ease ${p.delay * 0.5}s`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ── 휠 피커 (RAF + 데드존 물리) ───────────────────────────── */
const ITEM_H = 52, VISIBLE = 3, PAD = 1, DEAD = 6; // 행 높이 유지(터치 타깃), 보이는 항목 5→3으로 컴팩트화
export const WheelPicker = memo(({ items, value, onChange, label, renderItem }) => {
  const ref = useRef(null);
  const committed = useRef(value);
  const startTop = useRef(0);
  const raf = useRef(null);
  const deb = useRef(null);
  const [idx, setIdx] = useState(() => Math.max(0, items.findIndex(i => String(i.value) === String(value))));

  const sync = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const el = ref.current; if (!el) return;
      setIdx(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H))));
    });
  }, [items.length]);

  const commit = useCallback(() => {
    const el = ref.current; if (!el) return;
    const delta = Math.abs(el.scrollTop - startTop.current);
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
    const v = items[i]?.value;
    setIdx(i);
    if (delta >= DEAD && String(v) !== String(committed.current)) { committed.current = v; onChange(v); vibrate(6); }
  }, [items, onChange]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const i = Math.max(0, items.findIndex(it => String(it.value) === String(value)));
    el.scrollTop = i * ITEM_H; startTop.current = i * ITEM_H; committed.current = value; setIdx(i);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (String(value) === String(committed.current)) return;
    const el = ref.current; if (!el) return;
    const i = Math.max(0, items.findIndex(it => String(it.value) === String(value)));
    el.scrollTop = i * ITEM_H; committed.current = value; setIdx(i);
  }, [value, items]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onStart = () => { startTop.current = el.scrollTop; };
    el.addEventListener('touchstart', onStart, { passive:true });
    el.addEventListener('scroll', sync, { passive:true });
    if ('onscrollend' in el) {
      el.addEventListener('scrollend', commit);
      return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('scroll', sync); el.removeEventListener('scrollend', commit); if (raf.current) cancelAnimationFrame(raf.current); };
    }
    const dc = () => { clearTimeout(deb.current); deb.current = setTimeout(commit, 130); };
    el.addEventListener('scroll', dc, { passive:true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('scroll', sync); el.removeEventListener('scroll', dc); clearTimeout(deb.current); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [sync, commit]);

  // 항목을 탭하면 부드럽게 가운데로 — 드래그 없이도 정확히 고를 수 있게
  const selectIndex = (i) => {
    const el = ref.current; if (!el) return;
    startTop.current = el.scrollTop;
    el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
  };

  const stepUp = () => {
    const el = ref.current; if (!el) return;
    const i = Math.max(0, idx - 1);
    startTop.current = el.scrollTop;
    el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
    const v = items[i]?.value;
    if (v !== undefined && String(v) !== String(committed.current)) { committed.current = v; onChange(v); vibrate(6); }
    setIdx(i);
  };
  const stepDown = () => {
    const el = ref.current; if (!el) return;
    const i = Math.min(items.length - 1, idx + 1);
    startTop.current = el.scrollTop;
    el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
    const v = items[i]?.value;
    if (v !== undefined && String(v) !== String(committed.current)) { committed.current = v; onChange(v); vibrate(6); }
    setIdx(i);
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      {label && <span className="text-[13px] font-bold tracking-[0.08em]" style={{ color:'rgba(236,234,246,0.82)' }}>{label}</span>}
      {/* ▲ 위로 버튼 */}
      <button onClick={stepUp} disabled={idx === 0} aria-label={`${label} 이전`}
        className="flex items-center justify-center rounded-2xl transition-opacity active:scale-95"
        style={{ width:'100%', height:36, background:'rgba(129,140,248,0.10)', border:'1px solid rgba(129,140,248,0.22)', opacity: idx === 0 ? 0.3 : 1 }}>
        <span style={{ color:'rgba(129,140,248,0.85)', fontSize:18, lineHeight:1 }}>▲</span>
      </button>
      <div className="relative w-full" style={{ height:ITEM_H * VISIBLE }}>
        <div className="absolute left-0.5 right-0.5 pointer-events-none z-10 rounded-2xl"
          style={{ top:ITEM_H * PAD, height:ITEM_H, background:'rgba(129,140,248,0.18)', border:'1.5px solid rgba(129,140,248,0.62)', boxShadow:'0 0 20px rgba(129,140,248,0.22) inset' }}/>
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none" style={{ height:ITEM_H * PAD + 8, background:'linear-gradient(to bottom,var(--pick-fade, var(--bg)) 22%,transparent)' }}/>
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none" style={{ height:ITEM_H * PAD + 8, background:'linear-gradient(to top,var(--pick-fade, var(--bg)) 22%,transparent)' }}/>
        <div ref={ref} className="h-full overflow-y-auto no-scrollbar"
          style={{ scrollSnapType:'y mandatory', WebkitOverflowScrolling:'touch', touchAction:'pan-y', overscrollBehavior:'contain', WebkitTapHighlightColor:'transparent' }}>
          <div style={{ height:ITEM_H * PAD }}/>
          {items.map((item, i) => {
            const dist = Math.abs(i - idx), sel = i === idx;
            return (
              <div key={item.value ?? i} onClick={() => selectIndex(i)} style={{
                height:ITEM_H, scrollSnapAlign:'center', display:'flex', alignItems:'center', justifyContent:'center',
                opacity:sel ? 1 : Math.max(0.5, 1 - dist * 0.2),
                transform:`scale(${sel ? 1.12 : Math.max(0.84, 1 - dist * 0.06)})`,
                transition:'opacity .14s ease, transform .14s ease', userSelect:'none', cursor:'pointer', willChange:'opacity,transform' }}>
                <span style={{ color:sel ? '#fff' : 'rgba(236,234,246,0.92)', fontSize:sel ? '1.45rem' : '1.12rem', fontWeight:sel ? 800 : 500, textAlign:'center', lineHeight:1, transition:'color .14s ease' }}>
                  {renderItem ? renderItem(item, sel) : item.label}
                </span>
              </div>
            );
          })}
          <div style={{ height:ITEM_H * PAD }}/>
        </div>
      </div>
      {/* ▼ 아래로 버튼 */}
      <button onClick={stepDown} disabled={idx === items.length - 1} aria-label={`${label} 다음`}
        className="flex items-center justify-center rounded-2xl transition-opacity active:scale-95"
        style={{ width:'100%', height:36, background:'rgba(129,140,248,0.10)', border:'1px solid rgba(129,140,248,0.22)', opacity: idx === items.length - 1 ? 0.3 : 1 }}>
        <span style={{ color:'rgba(129,140,248,0.85)', fontSize:18, lineHeight:1 }}>▼</span>
      </button>
    </div>
  );
});

/* 12시진(時辰) — 사주 시주는 2시간 단위 지지로만 결정(분은 무관).
   value = 해당 지지 구간의 대표 시각(엔진 calculateIlju의 시 바인과 일치). */
const SIJIN_ITEMS = [
  { value:'모름', label:'시간 모름' },
  { value:'0',  label:'23 ~ 01시' },
  { value:'2',  label:'01 ~ 03시' },
  { value:'4',  label:'03 ~ 05시' },
  { value:'6',  label:'05 ~ 07시' },
  { value:'8',  label:'07 ~ 09시' },
  { value:'10', label:'09 ~ 11시' },
  { value:'12', label:'11 ~ 13시' },
  { value:'14', label:'13 ~ 15시' },
  { value:'16', label:'15 ~ 17시' },
  { value:'18', label:'17 ~ 19시' },
  { value:'20', label:'19 ~ 21시' },
  { value:'22', label:'21 ~ 23시' },
];
// 현재 birth.h(0~23) → 해당 시진의 대표 시각 값으로 환산(휠 선택 표시용)
const hourToSijin = (h) => {
  if (h === '모름' || h === '' || h == null) return '모름';
  const ch = parseInt(h);
  if (isNaN(ch)) return '모름';
  const ji = (ch >= 23 || ch < 1) ? 0 : Math.floor((ch + 1) / 2) % 12;
  return String([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22][ji]);
};

export const BirthInput = memo(({ birthData, setBirthData, label }) => {
  const monthItems = Array.from({ length:12 }, (_, i) => ({ value:String(i + 1), label:String(i + 1).padStart(2, '0') }));
  const dayItems = Array.from({ length:31 }, (_, i) => ({ value:String(i + 1), label:String(i + 1).padStart(2, '0') }));
  const set = (patch) => setBirthData({ ...birthData, ...patch });

  return (
    <div className="space-y-6">
      {label && <p className="text-[12px] font-bold tracking-wider" style={{ color:'rgba(129,140,248,0.7)' }}>{label}</p>}
      <div className="space-y-2">
        <label className="text-[13px] font-bold tracking-[0.06em] ml-1" style={{ color:'rgba(185,174,240,0.95)' }}>출생 연도</label>
        <input type="number" inputMode="numeric" placeholder="1990" maxLength={4} value={birthData.y}
          onChange={e => { set({ y:e.target.value.slice(0, 4) }); vibrate(6); }}
          className="w-full text-[32px] font-bold text-white outline-none tabular-nums rounded-2xl transition-colors"
          style={{ background:'rgba(20,24,46,0.9)', border:'1.5px solid rgba(255,255,255,0.14)', padding:'12px 18px' }}
          onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.65)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}/>
        {birthData.y?.length === 4 && (
          <p className="text-[14px] ml-1 font-medium" style={{ color:'var(--ink-dim)' }}>만 {new Date().getFullYear() - parseInt(birthData.y)}세</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WheelPicker items={monthItems} value={birthData.m} label="월" onChange={v => set({ m:v })}/>
        <WheelPicker items={dayItems} value={birthData.d} label="일" onChange={v => set({ d:v })}/>
      </div>
      <WheelPicker items={SIJIN_ITEMS} value={hourToSijin(birthData.h)} label="태어난 시"
        onChange={v => v === '모름' ? set({ h:'모름', min:'모름' }) : set({ h:v, min:'0' })}/>
    </div>
  );
});

/* ── 오행 심볼 ─────────────────────────────────────────────── */
const SVG = { display:'block', width:'100%', height:'100%' };
export const OhaengSymbol = memo(({ type, size = 128 }) => {
  const c = OHAENG[type]?.color || '#f0b429';
  const symbols = {
    목: <svg viewBox="0 0 200 200" style={SVG}><line x1="100" y1="180" x2="100" y2="75" stroke={c} strokeWidth="2.5" opacity="0.5"/><ellipse cx="100" cy="55" rx="32" ry="45" fill={c} opacity="0.22" transform="rotate(-12,100,55)"/><ellipse cx="82" cy="72" rx="26" ry="38" fill={c} opacity="0.32" transform="rotate(-25,82,72)"/><ellipse cx="118" cy="72" rx="26" ry="38" fill={c} opacity="0.32" transform="rotate(25,118,72)"/></svg>,
    화: <svg viewBox="0 0 200 200" style={SVG}><path d="M100,28 C55,85 45,125 72,158 C82,172 92,177 100,182 C108,177 118,172 128,158 C155,125 145,85 100,28Z" fill={c} opacity="0.22"/><path d="M100,58 C75,98 70,128 85,152 C92,162 96,167 100,170 C104,167 108,162 115,152 C130,128 125,98 100,58Z" fill={c} opacity="0.42"/><ellipse cx="100" cy="135" rx="14" ry="22" fill="#FF8C42" opacity="0.5"><animate attributeName="opacity" values="0.5;0.85;0.5" dur="2s" repeatCount="indefinite"/></ellipse></svg>,
    토: <svg viewBox="0 0 200 200" style={SVG}><path d="M18,172 L100,48 L182,172Z" fill={c} opacity="0.16"/><path d="M48,172 L112,78 L172,172Z" fill={c} opacity="0.26"/><path d="M68,172 L122,98 L162,172Z" fill={c} opacity="0.42"/></svg>,
    금: <svg viewBox="0 0 200 200" style={SVG}><polygon points="100,22 145,78 132,155 68,155 55,78" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/><polygon points="100,42 128,82 120,138 80,138 72,82" fill={c} opacity="0.12"/><line x1="100" y1="42" x2="100" y2="138" stroke={c} strokeWidth="0.7" opacity="0.25"/><line x1="72" y1="82" x2="128" y2="82" stroke={c} strokeWidth="0.7" opacity="0.25"/></svg>,
    수: <svg viewBox="0 0 200 200" style={SVG}><path d="M25,95 Q62,62 100,95 Q138,128 175,95" fill="none" stroke={c} strokeWidth="2.5" opacity="0.5"><animate attributeName="d" values="M25,95 Q62,62 100,95 Q138,128 175,95;M25,95 Q62,78 100,95 Q138,112 175,95;M25,95 Q62,62 100,95 Q138,128 175,95" dur="4s" repeatCount="indefinite"/></path><path d="M25,118 Q62,85 100,118 Q138,151 175,118" fill="none" stroke={c} strokeWidth="2" opacity="0.32"><animate attributeName="d" values="M25,118 Q62,85 100,118 Q138,151 175,118;M25,118 Q62,100 100,118 Q138,136 175,118;M25,118 Q62,85 100,118 Q138,151 175,118" dur="5s" repeatCount="indefinite"/></path><path d="M25,141 Q62,108 100,141 Q138,174 175,141" fill="none" stroke={c} strokeWidth="1.5" opacity="0.16"/></svg>,
  };
  return <div style={{ width:size, height:size, aspectRatio:'1/1', flexShrink:0 }}>{symbols[type] ?? symbols['토']}</div>;
});

/* ── 운의 흐름 미니 차트 ───────────────────────────────────── */
export const ScoreHistoryChart = memo(() => {
  const [history] = useState(() => {
    try { const raw = localStorage.getItem('cm_score_history'); if (raw) return JSON.parse(raw).slice(-7); } catch (e) {}
    return [];
  });
  if (history.length < 2) return null;
  const scores = history.map(h => h.score);
  const minS = Math.min(...scores), maxS = Math.max(...scores), range = maxS - minS || 1;
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const trend = scores[scores.length - 1] - scores[0];
  const W = 300, H = 96, P = 20, plotW = W - P * 2, plotH = H - P * 2 - 8;
  const pts = scores.map((s, i) => ({ x: P + (i / (scores.length - 1)) * plotW, y: P + plotH - ((s - minS) / range) * plotH, s }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = line + ` L${pts[pts.length - 1].x},${H - P + 8} L${pts[0].x},${H - P + 8} Z`;
  const wd = ['일','월','화','수','목','금','토'];
  const lastPt = pts[pts.length - 1];
  return (
    <div className="glass rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} style={{ color:'rgba(129,140,248,0.7)' }}/>
          <span className="text-[11.5px] font-bold" style={{ color:'var(--ink-dim)' }}>최근 운의 흐름</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>평균 {avg}점</span>
          <span className="text-[11px] font-bold"
            style={{ color: trend > 0 ? '#34d399' : trend < 0 ? '#fb7185' : 'var(--ink-faint)' }}>
            {trend > 0 ? `▲ ${trend}` : trend < 0 ? `▼ ${Math.abs(trend)}` : '→'}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display:'block', width:'100%', aspectRatio:`${W}/${H}` }} className="overflow-visible">
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d={area} fill="url(#histGrad)"/>
        <path d={line} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"/>
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          const isMax = p.s === maxS;
          return (
            <g key={i}>
              {isLast && <circle cx={p.x} cy={p.y} r={10} fill="rgba(167,139,250,0.15)"/>}
              <circle cx={p.x} cy={p.y} r={isLast ? 5 : isMax ? 4 : 3}
                fill={isLast ? '#a78bfa' : isMax ? '#e7b94f' : '#818cf8'}
                opacity={isLast ? 1 : isMax ? 0.9 : 0.65}
                filter={isLast ? 'url(#glow)' : undefined}/>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill={isLast ? '#a78bfa' : isMax ? '#e7b94f' : '#C4C0E0'}
                fontSize={isLast ? '9' : '8'} fontWeight={isLast || isMax ? '700' : '500'}>{p.s}</text>
              <text x={p.x} y={H - 2} textAnchor="middle" fill={isLast ? 'rgba(167,139,250,0.8)' : '#C4C0E0'}
                fontSize={isLast ? '8' : '7'} fontWeight={isLast ? '700' : '400'}
                opacity={isLast ? 1 : 0.6}>{wd[new Date(history[i]?.date).getDay()] || ''}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

/* ================================================================
   천문대 디자인 프리미티브 (C) — 신비로운 천문대 톤의 공통 조각.
   여러 화면이 같은 시각 언어를 쓰도록 표준화한다.
================================================================ */

/* 섹션 이름표 — 작은 대문자/넓은 자간. gold=신성 강조, 기본=은은. */
export const Eyebrow = ({ children, gold = false, color, className = '' }) => (
  <p className={`text-[12px] font-bold uppercase tracking-[0.2em] ${className}`}
    style={{ color: color || (gold ? 'var(--gold)' : 'rgba(255,255,255,0.5)') }}>
    {children}
  </p>
);

/* 금색 헤어라인 — 구분선/장식. */
export const GoldHairline = ({ className = '', width = '100%' }) => (
  <div className={`gold-hairline mx-auto ${className}`} style={{ width }}/>
);

/* 궤도 링 — '천문대' 프레이밍 장식(절대배치, 클릭 통과). 카드/공개 화면 뒤에 깐다. */
export const OrbitRings = ({ size = 260, color = 'rgba(231,185,79,0.18)', dot = true, className = '' }) => {
  const cx = size / 2;
  // 별자리 점들 — 황도12궁 느낌으로 큰 링에 12개, 중간 링에 5개
  const outerDots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = size * 0.47;
    return { x: cx + Math.cos(a) * r, y: cx + Math.sin(a) * r, bright: i % 3 === 0 };
  });
  const innerDots = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const r = size * 0.34;
    return { x: cx + Math.cos(a) * r, y: cx + Math.sin(a) * r };
  });
  return (
    <div className={`pointer-events-none ${className}`} style={{ width: size, height: size, position: 'relative' }} aria-hidden>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {/* 별자리 연결선 */}
        {outerDots.filter((_, i) => i % 2 === 0).map((p, i, arr) => {
          const next = arr[(i + 1) % arr.length];
          return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y}
            stroke={color} strokeWidth="0.6" opacity="0.5"/>;
        })}
        {/* 별점 */}
        {outerDots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.bright ? 2.2 : 1.3}
            fill={p.bright ? 'var(--gold)' : 'rgba(255,255,255,0.6)'}
            style={{ filter: p.bright ? 'drop-shadow(0 0 4px var(--gold))' : undefined }}/>
        ))}
        {innerDots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} opacity="0.8"/>
        ))}
      </svg>
      {[1, 0.74, 0.5].map((s, i) => (
        <div key={i} className="absolute rounded-full" style={{
          inset: `${(1 - s) * 50}%`, border: `1px solid ${color}`,
          animation: `orbit ${16 + i * 6}s linear infinite${i % 2 ? ' reverse' : ''}`,
        }}>
          {dot && i === 0 && <div className="absolute rounded-full" style={{
            top: -3, left: '50%', width: 6, height: 6, marginLeft: -3,
            background: 'var(--gold)', boxShadow: '0 0 14px 3px var(--gold)',
          }}/>}
          {i === 1 && <div className="absolute rounded-full" style={{
            bottom: -2.5, right: '25%', width: 5, height: 5,
            background: 'rgba(167,139,250,0.9)', boxShadow: '0 0 8px 2px rgba(167,139,250,0.6)',
          }}/>}
        </div>
      ))}
    </div>
  );
};

/* 오행 별자리 — 다섯 기운을 별자리로. 강한 기운은 크고 밝게, '오늘의 초점'(focus)엔 금빛 링.
   '오늘 그대는 火 기운이 강해요' 같은 진단을 직관적으로 보여주는 재사용 비주얼.
   props: distribution { 목:n,화:n,토:n,금:n,수:n }, focus(강조할 오행 키), size */
export const ElementConstellation = memo(({ distribution = {}, focus, size = 240 }) => {
  const [tapped, setTapped] = useState(null); // 탭한 오행 키
  const order = ['목', '화', '토', '금', '수'];
  const vals = order.map(k => Math.max(0, Number(distribution[k]) || 0));
  const max = Math.max(1, ...vals);
  const cx = size / 2, cy = size / 2, R = size * 0.34;
  const pts = order.map((k, i) => {
    const ang = -Math.PI / 2 + (i / order.length) * Math.PI * 2;
    return { k, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, v: vals[i] };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
  const tappedPt = tapped ? pts.find(p => p.k === tapped) : null;
  const tappedOh = tapped ? OHAENG[tapped] : null;

  const handleTap = (k) => {
    setTapped(prev => prev === k ? null : k);
    vibrate(5);
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} aria-label="오행 기운 별자리">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
        <path d={line} fill="none" stroke="rgba(231,185,79,0.28)" strokeWidth="1"/>
        {pts.map((p) => {
          const oh = OHAENG[p.k];
          const r = 5 + (p.v / max) * 13;
          const isFocus = focus === p.k;
          const isTapped = tapped === p.k;
          return (
            <g key={p.k} style={{ cursor: 'pointer' }} onClick={() => handleTap(p.k)}>
              {/* 탭 영역 확장 */}
              <circle cx={p.x} cy={p.y} r={r + 16} fill="transparent"/>
              <circle cx={p.x} cy={p.y} r={r + 10} fill={oh.color} opacity={isTapped ? 0.25 : 0.10 + (p.v / max) * 0.18}/>
              <circle cx={p.x} cy={p.y} r={r} fill={oh.color}
                opacity={0.5 + (p.v / max) * 0.5}
                style={{ transition:'r 0.2s ease, opacity 0.2s ease' }}/>
              {(isFocus || isTapped) && (
                <circle cx={p.x} cy={p.y} r={r + 7} fill="none"
                  stroke={isTapped ? oh.color : 'var(--gold)'}
                  strokeWidth={isTapped ? 1.8 : 1.5}
                  strokeDasharray={isTapped ? 'none' : '3 3'}
                  opacity={isTapped ? 0.9 : 0.8}/>
              )}
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="700"
                fill="#fff" style={{ fontFamily: "'Noto Serif KR', serif", pointerEvents:'none' }}>{oh.hanja}</text>
            </g>
          );
        })}
      </svg>
      {/* 탭 시 오행 이름 툴팁 */}
      {tappedPt && tappedOh && (
        <div className="absolute pointer-events-none animate-fade-in"
          style={{
            left: tappedPt.x / size * 100 + '%',
            top: tappedPt.y / size * 100 + '%',
            transform: 'translate(-50%, -140%)',
            zIndex: 20,
          }}>
          <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl"
            style={{ background:`${tappedOh.color}ee`, backdropFilter:'blur(8px)',
              boxShadow:`0 4px 16px ${tappedOh.color}55`, minWidth:60 }}>
            <span className="text-[11px] font-black text-white">{tappedOh.plain}</span>
            <span className="text-[10px] text-white" style={{ opacity:0.75 }}>
              {Math.round((tappedPt.v / (vals.reduce((a,b)=>a+b,0)||1)) * 100)}%
            </span>
          </div>
          <div style={{ width:0, height:0, margin:'0 auto',
            borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
            borderTop:`6px solid ${tappedOh.color}ee` }}/>
        </div>
      )}
    </div>
  );
});

/* 공개 의식(B) — 엎어둔 카드를 탭하면 뒤집혀 '오늘의 처방'이 공개된다.
   균형 강도: 평소엔 조용하다가 이 순간에만 모션+햅틱으로 보상을 몰아준다.
   사운드는 결합도를 낮추려 onReveal 콜백으로 호출부(playSuccess)에 위임.
   props: back(공개될 카드 노드·정사각 권장), hint, accent, onReveal */
export function RitualReveal({ back, hint = '탭해서 펼쳐보세요', accent = 'var(--gold)', onReveal, className = '' }) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => { if (flipped) return; setFlipped(true); vibrate([28, 50, 80]); onReveal?.(); };
  return (
    <div className={`flip-scene w-full ${className}`}>
      <div className={`flip-3d w-full ${flipped ? 'is-flipped' : ''}`} style={{ aspectRatio: '1 / 1' }}>
        {/* 앞면 — 엎어둔 카드 */}
        <button onClick={flip} aria-label={hint} disabled={flipped}
          className="flip-face card-glint w-full h-full rounded-[24px] overflow-hidden active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(160deg,#141133,#0b0a1c)', border: `1px solid ${accent}55`, boxShadow: `0 16px 48px ${accent}22` }}>
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-80"><OrbitRings size={210}/></div>
            <span className="serif relative" style={{ fontSize: 44, color: accent, textShadow: `0 0 24px ${accent}` }}>✦</span>
            <span className="relative text-[14px] font-bold px-6 text-center" style={{ color: 'rgba(255,255,255,0.82)' }}>{hint}</span>
            <span className="relative animate-ritual-glow text-[11px] font-bold tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.35)' }}>✦</span>
          </div>
        </button>
        {/* 뒷면 — 공개된 카드 */}
        <div className="flip-face flip-back w-full h-full">{back}</div>
      </div>
    </div>
  );
}

/* ── 프라이머리 버튼 ───────────────────────────────────────── */
export const PrimaryButton = ({ children, onClick, jewel = 'indigo', className = '', disabled, icon }) => {
  const j = JEWELS[jewel];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold text-[16px] transition-all active:scale-[0.97] ${disabled ? '' : 'btn-shine'} ${className}`}
      style={{ minHeight:60, color:'#fff',
        background: disabled ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${j.main} 0%, #a78bfa 110%)`,
        boxShadow: disabled ? 'none' : `0 12px 36px ${j.glow}, 0 2px 8px rgba(0,0,0,0.25)`,
        opacity: disabled ? 0.45 : 1,
        letterSpacing: '-0.01em' }}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
