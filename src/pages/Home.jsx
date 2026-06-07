import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: '#2d1018' }}>
      {/* NAVBAR */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 60px', height:'60px', background:'#3d1018', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ fontSize:'20px', fontWeight:700, color:'white', textDecoration:'none' }}>
          <span style={{ color:'#f79baa' }}>Velveth</span> Lending
        </Link>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <Link to="/login" style={{ padding:'8px 20px', border:'1.5px solid rgba(255,255,255,0.4)', color:'white', borderRadius:'4px', fontSize:'13px', textDecoration:'none' }}>
            Customer Login
          </Link>
          <Link to="/register" style={{ padding:'8px 20px', background:'var(--primary)', color:'white', borderRadius:'4px', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
            Register
          </Link>
          <Link to="/admin/login" style={{ padding:'6px 14px', background:'rgba(61,16,24,0.85)', color:'white', borderRadius:'4px', fontSize:'11px', textDecoration:'none', border:'1px solid rgba(255,255,255,0.3)' }}>
            🔐 Admin ↗
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background:'var(--primary)', padding:'80px 60px 90px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'relative', zIndex:2, maxWidth:'560px' }}>
          <p style={{ fontSize:'12px', letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.65)', marginBottom:'14px' }}>
            Fast &amp; Reliable Lending
          </p>
          <h1 style={{ fontSize:'38px', fontWeight:700, color:'white', lineHeight:1.25, marginBottom:'16px' }}>
            Get the financial support you need, fast.
          </h1>
          <p style={{ fontSize:'15px', color:'rgba(255,255,255,0.75)', marginBottom:'32px', lineHeight:1.7 }}>
            Easy application, quick approval, and real-time loan tracking — all in one place.
          </p>
          <Link to="/register" style={{ display:'inline-block', padding:'14px 32px', border:'2px solid white', color:'white', fontWeight:700, fontSize:'13px', letterSpacing:'1px', textTransform:'uppercase', textDecoration:'none', transition:'all 0.2s' }}
            onMouseEnter={e=>{ e.target.style.background='white'; e.target.style.color='var(--primary)' }}
            onMouseLeave={e=>{ e.target.style.background='transparent'; e.target.style.color='white' }}>
            APPLY NOW
          </Link>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section style={{ padding:'70px 60px', background:'#fff5f6', textAlign:'center' }}>
        <h2 style={{ fontSize:'30px', marginBottom:'50px', color:'#2d1018' }}>Why Choose Velveth Lending?</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'24px', maxWidth:'900px', margin:'0 auto' }}>
          {[
            { icon:'✅', title:'Quick Approval', desc:'Get your loan approved within 24 hours with our streamlined process.' },
            { icon:'🛡️', title:'Secure System', desc:'Your data is protected with industry-standard security measures.' },
            { icon:'📈', title:'Easy Tracking', desc:'Monitor your loan status and payments in real-time through our portal.' },
          ].map(f => (
            <div key={f.title} style={{ background:'white', padding:'40px 28px', borderRadius:'8px', border:'1px solid #fbc5cc', transition:'box-shadow 0.2s' }}>
              <div style={{ width:'60px', height:'60px', background:'var(--primary)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px' }}>{f.icon}</div>
              <h3 style={{ fontSize:'16px', fontWeight:700, marginBottom:'10px' }}>{f.title}</h3>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'70px 60px', background:'white' }}>
        <h2 style={{ fontSize:'32px', color:'var(--primary)', textAlign:'center', marginBottom:'50px' }}>How It Works</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'40px', maxWidth:'900px', margin:'0 auto 40px' }}>
          {[
            { num:'1', title:'Register', desc:'Fill out our online registration form with your personal details.' },
            { num:'2', title:'Get Approved', desc:'Our team reviews your application and approves it quickly.' },
            { num:'3', title:'Receive Funds', desc:'Once approved, receive your loan and start managing it online.' },
          ].map(s => (
            <div key={s.num} style={{ textAlign:'left' }}>
              <div style={{ fontSize:'64px', fontWeight:700, color:'var(--primary)', lineHeight:1 }}>{s.num}</div>
              <h3 style={{ fontSize:'15px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', margin:'8px 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center' }}>
          <Link to="/register" style={{ display:'inline-block', padding:'14px 36px', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'13px', letterSpacing:'1px', textTransform:'uppercase', textDecoration:'none', borderRadius:'4px' }}>
            APPLY NOW
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#3d1018', color:'rgba(255,255,255,0.7)', padding:'50px 60px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1.5fr', gap:'40px', paddingBottom:'40px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'white', marginBottom:'12px' }}><span style={{ color:'#f79baa' }}>Velveth</span> Lending</div>
            <p style={{ fontSize:'12.5px', lineHeight:1.8 }}>Providing reliable lending solutions in Davao City since 2020.</p>
          </div>
          <div>
            <h4 style={{ fontSize:'13px', fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px' }}>Quick Links</h4>
            <Link to="/register" style={{ display:'block', fontSize:'12.5px', color:'rgba(255,255,255,0.6)', textDecoration:'none', marginBottom:'8px' }}>Apply Now</Link>
            <Link to="/login" style={{ display:'block', fontSize:'12.5px', color:'rgba(255,255,255,0.6)', textDecoration:'none', marginBottom:'8px' }}>Customer Login</Link>
          </div>
          <div>
            <h4 style={{ fontSize:'13px', fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px' }}>Legal</h4>
            <span style={{ display:'block', fontSize:'12.5px', color:'rgba(255,255,255,0.6)', marginBottom:'8px' }}>Privacy Policy</span>
            <span style={{ display:'block', fontSize:'12.5px', color:'rgba(255,255,255,0.6)', marginBottom:'8px' }}>Terms &amp; Conditions</span>
          </div>
          <div>
            <h4 style={{ fontSize:'13px', fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px' }}>Contact Info</h4>
            <p style={{ fontSize:'12.5px', marginBottom:'8px' }}>📧 velveth@lending.com</p>
            <p style={{ fontSize:'12.5px', marginBottom:'8px' }}>📞 09307158807</p>
            <p style={{ fontSize:'12.5px' }}>📍 Claveria, Davao City</p>
          </div>
        </div>
        <div style={{ textAlign:'center', padding:'16px 0', fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>
          © 2026 Velveth Lending Company. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
