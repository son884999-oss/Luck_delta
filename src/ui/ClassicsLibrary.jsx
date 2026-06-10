/* ================================================================
   천문 — 고전 서재 (동양 고전 명구 모음 세션)
   오늘의 3구절(날짜+일주 시드) + 카테고리 탭 + 즐겨찾기. 100% 로컬·오프라인.
================================================================ */
import { useState, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { calculateSaju, vibrate } from '../lib/saju.js';
import { playTap } from '../lib/audio.js';
import {
  CLASSICS, CLASSIC_CATEGORIES, dailyThree, getClassicFavs, toggleClassicFav,
} from '../lib/classics.js';
import { BackBar } from './bits.jsx';
import { Eyebrow } from './celestial.jsx';

const GOLD = '#f0b429';

function ClassicCard({ item, fav, onFav, index = 0 }) {
  return (
    <div className="rounded-2xl px-5 py-5 relative overflow-hidden animate-fade-up"
      style={{ background:'linear-gradient(160deg, rgba(240,180,41,0.09), rgba(240,180,41,0.02))',
        border:'1px solid rgba(240,180,41,0.24)', boxShadow:'0 6px 24px rgba(240,180,41,0.08)',
        animationDelay:`${index * 45}ms` }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 72% 60% at 50% 26%, rgba(240,180,41,0.10), transparent 70%)' }}/>
      <div className="relative flex items-start justify-between gap-3">
        <p className="serif font-black leading-snug break-keep" style={{ fontSize:23, letterSpacing:'0.05em', color:GOLD, textShadow:'0 2px 12px rgba(240,180,41,0.28)' }}>{item.h}</p>
        <button onClick={() => { onFav(item.h); vibrate(8); playTap(); }} aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
          className="flex-shrink-0 active:scale-90 transition-transform" style={{ padding:4 }}>
          <Heart size={20} fill={fav ? GOLD : 'none'} style={{ color: fav ? GOLD : 'rgba(255,255,255,0.35)' }}/>
        </button>
      </div>
      <p className="relative text-[12.5px] font-semibold tracking-[0.2em] mt-1.5" style={{ color:'rgba(255,255,255,0.6)' }}>{item.e}</p>
      <p className="relative serif text-[15px] mt-3" style={{ color:'var(--ink)', lineHeight:1.7 }}>{item.m}</p>
      <p className="relative text-[11px] font-bold mt-3" style={{ color:'rgba(240,180,41,0.8)' }}>— {item.s}</p>
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
    { key:'today', label:'오늘의 3구절' },
    ...CLASSIC_CATEGORIES,
    { key:'fav', label:`♡ 즐겨찾기${favs.length ? ` ${favs.length}` : ''}` },
  ];

  return (
    <div className="py-10 space-y-5 pb-24 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0"
            style={{ width:48, height:48, borderRadius:16, background:'rgba(240,180,41,0.12)', border:'1px solid rgba(240,180,41,0.28)' }}>
            <span style={{ fontSize:24 }}>📜</span>
          </div>
          <div className="min-w-0">
            <h2 className="serif font-bold text-white leading-tight" style={{ fontSize:'clamp(1.4rem,5.5vw,1.9rem)' }}>고전 서재</h2>
            <p className="text-[12.5px]" style={{ color:'var(--ink-dim)' }}>오늘 마음에 새길 한 구절</p>
          </div>
        </div>
      </header>

      {/* 카테고리 탭 — 가로 스크롤 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); playTap(); vibrate(6); }}
            className="flex-shrink-0 text-[12.5px] font-bold px-3.5 py-2 rounded-full transition-all active:scale-95"
            style={tab === t.key
              ? { color:'#1a1205', background:GOLD, border:`1px solid ${GOLD}` }
              : { color:'rgba(240,180,41,0.85)', background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.22)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="flex items-center gap-2 px-1">
          <Eyebrow color={GOLD}>오늘의 3구절</Eyebrow>
          <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>매일 바뀌어요{saju?.ilju ? ` · 일주 ${saju.ilju}` : ''}</span>
        </div>
      )}

      <div className="space-y-3">
        {list.length ? list.map((item, i) => (
          <ClassicCard key={item.h} item={item} index={i} fav={favs.includes(item.h)} onFav={onFav}/>
        )) : (
          <div className="text-center py-16" style={{ color:'var(--ink-faint)' }}>
            <p className="text-[40px] mb-3">🤍</p>
            <p className="text-[13.5px]" style={{ lineHeight:1.7 }}>아직 즐겨찾기한 구절이 없어요.<br/>마음에 드는 구절의 하트를 눌러보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
