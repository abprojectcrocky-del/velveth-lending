import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError('Invalid email or password.'); return }

      // Check role
      const { data: profile } = await supabase
        .from('profiles').select('role,status').eq('id', data.user.id).single()

      if (!profile || profile.role !== 'customer') {
        await supabase.auth.signOut()
        setError('No customer account found. Try the admin portal.')
        return
      }
      if (profile.status === 'suspended') {
        await supabase.auth.signOut()
        setError('Your account has been suspended. Please contact us.')
        return
      }
      toast.success('Welcome back!')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#fde8eb', fontFamily:'Inter, Arial, sans-serif' }}>
      {/* Top nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:'52px', background:'#3d1018' }}>
        <Link to="/" style={{ fontSize:'18px', fontWeight:700, color:'white', textDecoration:'none' }}>
          <span style={{ color:'#f79baa' }}>Velveth</span> Lending
        </Link>
        <Link to="/" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:'13px' }}>⊗ Back to Home</Link>
      </nav>

      {/* Card */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
        <div style={{ background:'var(--primary)', borderRadius:'8px', padding:'48px 44px', width:'100%', maxWidth:'400px', boxShadow:'0 20px 60px rgba(61,16,24,0.35)' }}>
          <div style={{ textAlign:'center', marginBottom:'24px' }}>
            <div style={{ width:'64px', height:'64px', background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'28px', marginBottom:'12px' }}>→</div>
            <h1 style={{ fontSize:'24px', fontWeight:700, color:'white', marginBottom:'4px' }}>Welcome back!</h1>
            <p style={{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>Customer Portal</p>
          </div>

          {error && (
            <div style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.2)', color:'#fca5a5', padding:'10px 14px', borderRadius:'4px', fontSize:'13px', marginBottom:'16px', textAlign:'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:'5px' }}>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'4px', color:'white', fontSize:'14px' }}
                placeholder="your@email.com" />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:'5px' }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'4px', color:'white', fontSize:'14px' }}
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-danger" style={{ width:'100%', justifyContent:'center', fontSize:'14px', fontWeight:700, padding:'13px' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop:'20px', textAlign:'center', display:'flex', flexDirection:'column', gap:'8px' }}>
            <Link to="/register" style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', textDecoration:'none' }}>
              Don't have an account? <span style={{ color:'white', textDecoration:'underline' }}>Create one</span>
            </Link>
            <Link to="/admin/login" style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px', textDecoration:'none' }}>
              Admin portal? <span style={{ textDecoration:'underline' }}>Open here ↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
