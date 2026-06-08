import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function CustomerProfile() {
  const { profile, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [form,      setForm]      = useState({ full_name:'', phone:'', address:'' })
  const [loading,   setLoading]   = useState(false)
  const [pwForm,    setPwForm]    = useState({ newPw:'', confirm:'' })
  const [pwLoading, setPwLoading] = useState(false)
  const [section,   setSection]   = useState(null) // 'edit' | 'password' | null

  useEffect(() => {
    if (profile) setForm({ full_name:profile.full_name??'', phone:profile.phone??'', address:profile.address??'' })
  }, [profile])

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ full_name:form.full_name, phone:form.phone, address:form.address, updated_at:new Date().toISOString() }).eq('id',profile.id)
    if (error) { toast.error('Update failed'); setLoading(false); return }
    await fetchProfile(profile.id)
    toast.success('Profile updated!')
    setLoading(false)
    setSection(null)
  }

  async function handlePasswordChange() {
    if (pwForm.newPw.length < 9) { toast.error('Password must be at least 9 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    setPwForm({ newPw:'', confirm:'' })
    setSection(null)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name?.substring(0,2).toUpperCase() ?? 'VL'

  const inp = { width:'100%', padding:'13px 14px', background:'#f2f2f7', border:'none', borderRadius:'10px', fontSize:'15px', color:'#2d1018', outline:'none' }
  const lbl = { display:'block', fontSize:'12px', fontWeight:600, color:'#5a3540', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }

  return (
    <div style={{ background:'#f7f2f3', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(160deg,#3d1018 0%,#7d2d3a 100%)', padding:'52px 20px 40px', textAlign:'center' }}>
        <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'3px solid rgba(255,255,255,0.4)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'28px', fontWeight:700, marginBottom:'12px' }}>
          {initials}
        </div>
        <h1 style={{ color:'white', fontSize:'20px', fontWeight:700 }}>{profile?.full_name}</h1>
        <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginTop:'3px' }}>{profile?.email}</p>
        <span style={{ display:'inline-block', marginTop:'8px', background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.9)', padding:'4px 12px', borderRadius:'100px', fontSize:'11px', fontWeight:600, textTransform:'capitalize', border:'1px solid rgba(255,255,255,0.2)' }}>
          {profile?.role} · {profile?.status}
        </span>
      </div>

      <div style={{ padding:'16px 16px 100px' }}>

        {/* Info rows */}
        <p style={{ fontSize:'12px', fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>My Information</p>
        <div style={{ background:'white', borderRadius:'14px', overflow:'hidden', marginBottom:'14px', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
          {[
            ['👤', 'Full Name', profile?.full_name],
            ['📧', 'Email',     profile?.email],
            ['📞', 'Phone',     profile?.phone ?? '—'],
            ['📍', 'Address',   profile?.address ?? '—'],
          ].map(([icon,label,value],i,arr) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderBottom: i<arr.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
              <span style={{ fontSize:'18px', width:'28px', textAlign:'center' }}>{icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:'11px', color:'#aaa', marginBottom:'1px' }}>{label}</p>
                <p style={{ fontSize:'14px', color:'#2d1018', fontWeight:500 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <p style={{ fontSize:'12px', fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Settings</p>
        <div style={{ background:'white', borderRadius:'14px', overflow:'hidden', marginBottom:'14px', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
          {[
            { icon:'✏️', label:'Edit Profile',     action:()=>setSection(section==='edit'?null:'edit') },
            { icon:'🔑', label:'Change Password',   action:()=>setSection(section==='password'?null:'password') },
          ].map((item,i,arr) => (
            <div key={item.label}>
              <div onClick={item.action} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'15px 16px', borderBottom: i<arr.length-1?'0.5px solid rgba(0,0,0,0.06)':'none', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
                <span style={{ fontSize:'18px', width:'28px', textAlign:'center' }}>{item.icon}</span>
                <p style={{ flex:1, fontSize:'15px', color:'#2d1018' }}>{item.label}</p>
                <span style={{ color:'#c7c7cc', fontSize:'16px' }}>{section===item.label.split(' ').join('').toLowerCase()?'∨':'›'}</span>
              </div>

              {/* Edit Profile inline */}
              {item.label==='Edit Profile' && section==='edit' && (
                <div style={{ padding:'14px 16px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', background:'#fafafa' }}>
                  <div style={{ marginBottom:'12px' }}><label style={lbl}>Full Name</label><input style={inp} value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} /></div>
                  <div style={{ marginBottom:'12px' }}><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div style={{ marginBottom:'14px' }}><label style={lbl}>Address</label><input style={inp} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <button onClick={()=>setSection(null)} style={{ padding:'12px', background:'#f2f2f7', color:'#333', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={handleSave} disabled={loading} style={{ padding:'12px', background:'var(--primary)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                      {loading?'Saving…':'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Change password inline */}
              {item.label==='Change Password' && section==='password' && (
                <div style={{ padding:'14px 16px', background:'#fafafa' }}>
                  <div style={{ marginBottom:'12px' }}><label style={lbl}>New Password</label><input type="password" style={inp} value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="Min 9 characters" /></div>
                  <div style={{ marginBottom:'14px' }}><label style={lbl}>Confirm Password</label><input type="password" style={inp} value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} /></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <button onClick={()=>setSection(null)} style={{ padding:'12px', background:'#f2f2f7', color:'#333', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={handlePasswordChange} disabled={pwLoading} style={{ padding:'12px', background:'var(--primary)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                      {pwLoading?'Updating…':'Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={{ width:'100%', padding:'15px', background:'white', color:'#ff3b30', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:600, cursor:'pointer', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
          🚪 Sign Out
        </button>
      </div>

      <CustomerNav />
    </div>
  )
}
