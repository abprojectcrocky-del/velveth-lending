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

    // Realtime — customer sees new penalty the moment admin adds/updates it
    const ch = supabase.channel(`customer-penalties-${profile.id}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'penalties',
        filter: `customer_id=eq.${profile.id}`
      }, fetchPenalties)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchPenalties() {
    if (!profile?.id) return
    const { data } = await supabase
      .from('penalties')
      .select('*, loans(loan_amount, loan_applications(app_id))')
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false })
    setPenalties(data ?? [])
    setLoading(false)
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'

  const pendingPenalties = penalties.filter(p => p.status === 'pending')
  const totalPending     = pendingPenalties.reduce((s, p) => s + Number(p.penalty_amount), 0)

  const statusStyle = s => ({
    pending: { bg:'#fee2e2', color:'#dc2626' },
    paid:    { bg:'#dcfce7', color:'#16a34a' },
    waived:  { bg:'#dbeafe', color:'#1d4ed8' },
  }[s] ?? { bg:'#f5f5f5', color:'#888' })

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>Penalties</h1>
        {pendingPenalties.length > 0 && (
          <span style={{ background:'rgba(255,255,255,0.25)', color:'white', padding:'4px 10px', borderRadius:'100px', fontSize:'12px', fontWeight:600 }}>
            {pendingPenalties.length} pending
          </span>
        )}
      </header>

      <div style={{ padding:'16px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div>
        ) : (
          <>
            {/* Outstanding total banner */}
            {totalPending > 0 && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'12px', padding:'16px 18px', marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#dc2626', fontSize:'15px' }}>⚠️ Outstanding Penalties</div>
                    <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                      {pendingPenalties.length} {pendingPenalties.length === 1 ? 'penalty' : 'penalties'} — please settle before your next payment
                    </div>
                  </div>
                  <div style={{ fontSize:'22px', fontWeight:800, color:'#dc2626' }}>{fmt(totalPending)}</div>
                </div>
              </div>
            )}

            {penalties.length === 0 ? (
              <div style={{ background:'white', borderRadius:'12px', padding:'40px 20px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎉</div>
                <h3 style={{ fontSize:'16px', marginBottom:'8px', color:'#333' }}>No Penalties</h3>
                <p style={{ fontSize:'13px', color:'#888' }}>Your account is in good standing. Keep it up!</p>
              </div>
            ) : (
              penalties.map(pen => {
                const ss = statusStyle(pen.status)
                return (
                  <div key={pen.id} style={{
                    background:'white', borderRadius:'12px', padding:'18px', marginBottom:'12px',
                    boxShadow:'var(--shadow-sm)', border:`1px solid ${pen.status==='pending'?'#fca5a5':'#e8e0e0'}`
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                      <div>
                        <div style={{ fontSize:'20px', fontWeight:800, color: pen.status==='pending'?'#dc2626':'#333' }}>{fmt(pen.penalty_amount)}</div>
                        <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{fmtDate(pen.created_at)}</div>
                      </div>
                      <span style={{ background:ss.bg, color:ss.color, padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700, textTransform:'capitalize' }}>
                        {pen.status}
                      </span>
                    </div>
                    <div style={{ borderTop:'1px solid #f5f0f1', paddingTop:'10px', display:'flex', flexDirection:'column', gap:'6px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                        <span style={{ color:'#888' }}>Related Loan</span>
                        <span style={{ fontWeight:600, color:'var(--primary)' }}>{pen.loans?.loan_applications?.app_id ?? '—'}</span>
                      </div>
                      {pen.reason && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                          <span style={{ color:'#888' }}>Reason</span>
                          <span style={{ fontWeight:600, textAlign:'right', maxWidth:'60%' }}>{pen.reason}</span>
                        </div>
                      )}
                      {pen.due_date && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                          <span style={{ color:'#888' }}>Due Date</span>
                          <span style={{ fontWeight:600, color: new Date(pen.due_date) < new Date() ? '#dc2626' : '#333' }}>
                            {fmtDate(pen.due_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Penalty Policy */}
            <div style={{ background:'white', borderRadius:'12px', padding:'18px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--primary)', marginBottom:'10px' }}>ℹ️ Penalty Policy</h3>
              <ul style={{ fontSize:'12px', color:'#666', lineHeight:1.9, paddingLeft:'16px' }}>
                <li>Late payment fee: ₱50 per day for the first 3 days</li>
                <li>After 5 days: Additional 5% of the weekly payment amount</li>
                <li>Penalties must be settled before the next payment</li>
                <li>Contact support if you need assistance with payments</li>
              </ul>
            </div>
          </>
        )}
      </div>
      <CustomerNav />
    </div>
  )
}
