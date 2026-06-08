import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'
import { notifyLoanApproved, notifyLoanRejected } from '../../lib/gmail'

const FILTERS = ['all','pending','approved','active','rejected','completed']

export default function AdminLoans() {
  const { profile } = useAuth()
  const [apps, setApps]     = useState([])
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [remarks, setRemarks]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchApps() }, [filter])

  async function fetchApps() {
    setLoading(true)
    let q = supabase.from('loan_applications').select('*, profiles(full_name,email,phone)').order('created_at',{ascending:false})
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setApps(data ?? [])
    setLoading(false)
  }

  async function handleApprove() {
    if (!selected) return
    setActionLoading(true)
    try {
      const today = new Date()
      const endDate = new Date(today)
      endDate.setMonth(endDate.getMonth() + selected.loan_term)

      const nextPayment = new Date(today)
      nextPayment.setMonth(nextPayment.getMonth() + 1)

      // Update application
      await supabase.from('loan_applications').update({ status:'active', approved_by: profile.id, approved_at: new Date().toISOString(), remarks }).eq('id', selected.id)

      // Create active loan record
      const { error: loanErr } = await supabase.from('loans').insert({
        application_id: selected.id,
        customer_id: selected.customer_id,
        loan_amount: selected.loan_amount,
        amount_paid: 0,
        outstanding_balance: selected.loan_amount,
        monthly_payment: selected.monthly_payment,
        next_payment_date: nextPayment.toISOString().split('T')[0],
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active'
      })

      if (loanErr) { toast.error('Failed to create loan record'); return }

      // Notify customer — in-app + Gmail
      await supabase.from('notifications').insert({
        user_id: selected.customer_id,
        title: '🎉 Loan Approved!',
        message: `Your loan application ${selected.app_id} for ₱${Number(selected.loan_amount).toLocaleString('en-PH')} has been approved! Your first payment of ₱${Number(selected.monthly_payment).toLocaleString('en-PH')} is due on ${nextPayment.toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}.`,
        type: 'success'
      })
      // Gmail to customer
      const { data: cust } = await supabase.from('profiles').select('email,full_name').eq('id', selected.customer_id).single()
      if (cust?.email) {
        notifyLoanApproved(
          cust.email,
          cust.full_name,
          selected.app_id,
          selected.loan_amount,
          nextPayment.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
        )
      }

      toast.success('Loan approved and activated!')
      setSelected(null)
      fetchApps()
    } finally { setActionLoading(false) }
  }

  async function handleReject() {
    if (!selected || !remarks) { toast.error('Please provide a reason for rejection'); return }
    setActionLoading(true)
    try {
      await supabase.from('loan_applications').update({ status:'rejected', remarks }).eq('id', selected.id)
      await supabase.from('notifications').insert({
        user_id: selected.customer_id,
        title: '❌ Loan Application Update',
        message: `Your loan application ${selected.app_id} was not approved at this time. Reason: ${remarks}`,
        type: 'warning'
      })
      // Gmail to customer
      const { data: cust } = await supabase.from('profiles').select('email,full_name').eq('id', selected.customer_id).single()
      if (cust?.email) {
        notifyLoanRejected(cust.email, cust.full_name, selected.app_id, remarks)
      }
      toast.success('Application rejected.')
      setSelected(null)
      fetchApps()
    } finally { setActionLoading(false) }
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const filtered = apps.filter(a => {
    const q = search.toLowerCase()
    return !q || a.app_id?.toLowerCase().includes(q) || a.profiles?.full_name?.toLowerCase().includes(q)
  })

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Loan Applicants</div>
        </header>
        <div className="page-content">
          <div className="page-header"><h2>Loan Applications</h2><p>Review and manage all loan applications</p></div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:'7px 14px', borderRadius:'100px', border:'1.5px solid', fontSize:'12px', fontWeight:600, cursor:'pointer', textTransform:'capitalize',
                borderColor: filter===f?'var(--primary)':'#e0e0e0',
                background: filter===f?'var(--primary)':'white',
                color: filter===f?'white':'#666'
              }}>{f}</button>
            ))}
          </div>

          <div className="card-admin">
            <div className="card-header-admin">
              <h3>Applications ({filtered.length})</h3>
              <div className="search-box" style={{ width:'240px' }}>
                <span className="search-icon">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search app ID or name…" />
              </div>
            </div>
            <div className="table-container">
              {loading ? <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div> : (
                <table>
                  <thead><tr><th>App ID</th><th>Customer</th><th>Amount</th><th>Term</th><th>Monthly</th><th>Purpose</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'#aaa' }}>No applications found</td></tr>
                    ) : filtered.map(app => (
                      <tr key={app.id}>
                        <td style={{ fontWeight:700, color:'var(--primary)', fontSize:'12px' }}>{app.app_id}</td>
                        <td style={{ fontWeight:600 }}>{app.profiles?.full_name}</td>
                        <td style={{ fontWeight:600 }}>{fmt(app.loan_amount)}</td>
                        <td style={{ fontSize:'12px' }}>{app.loan_term} mo.</td>
                        <td style={{ fontSize:'12px' }}>{fmt(app.monthly_payment)}</td>
                        <td style={{ fontSize:'12px', color:'#666' }}>{app.purpose}</td>
                        <td><span className={`badge badge-${app.status}`}>{app.status}</span></td>
                        <td style={{ fontSize:'11px', color:'#888' }}>{fmtDate(app.created_at)}</td>
                        <td>
                          <button onClick={()=>{ setSelected(app); setRemarks(app.remarks ?? '') }} className="btn btn-sm btn-primary" style={{ fontSize:'11px' }}>
                            {app.status === 'pending' ? '⚖️ Review' : '👁 View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="modal-overlay-admin open" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div className="modal-box" style={{ maxWidth:'560px' }}>
            <div className="modal-header-admin">
              <h3>Review Application — {selected.app_id}</h3>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <div className="modal-body-admin">
              <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'14px', marginBottom:'16px' }}>
                <div style={{ fontWeight:700, fontSize:'15px', marginBottom:'4px' }}>{selected.profiles?.full_name}</div>
                <div style={{ fontSize:'12px', color:'#888' }}>{selected.profiles?.email} · {selected.profiles?.phone}</div>
              </div>
              {[
                ['Loan Amount', fmt(selected.loan_amount)],
                ['Loan Term', `${selected.loan_term} months`],
                ['Interest Rate', `${selected.interest_rate}%`],
                ['Monthly Payment', fmt(selected.monthly_payment)],
                ['Total Payable', fmt(selected.total_payable)],
                ['Purpose', selected.purpose ?? '—'],
                ['Applied', new Date(selected.created_at).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})],
                ['Current Status', selected.status],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f0f1', fontSize:'13px' }}>
                  <span style={{ color:'#888' }}>{l}</span>
                  <span style={{ fontWeight:600, textTransform:'capitalize' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:'16px' }}>
                <label className="form-label">Remarks / Notes</label>
                <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} className="form-control" rows={3} placeholder="Reason for approval/rejection…" />
              </div>
            </div>
            {selected.status === 'pending' && (
              <div className="modal-footer-admin">
                <button onClick={()=>setSelected(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading} className="btn btn-danger">❌ Reject</button>
                <button onClick={handleApprove} disabled={actionLoading} className="btn btn-success">✅ Approve</button>
              </div>
            )}
            {selected.status !== 'pending' && (
              <div className="modal-footer-admin">
                <button onClick={()=>setSelected(null)} className="btn btn-secondary">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
