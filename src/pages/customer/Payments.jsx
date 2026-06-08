import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'
import { toast } from 'sonner'
import { notifyAdminPaymentSubmitted } from '../../lib/gmail'

const GCASH = '09307158807'

export default function CustomerPayments() {
  const { profile }  = useAuth()
  const [loan,       setLoan]     = useState(null)
  const [payments,   setPayments] = useState([])
  const [loading,    setLoading]  = useState(true)
  const [showModal,  setShowModal]= useState(false)
  const [method,     setMethod]   = useState('cash')
  const [gcashRef,   setGcashRef] = useState('')
  const [submitting, setSubmitting]=useState(false)

  useEffect(() => { if (profile?.id) fetchData() }, [profile])

  async function fetchData() {
    setLoading(true)
    const uid = profile.id
    const [loanRes,payRes] = await Promise.all([
      supabase.from('loans').select('*,loan_applications(app_id)').eq('customer_id',uid).eq('status','active').limit(1).maybeSingle(),
      supabase.from('payments').select('*').eq('customer_id',uid).order('payment_date',{ascending:false})
    ])
    setLoan(loanRes.data)
    setPayments(payRes.data??[])
    setLoading(false)
  }

  async function handlePayment() {
    if (!loan) return
    if (method==='gcash'&&!gcashRef) { toast.error('Enter your GCash Reference Number'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('payments').insert({
        loan_id:loan.id, customer_id:profile.id,
        amount:loan.monthly_payment, payment_method:method,
        payment_date:new Date().toISOString().split('T')[0],
        status:'pending', gcash_ref:gcashRef||null,
      })
      if (error) { toast.error('Submission failed'); return }
      const { data:admins } = await supabase.from('profiles').select('id,email').eq('role','admin').eq('status','active')
      if (admins?.length) {
        await supabase.from('notifications').insert(admins.map(a=>({
          user_id:a.id, title:`💳 Payment — ${profile.full_name}`,
          message:`${profile.full_name} submitted ${method} payment of ₱${Number(loan.monthly_payment).toLocaleString('en-PH',{minimumFractionDigits:2})}${gcashRef?` (Ref: ${gcashRef})`:''}`,
          type:'info'
        })))
        for (const a of admins) if (a.email) notifyAdminPaymentSubmitted(a.email,profile.full_name,loan.loan_applications?.app_id??'—',loan.monthly_payment,method,gcashRef)
      }
      toast.success('Payment submitted! Admin will confirm shortly.')
      setShowModal(false); setGcashRef(''); fetchData()
    } finally { setSubmitting(false) }
  }

  const fmt = n => '₱'+Number(n??0).toLocaleString('en-PH',{minimumFractionDigits:2})
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const statusColor = s => ({confirmed:'#16a34a',pending:'#d97706',failed:'#dc2626'}[s]??'#888')
  const statusBg    = s => ({confirmed:'#f0fdf4',pending:'#fffbeb',failed:'#fff1f2'}[s]??'#f5f5f5')

  return (
    <div style={{ background:'#f7f2f3', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#3d1018', padding:'52px 20px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ color:'white', fontSize:'22px', fontWeight:700 }}>Payments</h1>
            {loan && <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginTop:'2px' }}>Due: {fmt(loan.monthly_payment)}</p>}
          </div>
          {loan && (
            <button onClick={()=>setShowModal(true)} style={{ background:'white', color:'#3d1018', border:'none', padding:'9px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
              + Pay
            </button>
          )}
        </div>

        {/* Summary strip */}
        {loan && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginTop:'16px' }}>
            {[
              { label:'Total Paid',  value: fmt(payments.filter(p=>p.status==='confirmed').reduce((s,p)=>s+Number(p.amount),0)) },
              { label:'Next Due',    value: loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—' },
              { label:'Amount Due',  value: fmt(loan.monthly_payment) },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <p style={{ color:'white', fontSize:'13px', fontWeight:700 }}>{s.value}</p>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'10px', marginTop:'2px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 16px 100px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner"/></div>
        ) : payments.length===0 ? (
          <div style={{ background:'white', borderRadius:'16px', padding:'48px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>💳</div>
            <p style={{ fontSize:'16px', fontWeight:600, color:'#333', marginBottom:'6px' }}>No transactions yet</p>
            <p style={{ fontSize:'13px', color:'#aaa' }}>Your payment history will appear here.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize:'12px', fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Transaction History</p>
            <div style={{ background:'white', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
              {payments.map((p,i) => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderBottom: i<payments.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:statusBg(p.status), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                    {p.status==='confirmed'?'✅':p.status==='pending'?'⏳':'❌'}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:'14px', fontWeight:500, color:'#2d1018', textTransform:'capitalize' }}>{p.payment_method?.replace('_',' ')}</p>
                    <p style={{ fontSize:'12px', color:'#aaa', marginTop:'1px' }}>{fmtDate(p.payment_date)}{p.gcash_ref?` · Ref: ${p.gcash_ref}`:''}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:'15px', fontWeight:700, color:statusColor(p.status) }}>{fmt(p.amount)}</p>
                    <p style={{ fontSize:'11px', color:statusColor(p.status), fontWeight:600, textTransform:'capitalize', marginTop:'2px' }}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && loan && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal-sheet" style={{ maxWidth:'430px' }}>
            <div className="modal-handle"/>
            <div className="modal-header">
              <h3>Make Payment</h3>
              <button onClick={()=>setShowModal(false)} style={{ background:'#f2f2f7', border:'none', width:'30px', height:'30px', borderRadius:'50%', fontSize:'16px', cursor:'pointer', color:'#666' }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Amount */}
              <div style={{ background:'linear-gradient(135deg,var(--primary),var(--primary-dark))', borderRadius:'14px', padding:'20px', textAlign:'center', marginBottom:'20px' }}>
                <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'12px', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Amount to Pay</p>
                <p style={{ color:'white', fontSize:'32px', fontWeight:800 }}>{fmt(loan.monthly_payment)}</p>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', marginTop:'4px' }}>{loan.loan_applications?.app_id}</p>
              </div>

              {/* Method selector */}
              <p style={{ fontSize:'12px', fontWeight:600, color:'#5a3540', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Payment Method</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'18px' }}>
                {[['cash','Cash','💵'],['gcash','GCash','📱'],['bank_transfer','Bank','🏦']].map(([val,label,icon])=>(
                  <button key={val} onClick={()=>setMethod(val)} style={{
                    padding:'12px 8px', borderRadius:'12px', border:`2px solid ${method===val?'var(--primary)':'#e8d5d8'}`,
                    background: method===val?'var(--primary-pale)':'white',
                    fontSize:'12px', fontWeight:600, color: method===val?'var(--primary)':'#666',
                    cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'
                  }}>
                    <span style={{ fontSize:'20px' }}>{icon}</span>{label}
                  </button>
                ))}
              </div>

              {/* GCash details */}
              {method==='gcash' && (
                <div style={{ background:'#eff6ff', borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
                  <p style={{ fontSize:'13px', fontWeight:600, color:'#1d4ed8', marginBottom:'10px' }}>Send to GCash:</p>
                  <div style={{ background:'white', borderRadius:'10px', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                    <div>
                      <p style={{ fontSize:'11px', color:'#888' }}>GCash Number</p>
                      <p style={{ fontSize:'17px', fontWeight:700, letterSpacing:'1px' }}>{GCASH}</p>
                      <p style={{ fontSize:'11px', color:'#888' }}>Velveth Lending Co.</p>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(GCASH);toast.success('Copied!')}} style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8', padding:'7px 12px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>Copy</button>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#5a3540', marginBottom:'6px', textTransform:'uppercase' }}>GCash Reference # *</label>
                    <input value={gcashRef} onChange={e=>setGcashRef(e.target.value)}
                      style={{ width:'100%', padding:'12px 14px', background:'white', border:'1.5px solid #bfdbfe', borderRadius:'10px', fontSize:'14px', outline:'none' }}
                      placeholder="Enter 13-digit reference number" />
                    <p style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>Found in your GCash receipt</p>
                  </div>
                </div>
              )}

              {method==='cash' && (
                <div style={{ background:'#fffbeb', borderRadius:'12px', padding:'14px', marginBottom:'16px', fontSize:'13px', color:'#92400e', lineHeight:1.6 }}>
                  💡 For cash payment, please visit our office. Admin will confirm upon receipt.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <button onClick={()=>setShowModal(false)} style={{ padding:'14px', background:'#f2f2f7', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#333', cursor:'pointer' }}>Cancel</button>
                <button onClick={handlePayment} disabled={submitting} style={{ padding:'14px', background:'var(--primary)', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:700, color:'white', cursor:'pointer', opacity:submitting?0.7:1 }}>
                  {submitting?'Submitting…':'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomerNav />
    </div>
  )
}
