import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

export default function CustomerPenalties() {
  const { profile } = useAuth()
  const [penalties, setPenalties] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    fetchPenalties()
    const ch = supabase.channel(`pen-rt-${profile.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'penalties',filter:`customer_id=eq.${profile.id}`},fetchPenalties)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchPenalties() {
    const { data } = await supabase.from('penalties').select('*,loans(loan_applications(app_id))').eq('customer_id',profile.id).order('created_at',{ascending:false})
    setPenalties(data??[])
    setLoading(false)
  }

  const fmt     = n => '₱'+Number(n??0).toLocaleString('en-PH',{minimumFractionDigits:2})
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}) : '—'
  const pending = penalties.filter(p=>p.status==='pending')
  const total   = pending.reduce((s,p)=>s+Number(p.penalty_amount),0)

  const statusStyle = s => ({
    pending: { bg:'#fff1f2', color:'#be123c', dot:'#ff3b30' },
    paid:    { bg:'#f0fdf4', color:'#15803d', dot:'#34c759' },
    waived:  { bg:'#eff6ff', color:'#1d4ed8', dot:'#007aff' },
  }[s] ?? { bg:'#f5f5f5', color:'#666', dot:'#aaa' })

  return (
    <div style={{ background:'#f7f2f3', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#3d1018', padding:'52px 20px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ color:'white', fontSize:'22px', fontWeight:700 }}>Penalties</h1>
            {pending.length>0 && <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginTop:'2px' }}>{pending.length} pending · {fmt(total)}</p>}
          </div>
          {pending.length>0 && <span style={{ background:'#ff3b30', color:'white', padding:'4px 10px', borderRadius:'100px', fontSize:'12px', fontWeight:700 }}>{pending.length}</span>}
        </div>
      </div>

      <div style={{ padding:'16px 16px 100px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner"/></div>
        ) : (
          <>
            {total>0 && (
              <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:'14px', padding:'16px', marginBottom:'14px', display:'flex', gap:'12px', alignItems:'center' }}>
                <span style={{ fontSize:'24px' }}>⚠️</span>
                <div>
                  <p style={{ fontSize:'14px', fontWeight:700, color:'#be123c' }}>Outstanding: {fmt(total)}</p>
                  <p style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>Please settle before your next payment date</p>
                </div>
              </div>
            )}

            {penalties.length===0 ? (
              <div style={{ textAlign:'center', padding:'80px 20px', background:'white', borderRadius:'16px' }}>
                <div style={{ fontSize:'52px', marginBottom:'14px' }}>🎉</div>
                <p style={{ fontSize:'16px', fontWeight:600, color:'#333', marginBottom:'6px' }}>No Penalties!</p>
                <p style={{ fontSize:'13px', color:'#aaa' }}>Your account is in good standing.</p>
              </div>
            ) : (
              <>
                {penalties.map(pen => {
                  const ss = statusStyle(pen.status)
                  return (
                    <div key={pen.id} style={{ background:'white', borderRadius:'14px', padding:'16px', marginBottom:'10px', boxShadow:'0 1px 6px rgba(190,90,106,0.06)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                        <div>
                          <p style={{ fontSize:'22px', fontWeight:800, color: pen.status==='pending'?'#be123c':'#333' }}>{fmt(pen.penalty_amount)}</p>
                          <p style={{ fontSize:'12px', color:'#aaa', marginTop:'2px' }}>{fmtDate(pen.created_at)}</p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', background:ss.bg, padding:'5px 10px', borderRadius:'100px' }}>
                          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:ss.dot }}/>
                          <span style={{ fontSize:'11px', fontWeight:700, color:ss.color, textTransform:'capitalize' }}>{pen.status}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                        {pen.loans?.loan_applications?.app_id && (
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                            <span style={{ color:'#aaa' }}>Loan</span>
                            <span style={{ fontWeight:600, color:'var(--primary)' }}>{pen.loans.loan_applications.app_id}</span>
                          </div>
                        )}
                        {pen.reason && (
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                            <span style={{ color:'#aaa' }}>Reason</span>
                            <span style={{ fontWeight:500, color:'#333', textAlign:'right', maxWidth:'60%' }}>{pen.reason}</span>
                          </div>
                        )}
                        {pen.due_date && (
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                            <span style={{ color:'#aaa' }}>Due</span>
                            <span style={{ fontWeight:600, color: new Date(pen.due_date)<new Date()?'#ff3b30':'#333' }}>{fmtDate(pen.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Policy */}
                <div style={{ background:'white', borderRadius:'14px', padding:'16px', marginTop:'6px' }}>
                  <p style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'10px' }}>ℹ️ Penalty Policy</p>
                  {['Late payment fee: ₱50/day for first 3 days','After 5 days: +5% of weekly payment amount','Settle penalties before next payment date','Contact support for assistance'].map(t => (
                    <div key={t} style={{ display:'flex', gap:'8px', marginBottom:'7px' }}>
                      <span style={{ color:'var(--primary)', fontSize:'12px', flexShrink:0 }}>•</span>
                      <p style={{ fontSize:'12px', color:'#666', lineHeight:1.5 }}>{t}</p>
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
