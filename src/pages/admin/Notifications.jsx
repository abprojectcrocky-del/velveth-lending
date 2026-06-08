import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'

export default function AdminNotifications() {
  const { profile } = useAuth()
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showSend, setShowSend] = useState(false)
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({ user_id:'all', title:'', message:'', type:'info' })
  const [sending, setSending]   = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [notifRes, cusRes] = await Promise.all([
      supabase.from('notifications').select('*, profiles(full_name)').order('created_at',{ascending:false}).limit(100),
      supabase.from('profiles').select('id,full_name').eq('role','customer').eq('status','active').order('full_name')
    ])
    setNotifs(notifRes.data ?? [])
    setCustomers(cusRes.data ?? [])
    setLoading(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    try {
      let recipients = []
      if (form.user_id === 'all') {
        recipients = customers.map(c => c.id)
      } else {
        recipients = [form.user_id]
      }
      const inserts = recipients.map(uid => ({
        user_id: uid, title: form.title, message: form.message, type: form.type
      }))
      const { error } = await supabase.from('notifications').insert(inserts)
      if (error) { toast.error('Failed to send notification'); return }
      toast.success(`Notification sent to ${recipients.length} user(s)`)
      setShowSend(false)
      setForm({ user_id:'all', title:'', message:'', type:'info' })
      fetchAll()
    } finally { setSending(false) }
  }

  async function markAllRead() {
    if (!profile?.id) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    fetchAll()
    toast.success('All marked as read')
  }

  const fmtDate = d => {
    const date = new Date(d)
    const diff = Math.floor((new Date() - date) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return date.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})
  }

  const TYPE_ICON = { info:'ℹ️', success:'✅', warning:'⚠️', danger:'🔴' }
  const TYPE_STYLE = {
    info:    { bg:'#dbeafe', color:'#1d4ed8' },
    success: { bg:'#dcfce7', color:'#16a34a' },
    warning: { bg:'#fef3c7', color:'#d97706' },
    danger:  { bg:'#fee2e2', color:'#dc2626' },
  }

  const unreadCount = notifs.filter(n => !n.is_read && n.profiles?.full_name).length

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">
            Notifications {unreadCount > 0 && <span style={{ background:'var(--primary)', color:'white', fontSize:'11px', padding:'2px 8px', borderRadius:'100px', marginLeft:'8px' }}>{unreadCount} new</span>}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={markAllRead} className="btn btn-secondary" style={{ fontSize:'12px' }}>Mark all read</button>
            <button onClick={() => setShowSend(true)} className="btn btn-primary">+ Send Notification</button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-header"><h2>Notifications</h2><p>View all system and customer notifications</p></div>

          <div className="card-admin">
            <div className="card-header-admin"><h3>All Notifications ({notifs.length})</h3></div>
            {loading ? (
              <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
            ) : notifs.length === 0 ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#aaa' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : notifs.map(n => {
              const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.info
              return (
                <div key={n.id} style={{ display:'flex', gap:'14px', padding:'16px 24px', borderBottom:'1px solid #f0f0f0', background: n.is_read ? 'white' : '#fff8f0' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                    {TYPE_ICON[n.type] ?? 'ℹ️'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                      <div style={{ fontSize:'13px', fontWeight: n.is_read ? 400 : 700, color:'#2d1018' }}>{n.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                        {!n.is_read && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary)' }}/>}
                        <span style={{ fontSize:'11px', color:'#aaa' }}>{fmtDate(n.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'12px', color:'#666', marginTop:'3px', lineHeight:1.5 }}>{n.message}</div>
                    {n.profiles?.full_name && (
                      <div style={{ fontSize:'11px', color:'var(--primary)', marginTop:'4px', fontWeight:600 }}>→ {n.profiles.full_name}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Send Notification Modal */}
      {showSend && (
        <div className="modal-overlay-admin open" onClick={e=>{if(e.target===e.currentTarget)setShowSend(false)}}>
          <div className="modal-box">
            <div className="modal-header-admin">
              <h3>Send Notification</h3>
              <button onClick={()=>setShowSend(false)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <form onSubmit={handleSend}>
              <div className="modal-body-admin" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label className="form-label">Send To</label>
                  <select className="form-control" value={form.user_id} onChange={e=>setForm(f=>({...f,user_id:e.target.value}))}>
                    <option value="all">All Customers ({customers.length})</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    <option value="info">ℹ️ Info</option>
                    <option value="success">✅ Success</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="danger">🔴 Danger</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Title</label>
                  <input className="form-control" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="Notification title…" />
                </div>
                <div>
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} required placeholder="Write your message here…" />
                </div>
              </div>
              <div className="modal-footer-admin">
                <button type="button" onClick={()=>setShowSend(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={sending} className="btn btn-primary">
                  {sending ? 'Sending…' : '📤 Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
