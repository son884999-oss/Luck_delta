/* ================================================================
   천문 — 고전 서재 (동양 고전 명구 모음 세션) · 제로베이스 재설계
   2-모드: [오늘의 지혜](히어로 1 + 컴팩트 2) / [고전 둘러보기](카테고리 선택 + 소개 + 리스트)
   즐겨찾기는 헤더 우상단. 100% 로컬·오프라인. 성능: 블러·회전 애니메이션 없음.
================================================================ */
import { useState, useMemo } from 'react';
import { Heart, ChevronLeft } from 'lucide-react';
import { calculateSaju, vibrate } from '../lib/saju.js';
import { playTap } from '../lib/audio.js';
import {
  CLASSICS, CLASSIC_CATEGORIES, classicCatColor, dailyThree, getClassicFavs, toggleClassicFav,
} from '../lib/classics.js';
import { BackBar } from './bits.jsx';

const GOLD = '#f0b429';
const hexA = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* 오늘의 한 구절 — 중앙 정렬 히어로(서재의 얼굴) */
function HeroQuote({ item, fav, onFav }) {
  const a = classicCatColor(item.c);
  return (
    <div className="rounded-[22px] px-6 py-8 relative overflow-hidden text-center animate-fade-up"
      style={{ background:`linear-gradient(165deg, ${hexA(a, 0.16)} 0%, ${hexA(a, 0.04)} 60%, rgba(18,14,32,0.35) 100%)`,
        border:`1px solid ${hexA(a, 0.4)}`, boxShadow:`0 14px 40px ${hexA(a, 0.16)}, inset 0 0 0 1px ${hexA(a, 0.08)}` }}>
      <span className="serif absolute select-none pointer-events-none" style={{ top:-10, left:16, fontSize:92, lineHeight:1, color:hexA(a, 0.13) }}>“</span>
      <div className="relative">
        <div className="text-[10px] font-bold tracking-[0.3em] mb-4" style={{ color:hexA(a, 0.92) }}>오늘의 한 구절</div>
        <p className="serif font-black break-keep" style={{ fontSize:31, letterSpacing:'0.05em', color:a, lineHeight:1.32, textShadow:`0 2px 16px ${hexA(a, 0.3)}` }}>{item.h}</p>
        <p className="text-[12.5px] font-semibold tracking-[0.26em] mt-3" style={{ color:'rgba(255,255,255,0.6)' }}>{item.e}</p>
        <div className="mx-auto my-5" style={{ width:62, height:1, background:`linear-gradient(to right, transparent, ${hexA(a, 0.65)}, transparent)` }}/>
        <p className="serif text-[16px] px-1" style={{ color:'var(--ink)', lineHeight:1.78 }}>{item.m}</p>
        <div className="flex items-center justify-center gap-3.5 mt-6">
          <span className="text-[11px] font-bold tracking-wide" style={{ color:hexA(a, 0.85) }}>✦ {item.s}</span>
          <button onClick={() => { onFav(item.h); vibrate(8); playTap(); }} aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
            className="active:scale-90 transition-transform" style={{ padding:2 }}>
            <Heart size={19} fill={fav ? a : 'none'} style={{ color: fav ? a : 'rgba(255,255,255,0.4)' }}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* 컴팩트 구절 카드 — 둘러보기·오늘의 보조·즐겨찾기 공용(스캔하기 쉽게) */
function ListQuote({ item, fav, onFav, index = 0 }) {
  const a = classicCatColor(item.c);
  return (
    <div className="rounded-2xl pl-3.5 pr-4 py-4 relative animate-fade-up flex gap-3.5"
      style={{ background:`linear-gradient(160deg, ${hexA(a, 0.07)}, ${hexA(a, 0.015)})`, border:`1px solid ${hexA(a, 0.2)}`, animationDelay:`${index * 35}ms` }}>
      <div className="flex-shrink-0 rounded-full" style={{ width:3, background:`linear-gradient(${a}, ${hexA(a, 0.25)})` }}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="serif font-black break-keep" style={{ fontSize:19, letterSpacing:'0.03em', color:a, lineHeight:1.35 }}>{item.h}</p>
          <button onClick={() => { onFav(item.h); vibrate(8); playTap(); }} aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
            className="flex-shrink-0 active:scale-90 transition-transform" style={{ padding:2 }}>
            <Heart size={17} fill={fav ? a : 'none'} style={{ color: fav ? a : 'rgba(255,255,255,0.3)' }}/>
          </button>
        </div>
        <p className="text-[11px] font-semibold tracking-[0.16em] mt-1" style={{ color:'rgba(255,255,255,0.52)' }}>{item.e}</p>
        <p className="serif text-[14px] mt-2" style={{ color:'var(--ink-dim)', lineHeight:1.68 }}>{item.m}</p>
        <p className="text-[10.5px] font-bold mt-2 tracking-wide" style={{ color:hexA(a, 0.8) }}>— {item.s}</p>
      </div>
    </div>
  );
}

export default function ClassicsLibrary({ birth, onBack }) {
  const saju = useMemo(() => { try { return calculateSaju(birth); } catch { return null; } }, [birth]);
  const today = useMemo(() => dailyThree(saju), [saju]);
  const [mode, setMode] = useState('today'); // today | browse | fav
  const [cat, setCat] = useState(CLASSIC_CATEGORIES[0].key);
  const [favs, setFavs] = useState(() => getClassicFavs());

  const onFav = (h) => { toggleClassicFav(h); setFavs(getClassicFavs()); };
  const isFav = (h) => favs.includes(h);

  const catMeta = CLASSIC_CATEGORIES.find(c => c.key === cat) || CLASSIC_CATEGORIES[0];
  const browseList = useMemo(() => CLASSICS.filter(x => x.c === cat), [cat]);
  const favList = CLASSICS.filter(x => favs.includes(x.h));

  return (
    <div className="py-10 space-y-5 pb-24 animate-fade-up">
      <BackBar onBack={onBack} label="뒤로가기"/>

      {/* 헤더 */}
      <header className="flex items-center gap-3">
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ width:48, height:48, borderRadius:15, background:'rgba(240,180,41,0.13)', border:'1px solid rgba(240,180,41,0.3)' }}>
          <span style={{ fontSize:24 }}>📜</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="serif font-black leading-tight" style={{ fontSize:'clamp(1.4rem,5.4vw,1.85rem)', color:'var(--ink)' }}>고전 서재</h2>
          <p className="text-[12px]" style={{ color:'var(--ink-dim)' }}>동양 고전 속 오늘의 지혜</p>
        </div>
        <button onClick={() => { setMode(mode === 'fav' ? 'today' : 'fav'); playTap(); vibrate(8); }}
          className="flex-shrink-0 relative flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{ width:44, height:44,
            background: mode === 'fav' ? 'rgba(240,180,41,0.18)' : 'rgba(255,255,255,0.05)',
            border:`1px solid ${mode === 'fav' ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.12)'}` }}
          aria-label={mode === 'fav' ? '서재로 돌아가기' : '즐겨찾기 보기'}>
          <Heart size={20} fill={mode === 'fav' ? GOLD : 'none'} style={{ color: mode === 'fav' ? GOLD : 'rgba(255,255,255,0.6)' }}/>
          {favs.length > 0 && (
            <span className="absolute flex items-center justify-center" style={{ top:-3, right:-3, minWidth:17, height:17, padding:'0 4px', borderRadius:9, background:GOLD, color:'#1a1205', fontSize:10, fontWeight:800, border:'1.5px solid #0b0f1e' }}>{favs.length}</span>
          )}
        </button>
      </header>

      {/* 즐겨찾기 모드 */}
      {mode === 'fav' ? (
        <>
          <button onClick={() => { setMode('today'); playTap(); vibrate(6); }}
            className="flex items-center gap-1 text-[13px] font-semibold active:scale-95 transition-transform" style={{ color:'var(--ink-dim)' }}>
            <ChevronLeft size={16}/> 서재로
          </button>
          <div className="flex items-baseline gap-2 px-0.5">
            <h3 className="serif font-bold text-[18px]" style={{ color:GOLD }}>즐겨찾기</h3>
            <span className="text-[11.5px]" style={{ color:'var(--ink-faint)' }}>{favs.length}개 보관 중</span>
          </div>
          <div className="space-y-2.5">
            {favList.length ? favList.map((item, i) => (
              <ListQuote key={item.h} item={item} index={i} fav onFav={onFav}/>
            )) : (
              <div className="text-center py-16" style={{ color:'var(--ink-faint)' }}>
                <p className="text-[40px] mb-3">🤍</p>
                <p className="text-[13.5px]" style={{ lineHeight:1.7 }}>아직 즐겨찾기한 구절이 없어요.<br/>마음에 드는 구절의 하트를 눌러보세요.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 세그먼트: 오늘의 지혜 / 고전 둘러보기 */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            {[['today', '오늘의 지혜'], ['browse', '고전 둘러보기']].map(([k, label]) => (
              <button key={k} onClick={() => { setMode(k); playTap(); vibrate(6); }}
                className="flex-1 text-[13px] font-bold py-2.5 rounded-xl transition-all active:scale-[0.98]"
                style={mode === k
                  ? { color:'#161008', background:`linear-gradient(135deg, ${GOLD}, #ffd98a)`, boxShadow:'0 3px 12px rgba(240,180,41,0.32)' }
                  : { color:'rgba(255,255,255,0.6)', background:'transparent' }}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'today' && (
            <>
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color:hexA(GOLD, 0.85) }}>오늘의 지혜</span>
                <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>매일 바뀌어요{saju?.ilju ? ` · 일주 ${saju.ilju}` : ''}</span>
              </div>
              {today[0] && <HeroQuote item={today[0]} fav={isFav(today[0].h)} onFav={onFav}/>}
              <div className="space-y-2.5">
                {today.slice(1).map((item, i) => (
                  <ListQuote key={item.h} item={item} index={i} fav={isFav(item.h)} onFav={onFav}/>
                ))}
              </div>
            </>
          )}

          {mode === 'browse' && (
            <>
              {/* 카테고리 선택 — 한 줄 가로 스크롤(휠·스와이프) */}
              <div className="relative -mx-1">
                <div onWheel={(e) => { if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY; }}
                  className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1" style={{ scrollBehavior:'smooth' }}>
                  {CLASSIC_CATEGORIES.map(c => {
                    const active = cat === c.key;
                    return (
                      <button key={c.key} onClick={() => { setCat(c.key); playTap(); vibrate(6); }}
                        className="flex-shrink-0 flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-full transition-all active:scale-95"
                        style={active
                          ? { color:'#161008', background:`linear-gradient(135deg, ${c.color}, ${hexA(c.color, 0.72)})`, border:`1px solid ${c.color}`, boxShadow:`0 4px 14px ${hexA(c.color, 0.42)}` }
                          : { color:hexA(c.color, 0.92), background:hexA(c.color, 0.08), border:`1px solid ${hexA(c.color, 0.24)}` }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:active ? '#161008' : c.color, opacity:active ? 0.45 : 1 }}/>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <div className="absolute left-0 top-0 w-7 pointer-events-none" style={{ bottom:4, background:'linear-gradient(to right, var(--bg), transparent)' }}/>
                <div className="absolute right-0 top-0 w-7 pointer-events-none" style={{ bottom:4, background:'linear-gradient(to left, var(--bg), transparent)' }}/>
              </div>

              {/* 카테고리 소개 헤더 */}
              <div className="px-0.5">
                <div className="flex items-center gap-2.5">
                  <span style={{ width:6, height:18, borderRadius:3, background:catMeta.color }}/>
                  <h3 className="serif font-bold text-[17px]" style={{ color:catMeta.color }}>{catMeta.label}</h3>
                  <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>{browseList.length}구절</span>
                </div>
                {catMeta.desc && <p className="text-[12px] mt-1.5" style={{ marginLeft:14, color:'var(--ink-dim)', lineHeight:1.55 }}>{catMeta.desc}</p>}
              </div>

              <div className="space-y-2.5">
                {browseList.map((item, i) => (
                  <ListQuote key={item.h} item={item} index={i} fav={isFav(item.h)} onFav={onFav}/>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
