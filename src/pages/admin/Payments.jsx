import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'
import { notifyPaymentReceived, notifyPaymentFailed } from '../../lib/gmail'

export default function AdminPayments() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [filter, setFilter]     = useState('pending')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchPayments() }, [filter])

  async function fetchPayments() {
    setLoading(true)
    let q = supabase.from('payments').select('*, profiles(full_name,email), loans(application_id, amount_paid, outstanding_balance, monthly_payment, loan_applications(app_id))').order('created_at',{ascending:false})
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setPayments(data ?? [])
    setLoading(false)
  }

  async function handleConfirm() {
    if (!selected) return
    setActionLoading(true)
    try {
      const loan = selected.loans
      const newPaid    = Number(loan?.amount_paid ?? 0) + Number(selected.amount)
      const newBalance = Math.max(0, Number(loan?.outstanding_balance ?? 0) - Number(selected.amount))
      const isComplete = newBalance <= 0

      // Confirm payment
      await supabase.from('payments').update({ status:'confirmed', received_by: profile.id }).eq('id', selected.id)

      // Update loan balance
      const today = new Date()
      const nextPay = new Date(today)
      nextPay.setMonth(nextPay.getMonth() + 1)

      await supabase.from('loans').update({
        amount_paid: newPaid,
        outstanding_balance: newBalance,
        status: isComplete ? 'completed' : 'active',
        next_payment_date: isComplete ? null : nextPay.toISOString().split('T')[0]
      }).eq('id', selected.loan_id)

      if (isComplete) {
        await supabase.from('loan_applications').update({ status:'completed' }).eq('id', loan?.application_id)
      }

      // Notify customer — in-app + Gmail
      await supabase.from('notifications').insert({
        user_id: selected.customer_id,
        title: isComplete ? '🎉 Loan Fully Paid!' : '✅ Payment Confirmed!',
        message: isComplete
          ? `Congratulations! Your loan has been fully paid. Outstanding balance: ₱0. Thank you!`
          : `Your payment of ₱${Number(selected.amount).toLocaleString('en-PH',{minimumFractionDigits:2})} has been confirmed. Remaining balance: ₱${newBalance.toLocaleString('en-PH',{minimumFractionDigits:2})}.`,
        type: 'success'
      })
      // Gmail to customer
      if (selected.profiles?.email) {
        notifyPaymentReceived(
          selected.profiles.email,
          selected.profiles.full_name,
          selected.amount,
          new Date(selected.payment_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
          newBalance
        )
      }

      toast.success('Payment confirmed!')
      setSelected(null)
      fetchPayments()
    } finally { setActionLoading(false) }
  }

  async function handleFail() {
    setActionLoading(true)
    await supabase.from('payments').update({ status:'failed' }).eq('id', selected.id)
    await supabase.from('notifications').insert({
      user_id: selected.customer_id,
      title: '❌ Payment Not Confirmed',
      message: `Your payment of ₱${Number(selected.amount).toLocaleString('en-PH',{minimumFractionDigits:2})} could not be verified. Please contact us.`,
      type: 'danger'
    })
    // Gmail to customer
    if (selected.profiles?.email) {
      notifyPaymentFailed(selected.profiles.email, selected.profiles.full_name, selected.amount)
    }
    toast.success('Payment marked as failed.')
    setSelected(null)
    fetchPayments()
    setActionLoading(false)
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    return !q || p.profiles?.full_name?.toLowerCase().includes(q) || p.payment_id?.toLowerCase().includes(q)
  })

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Payments</div>
        </header>
        <div className="page-content">
          <div className="page-header"><h2>Payment Management</h2><p>Confirm or reject customer payment submissions</p></div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
            {[
              { label:'Pending',   count: payments.filter(p=>p.status==='pending').length,   color:'#d97706', bg:'#fef3c7' },
              { label:'Confirmed', count: payments.filter(p=>p.status==='confirmed').length, color:'#16a34a', bg:'#dcfce7' },
              { label:'Failed',    count: payments.filter(p=>p.status==='failed').length,    color:'#dc2626', bg:'#fee2e2' },
              { label:'Total Amount', count: fmt(payments.filter(p=>p.status==='confirmed').reduce((s,p)=>s+Number(p.amount),0)), color:'#2563eb', bg:'#dbeafe' },
            ].map(s => (
              <div key={s.label} style={{ background:'white', borderRadius:'var(--radius-md)', padding:'18px', border:`1px solid ${s.bg}`, boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:s.color }}>{s.count}</div>
                <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
            {['all','pending','confirmed','failed'].map(f => (
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
              <h3>Payments ({filtered.length})</h3>
              <div className="search-box" style={{ width:'240px' }}>
                <span className="search-icon">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer…" />
              </div>
            </div>
            <div className="table-container">
              {loading ? <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div> : (
                <table>
                  <thead><tr><th>Customer</th><th>Loan</th><th>Amount</th><th>Method</th><th>GCash Ref</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'#aaa' }}>No payments found</td></tr>
                    ) : filtered.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight:600 }}>{p.profiles?.full_name}</td>
                        <td style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>{p.loans?.loan_applications?.app_id ?? '—'}</td>
                        <td style={{ fontWeight:700 }}>{fmt(p.amount)}</td>
                        <td style={{ fontSize:'12px', textTransform:'capitalize' }}>{p.payment_method?.replace('_',' ')}</td>
                        <td style={{ fontSize:'12px', color:'#666', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis' }}>{p.gcash_ref ?? '—'}</td>
                        <td style={{ fontSize:'12px', color:'#888' }}>{fmtDate(p.payment_date)}</td>
                        <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                        <td>
                          <button onClick={()=>setSelected(p)} className="btn btn-sm btn-primary" style={{ fontSize:'11px' }}>
                            {p.status === 'pending' ? '⚖️ Review' : '👁 View'}
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
          <div className="modal-box">
            <div className="modal-header-admin">
              <h3>Payment Details</h3>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <div className="modal-body-admin">
              <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'14px', marginBottom:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:800, color:'var(--primary)' }}>{fmt(selected.amount)}</div>
                <div style={{ fontSize:'12px', color:'#888' }}>{selected.loans?.loan_applications?.app_id}</div>
              </div>
              {[
                ['Customer', selected.profiles?.full_name],
                ['Payment Method', selected.payment_method?.replace('_',' ')],
                ['GCash Ref', selected.gcash_ref ?? 'N/A'],
                ['Payment Date', fmtDate(selected.payment_date)],
                ['Status', selected.status],
                ['Outstanding Balance', fmt(selected.loans?.outstanding_balance)],
                ['Notes', selected.notes ?? '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f0f1', fontSize:'13px' }}>
                  <span style={{ color:'#888' }}>{l}</span>
                  <span style={{ fontWeight:600, textTransform:'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer-admin">
              <button onClick={()=>setSelected(null)} className="btn btn-secondary">Cancel</button>
              {selected.status === 'pending' && (
                <>
                  <button onClick={handleFail} disabled={actionLoading} className="btn btn-danger">✕ Reject</button>
                  <button onClick={handleConfirm} disabled={actionLoading} className="btn btn-success">✓ Confirm</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
