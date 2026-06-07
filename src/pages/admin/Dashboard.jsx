import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats]   = useState({ customers:0, activeLoans:0, pendingApps:0, totalPayments:0, todayCollected:0, pendingDocs:0, outstanding:0 })
  const [pendingApps, setPendingApps]     = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [recentCustomers, setRecentCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const today = new Date().toISOString().split('T')[0]
    const [cusRes, loansRes, appRes, payRes, docRes, todayRes, outRes, pendListRes, recPayRes, recCusRes] = await Promise.all([
      supabase.from('profiles').select('id', { count:'exact', head:true }).eq('role','customer'),
      supabase.from('loans').select('id', { count:'exact', head:true }).eq('status','active'),
      supabase.from('loan_applications').select('id', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('payments').select('amount').eq('status','confirmed'),
      supabase.from('documents').select('id', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('payments').select('amount').eq('status','confirmed').eq('payment_date', today),
      supabase.from('loans').select('outstanding_balance').eq('status','active'),
      supabase.from('loan_applications').select('*, profiles(full_name)').eq('status','pending').order('created_at',{ascending:false}).limit(5),
      supabase.from('payments').select('*, profiles(full_name)').order('created_at',{ascending:false}).limit(5),
      supabase.from('profiles').select('*').eq('role','customer').order('created_at',{ascending:false}).limit(5),
    ])
    const totalPay = (payRes.data ?? []).reduce((s,p) => s + Number(p.amount), 0)
    const todayPay = (todayRes.data ?? []).reduce((s,p) => s + Number(p.amount), 0)
    const outstanding = (outRes.data ?? []).reduce((s,l) => s + Number(l.outstanding_balance), 0)
    setStats({ customers: cusRes.count??0, activeLoans: loansRes.count??0, pendingApps: appRes.count??0, totalPayments: totalPay, todayCollected: todayPay, pendingDocs: docRes.count??0, outstanding })
    setPendingApps(pendListRes.data ?? [])
    setRecentPayments(recPayRes.data ?? [])
    setRecentCustomers(recCusRes.data ?? [])
    setLoading(false)
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtK = n => n >= 1000 ? '₱' + (n/1000).toFixed(1) + 'K' : fmt(n)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin'
  const initials  = profile?.full_name?.substring(0,2).toUpperCase() ?? 'AD'
  const today     = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  const statCards = [
    { label:'Total Customers',      value: stats.customers,          color:'var(--primary)' },
    { label:'Active Loans',         value: stats.activeLoans,        color:'#16a34a' },
    { label:'Pending Applications', value: stats.pendingApps,        color:'#d97706' },
    { label:'Total Collected',      value: fmtK(stats.totalPayments),color:'#2563eb' },
    { label:'Collected Today',      value: fmt(stats.todayCollected), color:'var(--primary)', highlight: true },
    { label:'Docs Pending',         value: stats.pendingDocs,        color: stats.pendingDocs>0?'#d97706':'#16a34a' },
  ]

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Dashboard Overview</div>
          <div className="header-right">
            <div style={{ textAlign:'right' }}>
              <div className="user-name">{profile?.full_name}</div>
              <div className="user-role">Administrator</div>
            </div>
            <div className="user-avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <h2>Welcome back, {firstName}!</h2>
              <p>{today}</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <Link to="/login" target="_blank" className="btn btn-secondary" style={{ fontSize:'12px' }}>👤 Customer Portal ↗</Link>
              <Link to="/" target="_blank" className="btn btn-secondary" style={{ fontSize:'12px' }}>🌐 Public Site ↗</Link>
            </div>
          </div>

          {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner"/></div> : (
            <>
              {/* Stat cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'14px', marginBottom:'24px' }} className="stats-grid">
                {statCards.map(s => (
                  <div key={s.label} className="stat-card" style={{ padding:'18px', border: s.highlight ? '1px solid var(--primary-muted)' : undefined }}>
                    <div className="stat-value" style={{ fontSize: typeof s.value==='string'?'17px':'26px', color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Two column */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
                {/* Pending Applications */}
                <div className="card">
                  <div className="card-header">
                    <h3>Pending Loan Applications {stats.pendingApps > 0 && <span style={{ background:'var(--primary)', color:'white', fontSize:'11px', padding:'2px 8px', borderRadius:'100px', marginLeft:'6px' }}>{stats.pendingApps}</span>}</h3>
                    <Link to="/admin/loans" className="btn btn-sm btn-secondary">View All</Link>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>App ID</th><th>Customer</th><th>Amount</th><th>Action</th></tr></thead>
                      <tbody>
                        {pendingApps.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign:'center', padding:'30px', color:'#aaa' }}>No pending applications</td></tr>
                        ) : pendingApps.map(app => (
                          <tr key={app.id}>
                            <td style={{ fontWeight:700, color:'var(--primary)', fontSize:'12px' }}>{app.app_id}</td>
                            <td>{app.profiles?.full_name}</td>
                            <td style={{ fontWeight:600 }}>{fmt(app.loan_amount)}</td>
                            <td><Link to="/admin/loans" className="btn btn-sm btn-primary" style={{ fontSize:'11px' }}>⚖️ Review</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="card">
                  <div className="card-header">
                    <h3>Recent Payments</h3>
                    <Link to="/admin/payments" className="btn btn-sm btn-secondary">View All</Link>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                      <tbody>
                        {recentPayments.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign:'center', padding:'30px', color:'#aaa' }}>No payments yet</td></tr>
                        ) : recentPayments.map(p => (
                          <tr key={p.id}>
                            <td>{p.profiles?.full_name}</td>
                            <td style={{ fontWeight:600 }}>{fmt(p.amount)}</td>
                            <td style={{ textTransform:'capitalize', fontSize:'12px' }}>{p.payment_method?.replace('_',' ')}</td>
                            <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Customers */}
              <div className="card">
                <div className="card-header">
                  <h3>Recently Registered Customers</h3>
                  <Link to="/admin/customers" className="btn btn-sm btn-primary">View All Customers</Link>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Registered</th></tr></thead>
                    <tbody>
                      {recentCustomers.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight:600 }}>{c.full_name}</td>
                          <td style={{ color:'#666', fontSize:'12px' }}>{c.email}</td>
                          <td style={{ fontSize:'12px' }}>{c.phone ?? '—'}</td>
                          <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                          <td style={{ fontSize:'12px', color:'#888' }}>{new Date(c.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
