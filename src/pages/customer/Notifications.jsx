import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

const TYPE = {
  success: { bg:'#f0fdf4', color:'#16a34a', icon:'✅' },
  warning: { bg:'#fffbeb', color:'#d97706', icon:'⚠️' },
  danger:  { bg:'#fff1f2', color:'#be123c', icon:'🔴' },
  info:    { bg:'#eff6ff', color:'#1d4ed8', icon:'ℹ️' },
}

function notifRoute(title='', msg='') {
  const t = (title+msg).toLowerCase()
  if (t.includes('payment')||t.includes('paid')) return '/payments'
  if (t.includes('penalty')||t.includes('late')) return '/penalties'
  if (t.includes('loan')||t.includes('approved')||t.includes('application')) return '/my-loan'
  return '/dashboard'
}

export default function CustomerNotifications() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [notifs,   setNotifs]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [unread,   setUnread]   = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    fetchNotifs()
    const ch = supabase.channel(`notifs-page-${profile.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${profile.id}`},fetchNotifs)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchNotifs() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id',profile.id).order('created_at',{ascending:false})
    setNotifs(data??[])
    setUnread((data??[]).filter(n=>!n.is_read).length)
    setLoading(false)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({is_read:true}).eq('user_id',profile.id).eq('is_read',false)
    setNotifs(n=>n.map(x=>({...x,is_read:true})))
    setUnread(0)
  }

  async function handleTap(notif) {
    if (!notif.is_read) await supabase.from('notifications').update({is_read:true}).eq('id',notif.id)
    navigate(notifRoute(notif.title,notif.message))
  }

  const fmtAge = d => {
    const diff = Math.floor((new Date()-new Date(d))/1000)
    if (diff<60) return 'Just now'
    if (diff<3600) return `${Math.floor(diff/60)}m ago`
    if (diff<86400) return `${Math.floor(diff/3600)}h ago`
    return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric'})
  }

  return (
    <div style={{ background:'#f7f2f3', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#3d1018', padding:'52px 20px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ color:'white', fontSize:'22px', fontWeight:700 }}>Notifications</h1>
            {unread>0 && <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginTop:'2px' }}>{unread} unread</p>}
          </div>
          {unread>0 && (
            <button onClick={markAllRead} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'7px 14px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:500 }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div style={{ paddingBottom:'90px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner"/></div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:'52px', marginBottom:'14px' }}>🔔</div>
            <p style={{ fontSize:'16px', fontWeight:600, color:'#333', marginBottom:'6px' }}>All caught up!</p>
            <p style={{ fontSize:'13px', color:'#aaa' }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ background:'white', marginTop:'1px' }}>
            {notifs.map((n,i) => {
              const ts = TYPE[n.type]??TYPE.info
              return (
                <div key={n.id} onClick={()=>handleTap(n)}
                  style={{ display:'flex', gap:'12px', padding:'14px 16px', background: n.is_read?'white':'#fff8f0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:ts.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0, marginTop:'1px' }}>
                    {ts.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                      <p style={{ fontSize:'14px', fontWeight: n.is_read?400:700, color:'#2d1018', lineHeight:1.3 }}>{n.title}</p>
                      {!n.is_read && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary)', flexShrink:0, marginTop:'5px' }}/>}
                    </div>
                    <p style={{ fontSize:'12px', color:'#666', marginTop:'3px', lineHeight:1.5 }}>{n.message}</p>
                    <p style={{ fontSize:'11px', color:'#bbb', marginTop:'5px' }}>{fmtAge(n.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <CustomerNav />
    </div>
  )
}
