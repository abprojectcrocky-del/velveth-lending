import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { notifyCustomerRegistered } from '../lib/gmail'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 18 - i)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
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

    if (!form.agree) { setError('You must agree to the Terms and Privacy Policy.'); return }
    if (form.password.length < 9) { setError('Password must be at least 9 characters.'); return }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            phone: form.phone,
            address: form.address,
            role: 'customer'
          }
        }
      })
      if (signUpErr) { setError(signUpErr.message); return }
      // Welcome Gmail
      notifyCustomerRegistered(form.email, form.full_name)
      setSuccess(true)
      toast.success('Account created! You can now sign in.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'4px', color:'white', fontSize:'13.5px' }
  const labelStyle = { display:'block', fontSize:'11.5px', fontWeight:600, color:'rgba(255,255,255,0.7)', marginBottom:'5px' }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#fde8eb', fontFamily:'Inter, Arial, sans-serif' }}>
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:'52px', background:'#3d1018' }}>
        <Link to="/" style={{ fontSize:'18px', fontWeight:700, color:'white', textDecoration:'none' }}>
          <span style={{ color:'#f79baa' }}>Velveth</span> Lending
        </Link>
        <Link to="/login" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:'13px' }}>← Back to Login</Link>
      </nav>

      <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'36px 20px 48px' }}>
        <div style={{ background:'var(--primary)', borderRadius:'8px', padding:'36px 40px', width:'100%', maxWidth:'580px', boxShadow:'0 20px 60px rgba(61,16,24,0.35)' }}>
          <h1 style={{ fontSize:'22px', fontWeight:700, color:'white', textAlign:'center', marginBottom:'4px' }}>VLC Mobile Registration</h1>
          <p style={{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', textAlign:'center', marginBottom:'24px' }}>Create your account</p>

          {success ? (
            <div style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#6ee7b7', padding:'20px', borderRadius:'8px', textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
              <h3 style={{ fontSize:'18px', marginBottom:'8px' }}>You Successfully Registered!</h3>
              <p style={{ fontSize:'13px', marginBottom:'16px', lineHeight:1.6 }}>You are successfully registered to Velveth Lending App. You may now login to your account.</p>
              <button onClick={() => navigate('/login')} className="btn btn-success" style={{ margin:'0 auto' }}>Go to Login</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', padding:'10px 14px', borderRadius:'4px', fontSize:'13px', marginBottom:'16px', textAlign:'center' }}>
                  {error}
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Full Name</label>
                  <input style={inputStyle} value={form.full_name} onChange={e=>set('full_name',e.target.value)} required placeholder="Juan Dela Cruz" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e=>set('email',e.target.value)} required />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Phone Number</label>
                  <input style={inputStyle} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="09XXXXXXXXX" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Barangay, City" />
                </div>

                {/* Date of Birth */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Date of Birth</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.2fr', gap:'8px' }}>
                    <select style={{ ...inputStyle, appearance:'none' }} value={form.dob_month} onChange={e=>set('dob_month',e.target.value)}>
                      <option value="">Month</option>
                      {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                    </select>
                    <select style={{ ...inputStyle, appearance:'none' }} value={form.dob_day} onChange={e=>set('dob_day',e.target.value)}>
                      <option value="">Date</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select style={{ ...inputStyle, appearance:'none' }} value={form.dob_year} onChange={e=>set('dob_year',e.target.value)}>
                      <option value="">Year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Gender</label>
                  <select style={{ ...inputStyle, appearance:'none' }} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                    <option value="">Select Option</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Civil Status</label>
                  <select style={{ ...inputStyle, appearance:'none' }} value={form.civil_status} onChange={e=>set('civil_status',e.target.value)}>
                    <option value="">Select Option</option>
                    <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ID Card</label>
                  <select style={{ ...inputStyle, appearance:'none' }} value={form.id_card} onChange={e=>set('id_card',e.target.value)}>
                    <option value="">Select Option</option>
                    <option>PhilSys / National ID</option><option>Passport</option><option>Driver's License</option>
                    <option>SSS ID</option><option>GSIS ID</option><option>PRC ID</option><option>Voter's ID</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Native Language</label>
                  <select style={{ ...inputStyle, appearance:'none' }} value={form.native_language} onChange={e=>set('native_language',e.target.value)}>
                    <option value="">Select Option</option>
                    <option>Cebuano</option><option>Tagalog</option><option>Bisaya</option><option>Ilocano</option><option>Other</option>
                  </select>
                </div>

                <p style={{ gridColumn:'1/-1', fontSize:'11px', color:'rgba(255,255,255,0.45)', fontStyle:'italic', lineHeight:1.6 }}>
                  Note: You will need to take a picture of selected ID card later in the application process.
                </p>

                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Create Password</label>
                  <input type="password" style={inputStyle} value={form.password} onChange={e=>set('password',e.target.value)} required minLength={9} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <input type="password" style={inputStyle} value={form.confirm_password} onChange={e=>set('confirm_password',e.target.value)} required />
                  <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>Password must have at least 9 characters.</p>
                </div>

                <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'flex-start', gap:'10px', marginTop:'4px' }}>
                  <input type="checkbox" id="agree" checked={form.agree} onChange={e=>set('agree',e.target.checked)} style={{ marginTop:'3px', accentColor:'white' }} />
                  <label htmlFor="agree" style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', lineHeight:1.6, cursor:'pointer' }}>
                    I agree to the <span style={{ color:'white', textDecoration:'underline' }}>Terms &amp; Conditions</span> and <span style={{ color:'white', textDecoration:'underline' }}>Privacy Policy</span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-danger" style={{ width:'100%', justifyContent:'center', marginTop:'20px', fontSize:'14px', fontWeight:700, padding:'13px' }}>
                {loading ? 'Creating Account…' : 'Create Account'}
              </button>

              <p style={{ textAlign:'center', marginTop:'16px', fontSize:'12.5px', color:'rgba(255,255,255,0.5)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#6ee7b7', textDecoration:'none', fontWeight:600 }}>Login here</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
