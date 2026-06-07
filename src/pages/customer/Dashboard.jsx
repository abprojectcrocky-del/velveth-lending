import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

export default function CustomerDashboard() {
  const { profile } = useAuth()
  const [loan, setLoan]         = useState(null)
  const [stats, setStats]       = useState({ activeLoans: 0, totalApps: 0, penalties: 0, unread: 0 })
  const [activities, setActivities] = useState([])
  const [penaltyList, setPenaltyList] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    fetchAll()

    // Realtime: refresh when notifications arrive
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `customer_id=eq.${profile.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchAll() {
    if (!profile?.id) return
    setLoading(true)
    const uid = profile.id

    const [loanRes, appsRes, penRes, notifRes, payRes] = await Promise.all([
      supabase.from('loans').select('*, loan_applications(app_id,purpose,loan_term)').eq('customer_id', uid).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('customer_id', uid),
      supabase.from('penalties').select('*').eq('customer_id', uid).eq('status', 'pending'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false),
      supabase.from('payments').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(5)
    ])

    setLoan(loanRes.data)
    setPenaltyList(penRes.data ?? [])
    setStats({
      activeLoans: loanRes.data ? 1 : 0,
      totalApps: appsRes.count ?? 0,
      penalties: (penRes.data ?? []).reduce((s, p) => s + Number(p.penalty_amount), 0),
      unread: notifRes.count ?? 0
    })
    setActivities(payRes.data ?? [])
    setLoading(false)
  }

  const progress = loan ? Math.round((loan.amount_paid / loan.loan_amount) * 100) : 0
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const initials  = profile?.full_name?.substring(0,2).toUpperCase() ?? 'VL'

  // Days until next payment
  let daysUntil = null, dueColor = 'var(--primary)', dueBg = 'var(--primary-pale)'
  if (loan?.next_payment_date) {
    daysUntil = Math.ceil((new Date(loan.next_payment_date) - new Date()) / 86400000)
    if (daysUntil <= 3) { dueColor = '#dc2626'; dueBg = '#fff1f2' }
    else if (daysUntil <= 7) { dueColor = '#d97706'; dueBg = '#fffbeb' }
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ background:'var(--primary)', padding:'20px 16px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ color:'white', fontSize:'20px', fontWeight:700 }}>Welcome, {firstName}!</h1>
        <Link to="/profile" style={{ width:'36px', height:'36px', background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, textDecoration:'none' }}>
          {initials}
        </Link>
      </header>

      <div style={{ padding:'16px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div>
        ) : (
          <>
            {/* Quick action buttons */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
              {[
                { to:'/payments', icon:'💳', label:'Make Payment' },
                { to:'/my-loan',  icon:'💰', label:'My Loan' },
                { to:'/apply',    icon:'📝', label:'Apply Loan' },
                { to:'/profile',  icon:'👤', label:'Manage Account' },
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ background:'var(--primary)', borderRadius:'8px', padding:'18px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', color:'white', fontSize:'13px', fontWeight:600 }}>
                  <span style={{ fontSize:'28px' }}>{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>

            {/* Outstanding Balance Card */}
            {loan && (
              <div style={{ background:'white', borderRadius:'12px', padding:'20px', marginBottom:'12px', boxShadow:'var(--shadow-sm)', border:'1px solid var(--primary-muted)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                  <div>
                    <div style={{ fontSize:'12px', color:'#888', textTransform:'uppercase', letterSpacing:'0.7px' }}>Outstanding Balance</div>
                    <div style={{ fontSize:'28px', fontWeight:800, color:'var(--primary)' }}>{fmt(loan.outstanding_balance)}</div>
                  </div>
                  <span style={{ background:'#dcfce7', color:'#16a34a', padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>Active</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#888', marginBottom:'6px' }}>
                  <span>Payment Progress</span>
                  <span style={{ fontWeight:700, color:'var(--primary)' }}>{progress}% Paid</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width:`${progress}%` }}/>
                </div>
                {loan.next_payment_date && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'14px' }}>
                    <div style={{ fontSize:'12px', color:'#888' }}>
                      Next Payment: <strong style={{ color:'#333' }}>{new Date(loan.next_payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</strong>
                    </div>
                    <Link to="/payments" style={{ background:'var(--primary)', color:'white', padding:'6px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:600, textDecoration:'none' }}>
                      Pay {fmt(loan.monthly_payment)}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
              <div style={{ background:'white', borderRadius:'8px', padding:'14px 10px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'var(--primary)' }}>{fmt(loan?.amount_paid ?? 0)}</div>
                <div style={{ fontSize:'10px', color:'#888', marginTop:'2px' }}>Total Paid</div>
              </div>
              <div style={{ background:'white', borderRadius:'8px', padding:'14px 10px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'#333' }}>{fmt(loan?.loan_amount ?? 0)}</div>
                <div style={{ fontSize:'10px', color:'#888', marginTop:'2px' }}>Loan Amount</div>
              </div>
              <div style={{ background:'white', borderRadius:'8px', padding:'14px 10px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'#333' }}>
                  {loan ? `${Math.round(loan.amount_paid / (loan.monthly_payment || 1))} of ${loan?.loan_applications?.loan_term ?? '—'}` : '—'}
                </div>
                <div style={{ fontSize:'10px', color:'#888', marginTop:'2px' }}>Payments Made</div>
              </div>
            </div>

            {/* Penalties alert */}
            {stats.penalties > 0 && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'14px 16px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#dc2626' }}>⚠️ Outstanding Penalties</div>
                  <div style={{ fontSize:'12px', color:'#888' }}>Please settle as soon as possible</div>
                </div>
                <Link to="/penalties" style={{ fontSize:'12px', color:'#dc2626', fontWeight:600, textDecoration:'none' }}>View →</Link>
              </div>
            )}

            {/* No loan — show apply prompt */}
            {!loan && (
              <div style={{ background:'white', borderRadius:'12px', padding:'30px 20px', textAlign:'center', marginBottom:'12px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px', color:'#333' }}>No Active Loan</h3>
                <p style={{ fontSize:'13px', color:'#888', marginBottom:'16px' }}>Apply for a loan to get started.</p>
                <Link to="/apply" className="btn btn-primary">Apply for a Loan</Link>
              </div>
            )}

            {/* Recent Activities */}
            <div style={{ background:'white', borderRadius:'12px', padding:'16px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'14px' }}>Recent Activities</h3>
              {activities.length === 0 ? (
                <p style={{ color:'#aaa', fontSize:'13px', textAlign:'center', padding:'20px 0' }}>No recent activities</p>
              ) : activities.map(act => (
                <div key={act.id} className="activity-item">
                  <div>
                    <div className="activity-title">Payment received</div>
                    <div className="activity-date">{new Date(act.payment_date).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</div>
                  </div>
                  <span className="activity-amount">{fmt(act.amount)}</span>
                </div>
              ))}
              <Link to="/my-loan" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'12px' }}>
                View All
              </Link>
            </div>
          </>
        )}
      </div>

      <CustomerNav />
    </div>
  )
}
