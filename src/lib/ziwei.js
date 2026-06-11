/* ================================================================
   천문 — 자미두수 명반 계산 (iztro MIT 라이브러리 래퍼)
   iztro: https://github.com/SylarLong/iztro
================================================================ */
// iztro는 calcZiwei 안에서 동적 import → 메인 번들에서 분리(자미두수 화면 열 때만 로드)

/* ── 한국어 매핑 테이블 ── */
export const PALACE_KO = {
  soulPalace:     '명궁',   siblingsPalace: '형제궁', spousePalace:   '부처궁',
  childrenPalace: '자녀궁', wealthPalace:   '재백궁', healthPalace:   '질액궁',
  surfacePalace:  '천이궁', friendsPalace:  '노복궁', careerPalace:   '관록궁',
  propertyPalace: '전택궁', spiritPalace:   '복덕궁', parentsPalace:  '부모궁',
};

export const PALACE_DESC = {
  soulPalace:     '나의 본성과 기질',   siblingsPalace: '형제·친구 관계',
  spousePalace:   '배우자·연애운',       childrenPalace: '자녀·창조성',
  wealthPalace:   '재물·금전운',         healthPalace:   '건강·체질',
  surfacePalace:  '이동·변화운',         friendsPalace:  '부하·동료',
  careerPalace:   '직업·사회운',         propertyPalace: '부동산·재산',
  spiritPalace:   '정신·복덕',           parentsPalace:  '부모·윗사람',
};

export const STAR_KO = {
  ziweiMaj:'자미성', tianjiMaj:'천기성', taiyangMaj:'태양성',
  wuquMaj:'무곡성',  tiantongMaj:'천동성', lianzhenMaj:'염정성',
  tianfuMaj:'천부성', taiyinMaj:'태음성', tanlangMaj:'탐랑성',
  jumenMaj:'거문성', tianxiangMaj:'천상성', tianliangMaj:'천량성',
  qishaMaj:'칠살성', pojunMaj:'파군성',
};

export const STAR_DESC = {
  ziweiMaj:  '권위·지도력·고귀함',     tianjiMaj:  '지혜·변화·분석력',
  taiyangMaj:'열정·명예·사교성',        wuquMaj:    '재물·의지·독립심',
  tiantongMaj:'온화·복덕·예술성',       lianzhenMaj:'정열·규율·복잡성',
  tianfuMaj: '안정·풍요·자애',          taiyinMaj:  '섬세·감성·재물',
  tanlangMaj:'매력·욕망·다재다능',      jumenMaj:   '언변·구설·학문',
  tianxiangMaj:'보좌·균형·성실',        tianliangMaj:'장수·자비·청렴',
  qishaMaj:  '돌파·용기·고독',          pojunMaj:   '변혁·개척·파괴와 창조',
};

export const BRIGHTNESS_KO = {
  miao: '묘(廟) — 최강', wang: '왕(旺) — 강함', de: '득(得) — 양호',
  li:   '利 — 보통',     ping: '평(平) — 약함', xian: '陷 — 약함',
  bu:   '불(不) — 미약', xiu: '休 — 휴식',
};

export const FIVE_ELEMENTS_KO = {
  water2nd: '수2국(水二局)', wood3rd: '목3국(木三局)', metal4th: '금4국(金四局)',
  fire6th: '화6국(火六局)', earth5th: '토5국(土五局)',
};

export const SIGN_KO = {
  aries:'양자리', taurus:'황소자리', gemini:'쌍둥이자리', cancer:'게자리',
  leo:'사자자리', virgo:'처녀자리', libra:'천칭자리', scorpio:'전갈자리',
  sagittarius:'사수자리', capricorn:'염소자리', aquarius:'물병자리', pisces:'물고기자리',
};

/* ── 명반 계산 ── */
export async function calcZiwei(birth, gender = 'male') {
  try {
    const { astro } = await import('iztro'); // 지연 로드 — iztro(2.5MB)를 초기 번들에서 분리
    const { y, m, d, h } = birth;
    const hour = (h === '모름' || h == null || h === '') ? 12 : parseInt(h);
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const r = astro.bySolar(dateStr, hour, gender, true, 'ko');

    const palaces = r.palaces.map(p => ({
      key:        p.name,
      name:       PALACE_KO[p.name] || p.name,
      desc:       PALACE_DESC[p.name] || '',
      isSoul:     p.name === 'soulPalace',
      isBody:     p.isBodyPalace,
      majorStars: p.majorStars.map(s => ({
        key:        s.name,
        name:       STAR_KO[s.name] || s.name,
        desc:       STAR_DESC[s.name] || '',
        brightness: BRIGHTNESS_KO[s.brightness] || s.brightness,
        brightnessKey: s.brightness,
      })),
      minorStars:  (p.minorStars || []).map(s => STAR_KO[s.name] || s.name).slice(0,4),
    }));

    const soulPalace = palaces.find(p => p.isSoul);
    const mainStar   = soulPalace?.majorStars[0] || null;

    return {
      ok: true,
      palaces,
      soulPalace,
      mainStar,
      fiveElements: FIVE_ELEMENTS_KO[r.fiveElementsClass] || r.fiveElementsClass,
      fiveElementsKey: r.fiveElementsClass,
      sign: SIGN_KO[r.sign] || r.sign,
      signKey: r.sign,
      zodiac: r.zodiac,
      lunarDate: r.lunarDate,
      chineseDate: r.chineseDate,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* 명반 요약 한 줄 — AI 프롬프트용 */
export function ziweiSummaryLine(zw) {
  if (!zw?.ok) return '';
  const soul = zw.soulPalace;
  const stars = soul?.majorStars.map(s => s.name).join('·') || '없음';
  return `자미두수: 명궁(${zw.soulPalace?.name}) 주성 ${stars}, 오행국 ${zw.fiveElements}`;
}
