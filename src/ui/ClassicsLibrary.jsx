/* ================================================================
   천문 — 고전 서재 (동양 고전 명구 모음 세션)
   오늘의 3구절(날짜+일주 시드) + 카테고리 탭(색 인장 테마) + 즐겨찾기.
   100% 로컬·오프라인.
================================================================ */
import { useState, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { calculateSaju, vibrate } from '../lib/saju.js';
import { playTap } from '../lib/audio.js';
import {
  CLASSICS, CLASSIC_CATEGORIES, classicCatColor, dailyThree, getClassicFavs, toggleClassicFav,
} from '../lib/classics.js';
import { BackBar } from './bits.jsx';
import { Eyebrow } from './celestial.jsx';

const GOLD = '#f0b429';
const hexA = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* 금빛 필리그리 구분선 — 헤더/하단 장식 */
function OrnLine({ w = 120 }) {
  return (
    <div className="flex items-center justify-center gap-2 mx-auto" style={{ width:w }}>
      <div style={{ flex:1, height:1, background:'linear-gradient(to right, transparent, rgba(240,180,41,0.45))' }}/>
      <span style={{ color:GOLD, fontSize:9, opacity:0.8 }}>✦</span>
      <div style={{ flex:1, height:1, background:'linear-gradient(to left, transparent, rgba(240,180,41,0.45))' }}/>
    </div>
  );
}

/* 명구 카드 — 카드 색은 그 구절의 카테고리 색(인장 테마)으로 변주 */
function ClassicCard({ item, fav, onFav, index = 0, featured = false }) {
  const a = classicCatColor(item.c);
  return (
    <div className={`rounded-[20px] px-5 ${featured ? 'py-7 luxe-sheen' : 'py-5'} relative overflow-hidden animate-fade-up`}
      style={{
        background: featured
          ? `linear-gradient(160deg, ${hexA(a, 0.18)} 0%, ${hexA(a, 0.04)} 58%, rgba(167,139,250,0.06) 100%)`
          : `linear-gradient(160deg, ${hexA(a, 0.09)} 0%, ${hexA(a, 0.02)} 100%)`,
        border:`1px solid ${hexA(a, featured ? 0.42 : 0.24)}`,
        boxShadow: featured ? `0 12px 40px ${hexA(a, 0.20)}, inset 0 0 0 1px ${hexA(a, 0.10)}` : `0 6px 22px ${hexA(a, 0.08)}`,
        animationDelay:`${index * 55}ms` }}>
      {/* 큰 따옴표 워터마크 */}
      <span className="serif absolute pointer-events-none select-none" style={{ top:featured ? -20 : -14, left:6, fontSize:featured ? 104 : 82, lineHeight:1, color:hexA(a, 0.12) }}>“</span>
      {/* 색 후광 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 74% 62% at 50% 22%, ${hexA(a, featured ? 0.18 : 0.10)}, transparent 70%)` }}/>
      {featured && (
        <div className="absolute pointer-events-none" style={{ width:'72%', aspectRatio:'1/1', top:'-26%', left:'14%', borderRadius:'50%',
          background:`conic-gradient(from 0deg, transparent, ${hexA(a, 0.16)}, transparent 40%, ${hexA(a, 0.11)}, transparent 70%, ${hexA(a, 0.16)}, transparent)`,
          animation:'halo-spin 22s linear infinite' }}/>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className="serif font-black leading-snug break-keep" style={{ fontSize: featured ? 29 : 23, letterSpacing:'0.05em', color:a, textShadow:`0 2px ${featured ? 20 : 12}px ${hexA(a, 0.4)}` }}>{item.h}</p>
        <button onClick={() => { onFav(item.h); vibrate(8); playTap(); }} aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
          className="flex-shrink-0 active:scale-90 transition-transform" style={{ padding:4 }}>
          <Heart size={20} fill={fav ? a : 'none'} style={{ color: fav ? a : 'rgba(255,255,255,0.35)', filter: fav ? `drop-shadow(0 0 6px ${hexA(a, 0.6)})` : 'none' }}/>
        </button>
      </div>
      <p className="relative font-semibold tracking-[0.2em] mt-1.5" style={{ fontSize:featured ? 13.5 : 12.5, color:'rgba(255,255,255,0.62)' }}>{item.e}</p>
      <div className="relative my-3 flex items-center gap-2">
        <span style={{ width:5, height:5, borderRadius:'50%', background:hexA(a, 0.75), boxShadow:`0 0 6px ${hexA(a, 0.5)}` }}/>
        <div style={{ flex:1, height:1, background:`linear-gradient(to right, ${hexA(a, 0.34)}, transparent)` }}/>
      </div>
      <p className="relative serif" style={{ fontSize:featured ? 16 : 15, color:'var(--ink)', lineHeight:1.72 }}>{item.m}</p>
      <p className="relative text-[11px] font-bold mt-3 tracking-wide" style={{ color:hexA(a, 0.85) }}>✦ {item.s}</p>
    </div>
  );
}

export default function ClassicsLibrary({ birth, onBack }) {
  const saju = useMemo(() => { try { return calculateSaju(birth); } catch { return null; } }, [birth]);
  const today = useMemo(() => dailyThree(saju), [saju]);
  const [tab, setTab] = useState('today'); // today | <카테고리 key> | fav
  const [favs, setFavs] = useState(() => getClassicFavs());

  const onFav = (h) => { toggleClassicFav(h); setFavs(getClassicFavs()); };

  const list = tab === 'today' ? today
    : tab === 'fav' ? CLASSICS.filter(x => favs.includes(x.h))
    : CLASSICS.filter(x => x.c === tab);

  const TABS = [
    { key:'today', label:'오늘의 3구절', color:GOLD },
    ...CLASSIC_CATEGORIES,
  ];

  return (
    <div className="py-10 space-y-5 pb-24 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>

      {/* 헤더 — 금빛 시머 타이틀 + 우상단 즐겨찾기 */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 sacred-glow"
            style={{ width:50, height:50, borderRadius:16, background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.34)' }}>
            <span style={{ fontSize:25 }}>📜</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="serif font-black leading-tight text-gold-shimmer" style={{ fontSize:'clamp(1.45rem,5.6vw,2rem)' }}>고전 서재</h2>
            <p className="text-[12.5px]" style={{ color:'var(--ink-dim)' }}>오늘 마음에 새길 한 구절</p>
          </div>
          <button onClick={() => { setTab(tab === 'fav' ? 'today' : 'fav'); playTap(); vibrate(8); }}
            className="flex-shrink-0 relative flex items-center justify-center rounded-full active:scale-90 transition-transform"
            style={{ width:44, height:44,
              background: tab === 'fav' ? 'rgba(240,180,41,0.18)' : 'rgba(255,255,255,0.05)',
              border:`1px solid ${tab === 'fav' ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.12)'}` }}
            aria-label={tab === 'fav' ? '서재로 돌아가기' : '즐겨찾기 보기'}>
            <Heart size={20} fill={tab === 'fav' ? GOLD : 'none'} style={{ color: tab === 'fav' ? GOLD : 'rgba(255,255,255,0.6)' }}/>
            {favs.length > 0 && (
              <span className="absolute flex items-center justify-center" style={{ top:-3, right:-3, minWidth:17, height:17, padding:'0 4px', borderRadius:9, background:GOLD, color:'#1a1205', fontSize:10, fontWeight:800, border:'1.5px solid #0b0f1e' }}>{favs.length}</span>
            )}
          </button>
        </div>
        <OrnLine w={150}/>
      </header>

      {/* 카테고리 탭 — 줄바꿈 + 색 인장 점(데스크톱·모바일 모두 스크롤 없이) */}
      <div className="flex flex-wrap gap-2 px-1">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); playTap(); vibrate(6); }}
              className="flex-shrink-0 flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-full transition-all active:scale-95"
              style={active
                ? { color:'#161008', background:`linear-gradient(135deg, ${t.color}, ${hexA(t.color, 0.72)})`, border:`1px solid ${t.color}`, boxShadow:`0 4px 14px ${hexA(t.color, 0.42)}` }
                : { color:hexA(t.color, 0.92), background:hexA(t.color, 0.08), border:`1px solid ${hexA(t.color, 0.24)}` }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:active ? '#161008' : t.color, opacity:active ? 0.45 : 1 }}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'today' && (
        <div className="flex items-center gap-2 px-1">
          <Eyebrow color={GOLD}>오늘의 3구절</Eyebrow>
          <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>매일 바뀌어요{saju?.ilju ? ` · 일주 ${saju.ilju}` : ''}</span>
        </div>
      )}
      {tab === 'fav' && (
        <div className="flex items-center gap-2 px-1">
          <Eyebrow color={GOLD}>즐겨찾기</Eyebrow>
          <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>{favs.length}개 보관 중</span>
        </div>
      )}

      <div className="space-y-3">
        {list.length ? list.map((item, i) => (
          <ClassicCard key={item.h} item={item} index={i} featured={tab === 'today' && i === 0} fav={favs.includes(item.h)} onFav={onFav}/>
        )) : (
          <div className="text-center py-16" style={{ color:'var(--ink-faint)' }}>
            <p className="text-[40px] mb-3">🤍</p>
            <p className="text-[13.5px]" style={{ lineHeight:1.7 }}>아직 즐겨찾기한 구절이 없어요.<br/>마음에 드는 구절의 하트를 눌러보세요.</p>
          </div>
        )}
      </div>

      {list.length > 0 && <OrnLine w={120}/>}
    </div>
  );
}
