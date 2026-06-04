/* ================================================================
   천문 — OG 카드 렌더러 (1200×630, 결과별 동적 미리보기)
   self-contained HTML 문자열을 만든다. 브라우저(헤드리스 크롬) 안에서
   인라인 캔버스로 그린다 → api/og.js가 스크린샷, 로컬 프리뷰도 같은 HTML 사용.
   공유 카드(shareCard.js)와 같은 시각 언어(밤하늘·성운·별가루·오행 질감).
   * 외부 import 없음(브라우저 컨텍스트에서 독립 실행) — 의도적 중복.
================================================================ */

// 오행 색(saju.js OHAENG와 동기화) — 서버는 ESM import가 까다로워 값만 복제
const OH = {
  목: '#34d399', 화: '#fb7185', 토: '#f0b429', 금: '#cbd5e1', 수: '#818cf8',
};

export function ogParams(query = {}) {
  const g = (k, d = '') => (query[k] != null ? String(query[k]) : d);
  const scoreRaw = g('s');
  return {
    headline: g('t', '천문'),
    score: scoreRaw === '' ? null : Math.max(0, Math.min(100, parseInt(scoreRaw, 10) || 0)),
    sub: g('q'),
    ilju: g('i'),
    element: g('e'),
    accent: '#' + (g('c').replace(/[^0-9a-fA-F]/g, '') || 'a78bfa'),
  };
}

