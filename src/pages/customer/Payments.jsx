import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'
import { toast } from 'sonner'
import { notifyAdminPaymentSubmitted } from '../../lib/gmail'

const GCASH_NUMBER = '09307158807'

export default function CustomerPayments() {
  const { profile } = useAuth()
  const [loan, setLoan]         = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [method, setMethod]     = useState('cash')
  const [gcashRef, setGcashRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (profile?.id) fetchData() }, [profile])

  async function fetchData() {
    setLoading(true)
    const uid = profile.id
    const [loanRes, payRes] = await Promise.all([
      supabase.from('loans').select('*, loan_applications(app_id)').eq('customer_id', uid).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('payments').select('*').eq('customer_id', uid).order('payment_date', { ascending: false })
    ])
    setLoan(loanRes.data)
    setPayments(payRes.data ?? [])
    setLoading(false)
  }

  async function handlePayment() {
    if (!loan) return
    if (method === 'gcash' && !gcashRef) { toast.error('Please enter your GCash Reference Number'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('payments').insert({
        loan_id: loan.id,
        customer_id: profile.id,
        amount: loan.monthly_payment,
        payment_method: method,
        payment_date: new Date().toISOString().split('T')[0],
        status: method === 'cash' ? 'pending' : 'pending',
        gcash_ref: gcashRef || null,
        notes: method === 'cash' ? 'Customer submitted cash payment request' : `GCash ref: ${gcashRef}`
      })
      if (error) { toast.error('Payment submission failed'); return }

      // Notify admin — in-app + Gmail
      const { data: admins } = await supabase.from('profiles').select('id,email').eq('role', 'admin').eq('status', 'active')
      if (admins?.length) {
        await supabase.from('notifications').insert(admins.map(a => ({
          user_id: a.id,
          title: `💳 Payment Request — ${profile.full_name}`,
          message: `${profile.full_name} submitted a ${method} payment of ₱${Number(loan.monthly_payment).toLocaleString('en-PH',{minimumFractionDigits:2})} for loan ${loan.loan_applications?.app_id ?? ''}${gcashRef ? ` (GCash ref: ${gcashRef})` : ''}`,
          type: 'info'
        })))
        // Gmail to every admin
        for (const admin of admins) {
          if (admin.email) {
            notifyAdminPaymentSubmitted(
              admin.email,
              profile.full_name,
              loan.loan_applications?.app_id ?? '—',
              loan.monthly_payment,
              method,
              gcashRef
            )
          }
        }
      }

      toast.success('Payment submitted! Admin will confirm shortly.')
      setShowModal(false)
      setGcashRef('')
      fetchData()
    } finally { setSubmitting(false) }
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const statusColor = s => ({ confirmed:'#16a34a', pending:'#d97706', failed:'#dc2626' }[s] ?? '#888')

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>Make Payment</h1>
      </header>

      <div style={{ padding:'16px' }}>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div> : (
          <>
            {/* Payment History Summary */}
            <div style={{ background:'var(--primary)', borderRadius:'12px', padding:'16px', marginBottom:'14px', color:'white' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                <button onClick={() => setShowModal(true)} style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', color:'white', padding:'8px 14px', borderRadius:'6px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  + Make Payment
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:700 }}>{fmt(payments.filter(p=>p.status==='confirmed').reduce((s,p)=>s+Number(p.amount),0))}</div>
                  <div style={{ fontSize:'10px', opacity:0.7 }}>Total Paid</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:700, color:'#fbc5cc' }}>{loan?.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : 'N/A'}</div>
                  <div style={{ fontSize:'10px', opacity:0.7 }}>Next Payment</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:700, color:'#fbc5cc' }}>{fmt(loan?.monthly_payment)}</div>
                  <div style={{ fontSize:'10px', opacity:0.7 }}>Amount Due</div>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div style={{ background:'white', borderRadius:'12px', padding:'16px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'14px' }}>Transaction History</h3>
              {payments.length === 0 ? (
                <p style={{ color:'#aaa', fontSize:'13px', textAlign:'center', padding:'20px 0' }}>No transactions yet</p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr style={{ background:'#fff0f2' }}>
                      <th style={{ padding:'10px 8px', textAlign:'left', color:'var(--primary)', fontWeight:600, fontSize:'10px', textTransform:'uppercase' }}>Loan ID</th>
                      <th style={{ padding:'10px 8px', textAlign:'left', color:'var(--primary)', fontWeight:600, fontSize:'10px', textTransform:'uppercase' }}>Date</th>
                      <th style={{ padding:'10px 8px', textAlign:'right', color:'var(--primary)', fontWeight:600, fontSize:'10px', textTransform:'uppercase' }}>Amount</th>
                      <th style={{ padding:'10px 8px', textAlign:'left', color:'var(--primary)', fontWeight:600, fontSize:'10px', textTransform:'uppercase' }}>Method</th>
                      <th style={{ padding:'10px 8px', textAlign:'center', color:'var(--primary)', fontWeight:600, fontSize:'10px', textTransform:'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                        <td style={{ padding:'12px 8px', color:'var(--primary)', fontWeight:600 }}>{loan?.loan_applications?.app_id ?? '—'}</td>
                        <td style={{ padding:'12px 8px', color:'#666' }}>{new Date(p.payment_date).toLocaleDateString('en-PH',{month:'2-digit',day:'2-digit',year:'numeric'})}</td>
                        <td style={{ padding:'12px 8px', textAlign:'right', fontWeight:700, color:'var(--primary)' }}>{fmt(p.amount)}</td>
                        <td style={{ padding:'12px 8px', color:'#666', textTransform:'capitalize' }}>{p.payment_method?.replace('_',' ')}</td>
                        <td style={{ padding:'12px 8px', textAlign:'center' }}>
                          <span style={{ background: p.status==='confirmed'?'#dcfce7':p.status==='pending'?'#fef3c7':'#fee2e2', color:statusColor(p.status), padding:'3px 8px', borderRadius:'100px', fontSize:'10px', fontWeight:600 }}>
                            {p.status === 'confirmed' ? 'Completed' : p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && loan && (
        <div style={{ position:'fixed', inset:0, background:'rgba(61,16,24,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div style={{ background:'white', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'380px', boxShadow:'var(--shadow-lg)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ fontSize:'18px', fontWeight:700 }}>Payment Details</h3>
              <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>

            <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'16px', textAlign:'center', marginBottom:'16px', border:'1px solid var(--primary-muted)' }}>
              <div style={{ fontSize:'12px', color:'#888', marginBottom:'4px' }}>Amount to Pay</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:'var(--primary)' }}>{fmt(loan.monthly_payment)}</div>
              <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>{loan.loan_applications?.app_id}</div>
            </div>

            {/* Payment method selector */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'8px', textTransform:'uppercase' }}>Payment Method</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                {['cash','gcash','bank_transfer'].map(m => (
                  <button key={m} onClick={()=>setMethod(m)} style={{
                    padding:'10px', borderRadius:'8px', border:`2px solid ${method===m?'var(--primary)':'#e0e0e0'}`,
                    background: method===m?'var(--primary-pale)':'white', fontSize:'11px', fontWeight:600,
                    color: method===m?'var(--primary)':'#666', cursor:'pointer', textTransform:'capitalize'
                  }}>
                    {m === 'gcash' ? 'GCash' : m === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                  </button>
                ))}
              </div>
            </div>

            {/* GCash QR */}
            {method === 'gcash' && (
              <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:'8px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', marginBottom:'10px' }}>
                  <div style={{ background:'#0070BA', color:'white', fontWeight:700, fontSize:'14px', padding:'6px 12px', borderRadius:'6px' }}>G</div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:'12px', color:'#666' }}>Send payment to:</div>
                    <div style={{ fontWeight:700, fontSize:'14px' }}>GCash</div>
                  </div>
                </div>
                <div style={{ background:'white', border:'1px solid #e0e0e0', borderRadius:'6px', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                  <div>
                    <div style={{ fontSize:'11px', color:'#888' }}>GCash Number:</div>
                    <div style={{ fontWeight:700, fontSize:'15px' }}>{GCASH_NUMBER}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>Velveth Lending Co.</div>
                  </div>
                  <button onClick={()=>{navigator.clipboard.writeText(GCASH_NUMBER); toast.success('Copied!')}} style={{ background:'none', border:'1px solid #ddd', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontSize:'12px', color:'#666' }}>
                    Copy
                  </button>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textAlign:'left' }}>Your GCash Number</label>
                  <input style={{ width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', marginBottom:'10px' }} placeholder="09X-XXX-XXXX" />
                  <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textAlign:'left' }}>GCash Reference Number *</label>
                  <input value={gcashRef} onChange={e=>setGcashRef(e.target.value)}
                    style={{ width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px' }}
                    placeholder="Enter 13-digit reference number" />
                  <p style={{ fontSize:'11px', color:'#888', marginTop:'4px', textAlign:'left' }}>Found in your GCash transaction receipt</p>
                </div>
              </div>
            )}

            {method === 'cash' && (
              <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'8px', padding:'12px', marginBottom:'16px', fontSize:'12px', color:'#92400e', lineHeight:1.6 }}>
                💡 For cash payment, please visit our office. Date will be recorded by the admin upon receipt.
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <button onClick={()=>setShowModal(false)} className="btn btn-secondary" style={{ justifyContent:'center' }}>Back</button>
              <button onClick={handlePayment} disabled={submitting} className="btn btn-primary" style={{ justifyContent:'center' }}>
                {submitting ? 'Submitting…' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerNav />
    </div>
  )
}
