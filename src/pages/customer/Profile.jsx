import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function CustomerProfile() {
  const { profile, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ full_name:'', phone:'', address:'' })
  const [loading, setLoading] = useState(false)
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' })
  const [pwLoading, setPwLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '', address: profile.address ?? '' })
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      let avatar_url = profile.avatar_url
      if (avatarFile) {
        const path = `avatars/${profile.id}/${Date.now()}.${avatarFile.name.split('.').pop()}`
        const { error: uploadErr } = await supabase.storage.from('documents').upload(path, avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
          avatar_url = urlData.publicUrl
        }
      }
      const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone, address: form.address, avatar_url, updated_at: new Date().toISOString() }).eq('id', profile.id)
      if (error) { toast.error('Failed to update profile'); return }
      await fetchProfile(profile.id)
      toast.success('Profile updated!')
    } finally { setLoading(false) }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwForm.newPw.length < 9) { toast.error('Password must be at least 9 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    setPwForm({ current:'', newPw:'', confirm:'' })
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const inputStyle = { width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'14px', color:'#2d1018', background:'white' }
  const labelStyle = { display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textTransform:'uppercase' }
  const initials = profile?.full_name?.substring(0,2).toUpperCase() ?? 'VL'

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>My Profile</h1>
      </header>

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {/* Avatar */}
        <div style={{ background:'white', borderRadius:'12px', padding:'24px', boxShadow:'var(--shadow-sm)', textAlign:'center' }}>
          <label style={{ cursor:'pointer' }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'var(--primary)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'28px', fontWeight:700, marginBottom:'12px', overflow:'hidden', border:'3px solid var(--primary-muted)' }}>
              {avatarPreview || profile?.avatar_url ? (
                <img src={avatarPreview ?? profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : initials}
            </div>
            <div style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>Tap to change photo</div>
            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => {
              const f = e.target.files[0]
              if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
            }} />
          </label>
          <div style={{ marginTop:'8px' }}>
            <div style={{ fontSize:'16px', fontWeight:700, color:'#2d1018' }}>{profile?.full_name}</div>
            <div style={{ fontSize:'12px', color:'#888' }}>{profile?.email}</div>
            <span style={{ display:'inline-block', marginTop:'6px', background:'var(--primary-pale)', color:'var(--primary)', padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:600, textTransform:'capitalize' }}>
              {profile?.role}
            </span>
          </div>
        </div>

        {/* Edit profile */}
        <div style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'var(--shadow-sm)' }}>
          <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px', color:'#2d1018' }}>Edit Profile</h3>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom:'14px' }}>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={labelStyle}>Email Address</label>
              <input style={{ ...inputStyle, background:'#f5f5f5', color:'#888' }} value={profile?.email ?? ''} disabled />
              <p style={{ fontSize:'11px', color:'#aaa', marginTop:'4px' }}>Email cannot be changed here.</p>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09XXXXXXXXX" />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Barangay, City" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:'14px', fontWeight:700 }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'var(--shadow-sm)' }}>
          <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px', color:'#2d1018' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom:'14px' }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" style={inputStyle} value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="At least 9 characters" required />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" style={inputStyle} value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} required />
            </div>
            <button type="submit" disabled={pwLoading} className="btn btn-secondary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:'14px' }}>
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="btn btn-danger" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'14px', fontWeight:700 }}>
          🚪 Logout
        </button>
      </div>
      <CustomerNav />
    </div>
  )
}
