import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export default function Login() {
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
      if (authErr) { setError('Incorrect email or password.'); return }
      const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', data.user.id).single()
      if (!profile || profile.role !== 'customer') { await supabase.auth.signOut(); setError('No customer account found.'); return }
      if (profile.status === 'suspended')           { await supabase.auth.signOut(); setError('Account suspended. Contact support.'); return }
      toast.success('Welcome back!')
      navigate('/dashboard')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f7f2f3', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:'#3d1018', paddingBottom:'32px', paddingTop:'56px', textAlign:'center', position:'relative' }}>
        <Link to="/" style={{ position:'absolute', left:'20px', top:'56px', color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:'14px' }}>← Back</Link>
        <div style={{ width:'72px', height:'72px', borderRadius:'20px', background:'linear-gradient(135deg,#be5a6a,#9e3f4e)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'32px', marginBottom:'14px', boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
          ✓
        </div>
        <h1 style={{ fontSize:'22px', fontWeight:700, color:'white' }}>Welcome back</h1>
        <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginTop:'4px' }}>Sign in to your account</p>
      </div>

      {/* Form card */}
      <div style={{ flex:1, padding:'24px 20px 40px', marginTop:'-16px' }}>
        <div style={{ background:'white', borderRadius:'20px', padding:'24px 20px', boxShadow:'0 4px 24px rgba(190,90,106,0.1)' }}>

          {error && (
            <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', padding:'12px 14px', borderRadius:'10px', fontSize:'13px', marginBottom:'18px', textAlign:'center', lineHeight:1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#5a3540', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                className="inp-app" placeholder="your@email.com" />
            </div>

            <div style={{ marginBottom:'24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'#5a3540', textTransform:'uppercase', letterSpacing:'0.5px' }}>Password</label>
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{ background:'none', border:'none', fontSize:'12px', color:'var(--primary)', cursor:'pointer', fontWeight:500 }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                className="inp-app" placeholder="••••••••••" />
            </div>

            <button type="submit" disabled={loading} className="btn-app" style={{ borderRadius:'12px', fontSize:'16px', fontWeight:700, marginBottom:'16px' }}>
              {loading ? '⏳ Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:'14px', color:'#888' }}>
            No account yet?{' '}
            <Link to="/register" style={{ color:'var(--primary)', fontWeight:600, textDecoration:'none' }}>Create one</Link>
          </p>
        </div>

        <div style={{ textAlign:'center', marginTop:'20px' }}>
          <Link to="/admin/login" style={{ color:'#aaa', fontSize:'13px', textDecoration:'none' }}>Admin portal ↗</Link>
        </div>
      </div>
    </div>
  )
}
