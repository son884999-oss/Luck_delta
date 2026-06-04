/* ================================================================
   천문 — 에러 바운더리
   렌더 중 예외가 나도 백색 화면 대신 다정한 안내 + 새로고침을 보여준다.
================================================================ */
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 운영 중 디버깅용 (콘솔). 시크릿/개인정보는 남기지 않는다.
    console.error('[천문] 렌더 오류', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: '100svh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 0, textAlign: 'center',
        padding: '0 32px',
        background: 'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(99,102,241,0.15) 0%, #07060d 55%), #07060d',
        color: '#F4F2FB',
        fontFamily: "'Noto Sans KR', system-ui, sans-serif",
      }}>
        {/* 별 장식 */}
        <div style={{ display:'flex', gap:10, marginBottom:24, opacity:0.4 }}>
          {[8,12,8].map((s,i) => <span key={i} style={{ fontSize:s, color:'#a78bfa' }}>✦</span>)}
        </div>
        <div style={{
          width:64, height:64, borderRadius:'50%', marginBottom:24,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(167,139,250,0.12)', border:'1.5px solid rgba(167,139,250,0.3)',
        }}>
          <span style={{ fontSize:28 }}>🌙</span>
        </div>
        <div style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 22, fontWeight: 700, marginBottom:12 }}>
          잠시 길을 잃었어요
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#C2BFD4', maxWidth: 300, marginBottom:32 }}>
          예상치 못한 문제가 생겼어요.<br/>새로고침하면 대부분 다시 잘 열린답니다.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            minHeight: 56, padding: '0 36px', borderRadius: 18,
            fontSize: 16, fontWeight: 700, color: '#fff', cursor:'pointer',
            border:'none', letterSpacing:'-0.01em',
            background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
            boxShadow: '0 12px 36px rgba(99,102,241,0.35)',
          }}>
          ✦ 천문으로 돌아가기
        </button>
        <p style={{ marginTop:16, fontSize:12, color:'rgba(255,255,255,0.2)' }}>
          문제가 반복되면 앱 데이터를 초기화해 보세요
        </p>
      </div>
    );
  }
}
