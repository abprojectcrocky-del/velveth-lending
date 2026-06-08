import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{ minHeight:'100vh', background:'#3d1018', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif', display:'flex', flexDirection:'column' }}>

      {/* Status bar */}
      <div style={{ height:'44px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
        <span style={{ color:'white', fontSize:'12px', fontWeight:600 }}>9:41</span>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <span style={{ color:'white', fontSize:'12px' }}>●●●</span>
          <span style={{ color:'white', fontSize:'12px' }}>WiFi</span>
          <span style={{ color:'white', fontSize:'12px' }}>🔋</span>
        </div>
      </div>

      {/* Logo area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px 0' }}>
        {/* VLC Logo */}
        <div style={{ width:'100px', height:'100px', borderRadius:'28px', background:'linear-gradient(135deg,#be5a6a,#9e3f4e)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'24px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 60%)' }}/>
          <span style={{ fontSize:'52px', lineHeight:1, position:'relative', zIndex:1 }}>✓</span>
        </div>

        <h1 style={{ fontSize:'30px', fontWeight:800, color:'white', textAlign:'center', lineHeight:1.2, marginBottom:'10px' }}>
          Velveth Lending
        </h1>
        <p style={{ fontSize:'15px', color:'rgba(255,255,255,0.55)', textAlign:'center', lineHeight:1.6, maxWidth:'260px', marginBottom:'48px' }}>
          Fast &amp; reliable lending solutions — right on your phone.
        </p>

        {/* Feature pills */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginBottom:'48px' }}>
          {['⚡ Fast Approval','🔒 Secure','📊 Real-time'].map(f => (
            <div key={f} style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)', padding:'6px 14px', borderRadius:'100px', fontSize:'12px', fontWeight:500, border:'1px solid rgba(255,255,255,0.15)' }}>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding:'0 24px 40px' }}>
        <Link to="/register" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'16px', background:'white', color:'#3d1018', borderRadius:'14px', fontSize:'16px', fontWeight:700, textDecoration:'none', marginBottom:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
          Create Account
        </Link>
        <Link to="/login" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'16px', background:'rgba(255,255,255,0.12)', color:'white', borderRadius:'14px', fontSize:'16px', fontWeight:600, textDecoration:'none', marginBottom:'12px', border:'1px solid rgba(255,255,255,0.2)' }}>
          Sign In
        </Link>
        <div style={{ textAlign:'center' }}>
          <Link to="/admin/login" style={{ color:'rgba(255,255,255,0.35)', fontSize:'12px', textDecoration:'none' }}>
            🔐 Admin Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
