import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { notifyCustomerRegistered } from '../lib/gmail'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS  = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 18 - i)
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', address: '',
    dob_month: '', dob_day: '', dob_year: '',
    gender: '', civil_status: '', id_card: '', native_language: '',
    password: '', confirm_password: '', agree: false
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.agree)                            { setError('You must agree to the Terms and Privacy Policy.'); return }
    if (form.password.length < 9)               { setError('Password must be at least 9 characters.'); return }
    if (form.password !== form.confirm_password){ setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, phone: form.phone, address: form.address, role: 'customer' } }
      })
      if (signUpErr) { setError(signUpErr.message); return }
      notifyCustomerRegistered(form.email, form.full_name)
      setSuccess(true)
      toast.success('Account created!')
    } finally { setLoading(false) }
  }

  // ── Shared styles ──────────────────────────────────────────
  const S = {
    page:  { minHeight:'100vh', background:'#fff5f6', fontFamily:'Inter, Arial, sans-serif' },
    nav:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:'52px', background:'#3d1018', position:'sticky', top:0, zIndex:10 },
    card:  { maxWidth:'480px', margin:'0 auto', padding:'16px 16px 40px' },
    head:  { textAlign:'center', padding:'24px 0 20px' },
    lbl:   { display:'block', fontSize:'12px', fontWeight:600, color:'#5a3540', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.4px' },
    inp:   { width:'100%', padding:'12px 14px', border:'1.5px solid #e8d5d8', borderRadius:'10px', fontSize:'14px', color:'#2d1018', background:'white', outline:'none', WebkitAppearance:'none', appearance:'none' },
    group: { marginBottom:'14px' },
    row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' },
    row3:  { display:'grid', gridTemplateColumns:'1fr 1fr 1.1fr', gap:'8px' },
    err:   { background:'#fee2e2', border:'1px solid #fca5a5', color:'#dc2626', padding:'12px 14px', borderRadius:'10px', fontSize:'13px', marginBottom:'16px', textAlign:'center', lineHeight:1.5 },
    note:  { fontSize:'11px', color:'#888', fontStyle:'italic', lineHeight:1.6, marginBottom:'14px', padding:'10px 12px', background:'white', borderRadius:'8px', border:'1px solid #f0e8e9' },
    divider:{ height:'1px', background:'#f0e8e9', margin:'8px 0 16px' },
  }

  return (
    <div style={S.page}>

      {/* Nav */}
      <nav style={S.nav}>
        <Link to="/" style={{ fontSize:'18px', fontWeight:700, color:'white', textDecoration:'none' }}>
          <span style={{ color:'#f79baa' }}>Velveth</span> Lending
        </Link>
        <Link to="/login" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:'13px' }}>← Login</Link>
      </nav>

      <div style={S.card}>

        {/* Header */}
        <div style={S.head}>
          <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'#3d1018', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'26px', marginBottom:'12px' }}>
            📋
          </div>
          <h1 style={{ fontSize:'22px', fontWeight:700, color:'#2d1018', marginBottom:'4px' }}>Create Account</h1>
          <p style={{ fontSize:'13px', color:'#888' }}>VLC Mobile Registration</p>
        </div>

        {/* Success state */}
        {success ? (
          <div style={{ background:'white', borderRadius:'16px', padding:'32px 24px', textAlign:'center', boxShadow:'0 2px 20px rgba(190,90,106,0.1)', border:'1px solid #f0e8e9' }}>
            <div style={{ fontSize:'52px', marginBottom:'14px' }}>✅</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#2d1018', marginBottom:'10px' }}>Successfully Registered!</h3>
            <p style={{ fontSize:'13px', color:'#666', marginBottom:'24px', lineHeight:1.7 }}>
              Welcome to Velveth Lending App! You may now login to your account.
            </p>
            <button onClick={() => navigate('/login')}
              style={{ width:'100%', padding:'14px', background:'#be5a6a', color:'white', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:700, cursor:'pointer' }}>
              Go to Login
            </button>
          </div>
        ) : (

          <div style={{ background:'white', borderRadius:'16px', padding:'24px 20px', boxShadow:'0 2px 20px rgba(190,90,106,0.1)', border:'1px solid #f0e8e9' }}>

            {/* Error */}
            {error && <div style={S.err}>{error}</div>}

            <form onSubmit={handleSubmit}>

              {/* Personal Info */}
              <div style={{ fontSize:'11px', fontWeight:700, color:'#be5a6a', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>
                Personal Information
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Full Name *</label>
                <input style={S.inp} value={form.full_name} onChange={e=>set('full_name',e.target.value)} required placeholder="Juan Dela Cruz"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Email Address *</label>
                <input type="email" style={S.inp} value={form.email} onChange={e=>set('email',e.target.value)} required placeholder="juan@email.com"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Phone Number</label>
                <input style={S.inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="09XXXXXXXXX"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Address</label>
                <input style={S.inp} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Barangay, City"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
              </div>

              {/* Date of Birth */}
              <div style={S.group}>
                <label style={S.lbl}>Date of Birth</label>
                <div style={S.row3}>
                  <select style={S.inp} value={form.dob_month} onChange={e=>set('dob_month',e.target.value)}>
                    <option value="">Month</option>
                    {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                  <select style={S.inp} value={form.dob_day} onChange={e=>set('dob_day',e.target.value)}>
                    <option value="">Day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select style={S.inp} value={form.dob_year} onChange={e=>set('dob_year',e.target.value)}>
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Gender + Civil Status */}
              <div style={{ ...S.group, ...{} }}>
                <div style={S.row2}>
                  <div>
                    <label style={S.lbl}>Gender</label>
                    <select style={S.inp} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Civil Status</label>
                    <select style={S.inp} value={form.civil_status} onChange={e=>set('civil_status',e.target.value)}>
                      <option value="">Select</option>
                      <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ID Card + Language */}
              <div style={{ ...S.group }}>
                <div style={S.row2}>
                  <div>
                    <label style={S.lbl}>ID Card</label>
                    <select style={S.inp} value={form.id_card} onChange={e=>set('id_card',e.target.value)}>
                      <option value="">Select</option>
                      <option>PhilSys / National ID</option>
                      <option>Passport</option>
                      <option>Driver's License</option>
                      <option>SSS ID</option>
                      <option>GSIS ID</option>
                      <option>PRC ID</option>
                      <option>Voter's ID</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Language</label>
                    <select style={S.inp} value={form.native_language} onChange={e=>set('native_language',e.target.value)}>
                      <option value="">Select</option>
                      <option>Cebuano</option><option>Tagalog</option><option>Bisaya</option>
                      <option>Ilocano</option><option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={S.note}>
                📷 You will need to take a photo of your selected ID card during the loan application process.
              </div>

              <div style={S.divider} />

              {/* Password section */}
              <div style={{ fontSize:'11px', fontWeight:700, color:'#be5a6a', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>
                Set Password
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Create Password *</label>
                <input type="password" style={S.inp} value={form.password} onChange={e=>set('password',e.target.value)} required minLength={9} placeholder="Minimum 9 characters"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
              </div>

              <div style={S.group}>
                <label style={S.lbl}>Confirm Password *</label>
                <input type="password" style={S.inp} value={form.confirm_password} onChange={e=>set('confirm_password',e.target.value)} required placeholder="Re-enter password"
                  onFocus={e=>e.target.style.borderColor='#be5a6a'} onBlur={e=>e.target.style.borderColor='#e8d5d8'} />
                {form.confirm_password && form.password !== form.confirm_password && (
                  <p style={{ fontSize:'11px', color:'#dc2626', marginTop:'4px' }}>✗ Passwords do not match</p>
                )}
                {form.confirm_password && form.password === form.confirm_password && form.password.length >= 9 && (
                  <p style={{ fontSize:'11px', color:'#16a34a', marginTop:'4px' }}>✓ Passwords match</p>
                )}
              </div>

              <div style={S.divider} />

              {/* Terms checkbox */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'14px', background:'#fff5f6', borderRadius:'10px', border: form.agree ? '1.5px solid #be5a6a' : '1.5px solid #f0e8e9', marginBottom:'20px', cursor:'pointer' }}
                onClick={() => set('agree', !form.agree)}>
                <div style={{
                  width:'20px', height:'20px', borderRadius:'5px', flexShrink:0, marginTop:'1px',
                  background: form.agree ? '#be5a6a' : 'white',
                  border: form.agree ? '2px solid #be5a6a' : '2px solid #d4a0a8',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.15s'
                }}>
                  {form.agree && <span style={{ color:'white', fontSize:'12px', fontWeight:700 }}>✓</span>}
                </div>
                <p style={{ fontSize:'13px', color:'#5a3540', lineHeight:1.6, userSelect:'none' }}>
                  I have read and agree to the{' '}
                  <span style={{ color:'#be5a6a', fontWeight:600, textDecoration:'underline' }}
                    onClick={e => e.stopPropagation()}>
                    Terms &amp; Conditions
                  </span>
                  {' '}and{' '}
                  <span style={{ color:'#be5a6a', fontWeight:600, textDecoration:'underline' }}
                    onClick={e => e.stopPropagation()}>
                    Privacy Policy
                  </span>
                </p>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading || !form.agree}
                style={{
                  width:'100%', padding:'15px', border:'none', borderRadius:'12px',
                  background: (!form.agree || loading) ? '#d4a0a8' : '#be5a6a',
                  color:'white', fontSize:'15px', fontWeight:700, cursor: (!form.agree || loading) ? 'not-allowed' : 'pointer',
                  transition:'background 0.2s'
                }}>
                {loading ? '⏳ Creating Account…' : 'Create Account'}
              </button>

              <p style={{ textAlign:'center', marginTop:'18px', fontSize:'13px', color:'#888' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#be5a6a', textDecoration:'none', fontWeight:600 }}>Login here</Link>
              </p>

            </form>
          </div>
        )}
      </div>
    </div>
  )
}
