import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

const TYPE_STYLE = {
  success: { bg:'#dcfce7', color:'#16a34a', icon:'✅' },
  warning: { bg:'#fef3c7', color:'#d97706', icon:'⚠️' },
  danger:  { bg:'#fee2e2', color:'#dc2626', icon:'🔴' },
  info:    { bg:'#dbeafe', color:'#1d4ed8', icon:'ℹ️' },
}

function notifLink(title, message) {
  const t = (title + ' ' + message).toLowerCase()
  if (t.includes('payment') || t.includes('paid')) return '/payments'
  if (t.includes('penalty') || t.includes('late')) return '/penalties'
  if (t.includes('loan') && (t.includes('approved') || t.includes('active'))) return '/my-loan'
  if (t.includes('loan') || t.includes('application')) return '/my-loan'
  if (t.includes('document')) return '/apply'
  return '/dashboard'
}

export default function CustomerNotifications() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    fetchNotifs()

    // Realtime
    const ch = supabase.channel('notifs-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchNotifs)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchNotifs() {
    const uid = profile.id
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setNotifs(data ?? [])
    setUnreadCount((data ?? []).filter(n => !n.is_read).length)
    setLoading(false)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    setUnreadCount(0)
  }

  async function handleClick(notif) {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
    }
    navigate(notifLink(notif.title, notif.message))
  }

  const fmtDate = d => {
    const date = new Date(d)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>
          Notifications {unreadCount > 0 && <span style={{ background:'rgba(255,255,255,0.3)', fontSize:'12px', padding:'2px 8px', borderRadius:'100px', marginLeft:'8px' }}>{unreadCount}</span>}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', padding:'6px 12px', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
            Mark all read
          </button>
        )}
      </header>

      <div>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div>
        ) : notifs.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔔</div>
            <p style={{ color:'#888', fontSize:'13px' }}>No notifications yet.</p>
          </div>
        ) : (
          notifs.map(n => {
            const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.info
            return (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{ display:'flex', gap:'14px', padding:'16px', borderBottom:'1px solid #f0f0f0', background: n.is_read ? 'white' : '#fff8f0', cursor:'pointer' }}
              >
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                  {ts.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ fontSize:'13px', fontWeight: n.is_read ? 400 : 700, color:'#2d1018', lineHeight:1.4 }}>{n.title}</div>
                    {!n.is_read && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary)', flexShrink:0, marginTop:'4px' }}/>}
                  </div>
                  <div style={{ fontSize:'12px', color:'#666', marginTop:'4px', lineHeight:1.5 }}>{n.message}</div>
                  <div style={{ fontSize:'11px', color:'#aaa', marginTop:'6px' }}>{fmtDate(n.created_at)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
      <CustomerNav />
    </div>
  )
}
