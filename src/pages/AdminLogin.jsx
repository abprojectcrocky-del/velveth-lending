import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError('Invalid email or password.'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id',data.user.id).single()
      if (!profile||profile.role!=='admin') { await supabase.auth.signOut(); setError('This account does not have admin access.'); return }
      toast.success('Admin access granted')
      navigate('/admin')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f0507', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif', display:'flex', flexDirection:'column' }}>

      <div style={{ height:'44px', display:'flex', alignItems:'center', padding:'0 20px' }}>
        <Link to="/" style={{ color:'rgba(255,255,255,0.5)', textDecoration:'none', fontSize:'13px' }}>← Back</Link>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 24px 48px' }}>
        <div style={{ width:'76px', height:'76px', borderRadius:'22px', background:'linear-gradient(135deg,#be5a6a,#7d2d3a)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'32px', marginBottom:'18px', boxShadow:'0 8px 32px rgba(190,90,106,0.5)' }}>
          🔐
        </div>
        <h1 style={{ fontSize:'24px', fontWeight:800, color:'white', marginBottom:'4px' }}>Admin Portal</h1>
        <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.35)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'32px' }}>Authorized Access Only</p>

        <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'24px 20px', width:'100%', maxWidth:'360px' }}>
          {error && (
            <div style={{ background:'rgba(255,59,48,0.15)', border:'1px solid rgba(255,59,48,0.25)', color:'#ff6b6b', padding:'12px', borderRadius:'10px', fontSize:'13px', marginBottom:'18px', textAlign:'center' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                style={{ width:'100%', padding:'13px 14px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', fontSize:'15px', color:'white', outline:'none' }}
                placeholder="admin@email.com" />
            </div>
            <div style={{ marginBottom:'24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Password</label>
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{ background:'none', border:'none', fontSize:'12px', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>{showPw?'Hide':'Show'}</button>
              </div>
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                style={{ width:'100%', padding:'13px 14px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', fontSize:'15px', color:'white', outline:'none' }}
                placeholder="••••••••••" />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#be5a6a,#9e3f4e)', color:'white', border:'none', borderRadius:'12px', fontSize:'16px', fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
              {loading?'⏳ Signing in…':'Sign in as Admin'}
            </button>
          </form>
        </div>

        <p style={{ marginTop:'24px', fontSize:'13px', color:'rgba(255,255,255,0.25)' }}>
          Customer?{' '}
          <Link to="/login" style={{ color:'rgba(255,255,255,0.5)', textDecoration:'none', fontWeight:600 }}>Sign in here</Link>
        </p>
      </div>
    </div>
  )
}