export function buildOgHtml(p) {
  const accent = p.accent || OH[p.element] || '#a78bfa';
  const data = JSON.stringify({ ...p, accent });
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>html,body{margin:0;background:#070611}#c{display:block}</style></head>
<body><canvas id="c" width="1200" height="630"></canvas>
<script>
const P = ${data};
const W = 1200, H = 630, CX = 430, CY = H/2; // 좌측에 아트, 우측에 텍스트
function hexA(hex,a){const h=String(hex).replace('#','');const f=h.length===3?h.split('').map(c=>c+c).join(''):h;const n=parseInt(f,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
function hash(s){let h=2166136261>>>0;s=String(s||'천문');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function wrap(ctx,text,max){const ws=String(text||'').trim().split(/\\s+/);const ls=[];let l='';for(const w of ws){const t=l?l+' '+w:w;if(l&&ctx.measureText(t).width>max){ls.push(l);l=w;}else l=t;}if(l)ls.push(l);return ls;}
function draw(){
  const ctx=document.getElementById('c').getContext('2d');
  const rand=rng(hash(P.headline+'|'+P.ilju+'|'+P.sub+'|'+P.score));
  const accent=P.accent;
  // 밤하늘 + 성운
  const bg=ctx.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#120e26');bg.addColorStop(0.6,'#0c0a1c');bg.addColorStop(1,'#070611');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const neb=ctx.createRadialGradient(CX,CY,0,CX,CY,420);neb.addColorStop(0,hexA(accent,0.32));neb.addColorStop(0.45,hexA(accent,0.10));neb.addColorStop(1,'transparent');
  ctx.fillStyle=neb;ctx.fillRect(0,0,W,H);
  // 별가루
  for(let i=0;i<160;i++){const x=rand()*W,y=rand()*H,r=rand()*1.6+0.2;ctx.globalAlpha=rand()*0.6+0.06;ctx.fillStyle=rand()>0.78?accent:'#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  // 오행 질감(요약판)
  elementTexture(ctx,P.element,accent,rand);
  // 궤도 링
  [260,190,130].forEach((r,i)=>{ctx.strokeStyle=hexA('#fff',0.05+i*0.012);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.stroke();});
  // 별자리(중앙 안전지대 비움)
  const SAFE=150,n=6+Math.floor(rand()*3),baseR=230,st=rand()*Math.PI*2,stars=[];
  for(let i=0;i<n;i++){const a=st+(i/n)*Math.PI*2+(rand()-0.5)*0.5;const rr=Math.max(SAFE+24,baseR*(0.8+rand()*0.4));stars.push({x:CX+Math.cos(a)*rr,y:CY+Math.sin(a)*rr,m:rand()*3+2});}
  ctx.strokeStyle=hexA(accent,0.28);ctx.lineWidth=1.2;
  for(let i=0;i<stars.length;i++){const a=stars[i],b=stars[(i+1)%stars.length];const px=CX-a.x,py=CY-a.y,dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy||1;let t=(px*dx+py*dy)/L;t=Math.max(0,Math.min(1,t));const ex=a.x+t*dx-CX,ey=a.y+t*dy-CY;if(Math.hypot(ex,ey)<SAFE)continue;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  stars.forEach(s=>{const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.m*3);g.addColorStop(0,'rgba(255,255,255,0.85)');g.addColorStop(0.4,hexA(accent,0.7));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.m*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.85)';ctx.beginPath();ctx.arc(s.x,s.y,s.m*0.6,0,Math.PI*2);ctx.fill();});
  // 꽃잎 만다라
  const petals=10+Math.floor(rand()*6),pr=130,rot=rand()*Math.PI;
  ctx.save();ctx.translate(CX,CY);ctx.rotate(rot);
  for(let i=0;i<petals;i++){ctx.rotate(Math.PI*2/petals);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(pr*0.42,-pr*0.5,0,-pr);ctx.quadraticCurveTo(-pr*0.42,-pr*0.5,0,0);ctx.fillStyle=hexA(accent,0.05);ctx.fill();ctx.strokeStyle=hexA(accent,0.16);ctx.lineWidth=1;ctx.stroke();}
  ctx.restore();
  // 중앙: 점수 링 또는 한자/제목 글로우
  ctx.textAlign='center';ctx.textBaseline='alphabetic';
  if(typeof P.score==='number'){
    const R=110;ctx.lineWidth=14;ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.stroke();
    const ring=ctx.createLinearGradient(CX-R,CY-R,CX+R,CY+R);ring.addColorStop(0,accent);ring.addColorStop(1,'#a78bfa');ctx.strokeStyle=ring;ctx.beginPath();ctx.arc(CX,CY,R,-Math.PI/2,-Math.PI/2+(P.score/100)*Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 116px "Noto Serif KR",serif';ctx.shadowColor=hexA(accent,0.7);ctx.shadowBlur=24;ctx.fillText(String(P.score),CX,CY+38);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='700 20px "Noto Sans KR",sans-serif';ctx.fillText('SCORE',CX,CY+78);
  }else{
    // 제목은 우측 블록에 크게 나오므로, 좌측 중심엔 오행 한자(심볼)만 — 중복 방지
    const hanja={목:'木',화:'火',토:'土',금:'金',수:'水'}[P.element]||'天';
    const core=ctx.createRadialGradient(CX,CY,0,CX,CY,150);core.addColorStop(0,hexA(accent,0.32));core.addColorStop(1,'transparent');ctx.fillStyle=core;ctx.beginPath();ctx.arc(CX,CY,150,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='900 128px "Noto Serif KR",serif';ctx.shadowColor=hexA(accent,0.8);ctx.shadowBlur=28;
    ctx.textBaseline='middle';ctx.fillText(hanja,CX,CY+4);ctx.textBaseline='alphabetic';ctx.shadowBlur=0;
  }
  // 우측 텍스트 블록
  const RX=760;ctx.textAlign='left';
  ctx.fillStyle=accent;ctx.font='700 24px "Noto Sans KR",sans-serif';ctx.fillText('天 文  ·  AI 명리학 운세',RX,150);
  ctx.fillStyle='#fff';ctx.font='900 52px "Noto Serif KR",serif';
  const titleTop=typeof P.score==='number'?(P.ilju?('일주 '+P.ilju):'오늘의 운세'):P.headline;
  wrap(ctx,titleTop,380).slice(0,2).forEach((ln,i)=>ctx.fillText(ln,RX,232+i*64));
  if(P.sub){ctx.fillStyle='rgba(240,238,250,0.92)';ctx.font='500 30px "Noto Serif KR",serif';wrap(ctx,'“'+P.sub+'”',390).slice(0,4).forEach((ln,i)=>ctx.fillText(ln,RX,392+i*44));}
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='700 22px "Noto Sans KR",sans-serif';ctx.fillText('천문에서 내 운세 보기  ✦',RX,H-70);
  // 외곽 프레임
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=2;rr(ctx,28,28,W-56,H-56,22);ctx.stroke();
  window.__ready=true;
}
function elementTexture(ctx,el,accent,rand){
  ctx.save();
  if(el==='화'){for(let i=0;i<70;i++){const x=rand()*W,y=H-rand()*rand()*H,r=rand()*3+0.6;ctx.globalAlpha=(1-y/H)*0.5+0.05;ctx.fillStyle=rand()>0.5?accent:'#ffd27a';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
  else if(el==='수'){ctx.lineWidth=1.4;for(let row=0;row<4;row++){const by=120+row*150,amp=12+rand()*22,ph=rand()*Math.PI*2;ctx.strokeStyle=hexA(accent,0.10+rand()*0.06);ctx.beginPath();for(let x=0;x<=W;x+=14){const y=by+Math.sin(x/90+ph)*amp;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}}
  else if(el==='목'){ctx.translate(CX,CY);const br=5+Math.floor(rand()*3);for(let i=0;i<br;i++){const a=rand()*Math.PI*2,len=200+rand()*160;ctx.strokeStyle=hexA(accent,0.16);ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(Math.cos(a+0.4)*len*0.5,Math.sin(a+0.4)*len*0.5,Math.cos(a)*len,Math.sin(a)*len);ctx.stroke();}}
  else if(el==='금'){ctx.translate(CX,CY);ctx.rotate(-Math.PI/5);for(let i=0;i<8;i++){const x=-W+i*(W*1.4/8)+rand()*40;const g=ctx.createLinearGradient(x,-H,x,H);g.addColorStop(0,'transparent');g.addColorStop(0.5,hexA(accent,0.10+rand()*0.06));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x,-H,2+rand()*3,H*2);}}
  else{for(let i=0;i<4;i++){const y=120+i*150+(rand()-0.5)*30;const g=ctx.createLinearGradient(0,y-24,0,y+24);g.addColorStop(0,'transparent');g.addColorStop(0.5,hexA(accent,0.07+rand()*0.04));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,y-24,W,48);}}
  ctx.restore();
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// 한글 폰트 서브셋 로드 보장(중요): 구글폰트 한글은 유니코드 범위별로 쪼개 제공되므로
// load()에 '실제 그릴 텍스트'를 함께 넘겨야 해당 서브셋이 받아진다(안 그러면 □ 두부).
// 그리고 check()가 true가 될 때까지 폴링한 뒤에만 그린다.
async function boot(){
  // 카드에 등장하는 모든 한글 + 고정 라벨을 한 덩어리로
  const TXT='천문에서내운세보기일주오늘의운세명리학가나다라마바사아자차카타파하'
    +(P.headline||'')+(P.sub||'')+(P.ilju||'')+'木火土金水';
  const faces=['900 128px "Noto Serif KR"','900 64px "Noto Serif KR"','900 52px "Noto Serif KR"',
    '500 30px "Noto Serif KR"','700 24px "Noto Sans KR"','500 20px "Noto Sans KR"'];
  try{
    const load=()=>Promise.allSettled(faces.map(f=>document.fonts.load(f,TXT)));
    const t0=Date.now();
    await load(); await document.fonts.ready;
    // 핵심 글리프가 준비될 때까지 최대 7초 폴링(서버리스 콜드 네트워크 대비)
    while(Date.now()-t0<7000 && !(document.fonts.check('900 64px "Noto Serif KR"',TXT)
      && document.fonts.check('700 24px "Noto Sans KR"',TXT))){
      await new Promise(r=>setTimeout(r,120)); await load();
    }
  }catch(e){}
  draw();
}
boot();
</script></body></html>`;
}
