import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

export default function CustomerDashboard() {
  const { profile } = useAuth()
  const [loan,       setLoan]       = useState(null)
  const [stats,      setStats]      = useState({ penalties:0, unread:0 })
  const [activities, setActivities] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    fetchAll()
    const ch = supabase.channel(`dash-rt-${profile.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'payments',   filter:`customer_id=eq.${profile.id}`},fetchAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${profile.id}`},   fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchAll() {
    if (!profile?.id) return
    const uid = profile.id
    const [loanRes,penRes,notifRes,payRes] = await Promise.all([
      supabase.from('loans').select('*,loan_applications(app_id,purpose,loan_term)').eq('customer_id',uid).eq('status','active').limit(1).maybeSingle(),
      supabase.from('penalties').select('id',{count:'exact',head:true}).eq('customer_id',uid).eq('status','pending'),
      supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('is_read',false),
      supabase.from('payments').select('*').eq('customer_id',uid).order('created_at',{ascending:false}).limit(4),
    ])
    setLoan(loanRes.data)
    setStats({ penalties: penRes.count??0, unread: notifRes.count??0 })
    setActivities(payRes.data??[])
    setLoading(false)
  }

  const prog     = loan ? Math.round((loan.amount_paid/loan.loan_amount)*100) : 0
  const firstName= profile?.full_name?.split(' ')[0] ?? ''
  const initials = profile?.full_name?.substring(0,2).toUpperCase() ?? 'VL'
  const fmt      = n => '₱'+Number(n??0).toLocaleString('en-PH',{minimumFractionDigits:2})
  const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—'

  let daysUntil=null, dueColor='var(--primary)'
  if (loan?.next_payment_date) {
    daysUntil = Math.ceil((new Date(loan.next_payment_date)-new Date())/86400000)
    if (daysUntil<=3) dueColor='#dc2626'
    else if (daysUntil<=7) dueColor='#d97706'
  }

  return (
    <div style={{ background:'#f7f2f3', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(160deg,#3d1018 0%,#7d2d3a 100%)', padding:'52px 20px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginBottom:'2px' }}>Good day 👋</p>
            <h1 style={{ color:'white', fontSize:'22px', fontWeight:700 }}>{firstName}</h1>
          </div>
          <Link to="/profile" style={{ width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'15px', textDecoration:'none' }}>
            {initials}
          </Link>
        </div>

        {/* Hero loan card */}
        {loan ? (
          <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:'16px', padding:'18px', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
              <div>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'4px' }}>Outstanding Balance</p>
                <p style={{ color:'white', fontSize:'28px', fontWeight:800, lineHeight:1 }}>{fmt(loan.outstanding_balance)}</p>
              </div>
              <span style={{ background:'rgba(52,199,89,0.25)', color:'#34c759', padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700, border:'1px solid rgba(52,199,89,0.4)' }}>Active</span>
            </div>
            <div style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px' }}>Payment Progress</span>
                <span style={{ color:'white', fontSize:'12px', fontWeight:600 }}>{prog}%</span>
              </div>
              <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'100px', height:'5px' }}>
                <div style={{ width:`${prog}%`, height:'100%', background:'linear-gradient(90deg,#f79baa,white)', borderRadius:'100px' }}/>
              </div>
            </div>
            {loan.next_payment_date && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px' }}>Next Payment</p>
                  <p style={{ color:'white', fontSize:'13px', fontWeight:600 }}>{fmtDate(loan.next_payment_date)}{daysUntil!==null && ` · ${daysUntil<0?'Overdue':daysUntil===0?'Today':`${daysUntil}d left`}`}</p>
                </div>
                <Link to="/payments" style={{ background:'white', color:'#3d1018', padding:'8px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:700, textDecoration:'none' }}>
                  Pay {fmt(loan.monthly_payment)}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:'16px', padding:'20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'14px', marginBottom:'12px' }}>No active loan</p>
            <Link to="/apply" style={{ background:'white', color:'#3d1018', padding:'10px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:700, textDecoration:'none', display:'inline-block' }}>
              Apply for a Loan →
            </Link>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ padding:'16px 16px 100px' }}>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div>
        ) : (
          <>
            {/* Penalty alert */}
            {stats.penalties > 0 && (
              <Link to="/penalties" style={{ display:'flex', alignItems:'center', gap:'12px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:'12px', padding:'14px 16px', marginBottom:'14px', textDecoration:'none' }}>
                <span style={{ fontSize:'20px' }}>⚠️</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'13px', fontWeight:700, color:'#be123c' }}>Outstanding Penalties</p>
                  <p style={{ fontSize:'12px', color:'#888' }}>Tap to settle before next payment</p>
                </div>
                <span style={{ color:'#be123c', fontSize:'16px' }}>›</span>
              </Link>
            )}

            {/* Stats row */}
            {loan && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                {[
                  { label:'Total Paid',   value: fmt(loan.amount_paid)  },
                  { label:'Loan Amount',  value: fmt(loan.loan_amount)  },
                  { label:'Monthly Due',  value: fmt(loan.monthly_payment) },
                ].map(s => (
                  <div key={s.label} style={{ background:'white', borderRadius:'12px', padding:'12px 10px', textAlign:'center', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
                    <p style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)' }}>{s.value}</p>
                    <p style={{ fontSize:'10px', color:'#aaa', marginTop:'3px' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div style={{ marginBottom:'6px' }}>
              <p style={{ fontSize:'12px', fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>Quick Actions</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[
                  { to:'/payments', icon:'💳', label:'Make Payment', color:'#fff0f6', iconBg:'#be5a6a' },
                  { to:'/my-loan',  icon:'📊', label:'My Loan',      color:'#f0f5ff', iconBg:'#3b82f6' },
                  { to:'/apply',    icon:'📝', label:'Apply Loan',   color:'#f0fff4', iconBg:'#16a34a' },
                  { to:'/profile',  icon:'👤', label:'My Account',   color:'#fefce8', iconBg:'#d97706' },
                ].map(a => (
                  <Link key={a.to} to={a.to} style={{ background:'white', borderRadius:'14px', padding:'16px 14px', display:'flex', flexDirection:'column', gap:'10px', textDecoration:'none', boxShadow:'0 1px 6px rgba(190,90,106,0.06)', border:'0.5px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:a.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>
                      {a.icon}
                    </div>
                    <p style={{ fontSize:'13px', fontWeight:600, color:'#2d1018' }}>{a.label}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {activities.length > 0 && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'16px 0 8px' }}>
                  <p style={{ fontSize:'12px', fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px' }}>Recent Activity</p>
                  <Link to="/my-loan" style={{ fontSize:'13px', color:'var(--primary)', fontWeight:500, textDecoration:'none' }}>See all</Link>
                </div>
                <div style={{ background:'white', borderRadius:'14px', padding:'4px 16px', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
                  {activities.map((act,i) => (
                    <div key={act.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom: i<activities.length-1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#f0fff4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>💳</div>
                        <div>
                          <p style={{ fontSize:'13px', fontWeight:500, color:'#2d1018' }}>Payment</p>
                          <p style={{ fontSize:'11px', color:'#aaa', marginTop:'1px', textTransform:'capitalize' }}>{act.payment_method?.replace('_',' ')} · {act.status}</p>
                        </div>
                      </div>
                      <p style={{ fontSize:'14px', fontWeight:700, color:'#16a34a' }}>{fmt(act.amount)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <CustomerNav />
    </div>
  )
}
