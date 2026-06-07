import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'

const STATUS_INFO = {
  pending:   { label:'Under Review',  color:'#d97706', bg:'#fef3c7', icon:'⏳', desc:'Your application has been received and is awaiting admin review.' },
  approved:  { label:'Approved',      color:'#16a34a', bg:'#dcfce7', icon:'✅', desc:'Your application has been approved. Your loan will be activated shortly.' },
  active:    { label:'Active',        color:'#16a34a', bg:'#dcfce7', icon:'💰', desc:'Your loan is active. Keep up with your monthly payments.' },
  rejected:  { label:'Not Approved',  color:'#dc2626', bg:'#fee2e2', icon:'❌', desc:'Unfortunately your application was not approved. See remarks below.' },
  completed: { label:'Completed',     color:'#2563eb', bg:'#dbeafe', icon:'🎉', desc:'Congratulations! Your loan has been fully paid.' },
}

export default function CustomerLoan() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState([])
  const [loans,        setLoans]        = useState([])
  const [payments,     setPayments]     = useState([])
  const [documents,    setDocuments]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('loans')

  useEffect(() => {
    if (!profile?.id) return
    fetchData()

    // Realtime — loan status update, payment confirmation, doc verification appear immediately
    const ch = supabase.channel(`customer-loan-rt-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans',            filter: `customer_id=eq.${profile.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_applications', filter: `customer_id=eq.${profile.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments',          filter: `customer_id=eq.${profile.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents',         filter: `customer_id=eq.${profile.id}` }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchData() {
    if (!profile?.id) return
    const uid = profile.id
    const [appsRes, loansRes, payRes, docRes] = await Promise.all([
      supabase.from('loan_applications').select('*').eq('customer_id', uid).order('created_at', { ascending: false }),
      supabase.from('loans').select('*, loan_applications(app_id,purpose,loan_term,interest_rate)').eq('customer_id', uid).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', uid).order('payment_date', { ascending: false }),
      supabase.from('documents').select('*, loan_applications(app_id)').eq('customer_id', uid).order('created_at', { ascending: false }),
    ])
    setApplications(appsRes.data ?? [])
    setLoans(loansRes.data ?? [])
    setPayments(payRes.data ?? [])
    setDocuments(docRes.data ?? [])
    setLoading(false)
  }

  async function openFile(filePath) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const TABS = [
    { key:'loans',        label:'Active Loans' },
    { key:'applications', label:'Applications' },
    { key:'payments',     label:'Payments' },
    { key:'documents',    label:'My Documents' },
  ]

  const docStatusStyle = s => ({
    pending:  { bg:'#fef3c7', color:'#d97706', icon:'⏳' },
    verified: { bg:'#dcfce7', color:'#16a34a', icon:'✅' },
    rejected: { bg:'#fee2e2', color:'#dc2626', icon:'❌' },
  }[s] ?? { bg:'#f5f5f5', color:'#888', icon:'📄' })

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>My Loan</h1>
        <Link to="/apply" style={{ background:'rgba(255,255,255,0.2)', color:'white', padding:'7px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:600, textDecoration:'none', border:'1px solid rgba(255,255,255,0.3)' }}>
          + Apply
        </Link>
      </header>

      {/* Tabs */}
      <div style={{ display:'flex', background:'white', borderBottom:'1px solid #f0f0f0', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex:'0 0 auto', padding:'13px 16px', border:'none', background:'none', cursor:'pointer',
            fontSize:'12px', fontWeight: tab===t.key?700:400,
            color: tab===t.key?'var(--primary)':'#888',
            borderBottom: tab===t.key?'2px solid var(--primary)':'2px solid transparent',
            whiteSpace:'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><div className="spinner"/></div> : (
          <>
            {/* ACTIVE LOANS */}
            {tab === 'loans' && (
              loans.length === 0 ? (
                <div style={{ background:'white', borderRadius:'12px', padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>💰</div>
                  <p style={{ color:'#888', marginBottom:'16px' }}>No active loans yet.</p>
                  <Link to="/apply" className="btn btn-primary">Apply for a Loan</Link>
                </div>
              ) : loans.map(loan => {
                const progress = loan.loan_amount > 0 ? Math.round((loan.amount_paid / loan.loan_amount) * 100) : 0
                return (
                  <div key={loan.id} style={{ background:'white', borderRadius:'12px', padding:'20px', marginBottom:'12px', boxShadow:'var(--shadow-sm)', border:'1px solid var(--primary-muted)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)' }}>{loan.loan_applications?.app_id ?? '—'}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>{loan.loan_applications?.purpose ?? '—'}</div>
                      </div>
                      <span className={`badge badge-${loan.status}`}>{loan.status}</span>
                    </div>
                    {[
                      ['Loan Amount',      fmt(loan.loan_amount)],
                      ['Amount Paid',      fmt(loan.amount_paid),         '#16a34a'],
                      ['Outstanding',      fmt(loan.outstanding_balance),  'var(--primary)'],
                      ['Monthly Payment',  fmt(loan.monthly_payment)],
                      ['Next Payment',     fmtDate(loan.next_payment_date)],
                      ['Start Date',       fmtDate(loan.start_date)],
                      ['End Date',         fmtDate(loan.end_date)],
                      ['Interest Rate',    `${loan.loan_applications?.interest_rate ?? 5}%`],
                      ['Loan Term',        `${loan.loan_applications?.loan_term ?? '—'} months`],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f0f1' }}>
                        <span style={{ fontSize:'12px', color:'#888' }}>{label}</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color: color ?? '#333' }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:'14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:'#333' }}>Progress</span>
                        <span style={{ fontSize:'12px', fontWeight:700, color:'var(--primary)' }}>{progress}%</span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width:`${progress}%` }}/></div>
                    </div>
                    <Link to="/payments" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'14px' }}>
                      Make a Payment
                    </Link>
                  </div>
                )
              })
            )}

            {/* APPLICATIONS */}
            {tab === 'applications' && (
              applications.length === 0 ? (
                <div style={{ background:'white', borderRadius:'12px', padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
                  <p style={{ color:'#888', marginBottom:'16px' }}>No loan applications yet.</p>
                  <Link to="/apply" className="btn btn-primary">Apply Now</Link>
                </div>
              ) : applications.map(app => {
                const si = STATUS_INFO[app.status] ?? STATUS_INFO.pending
                return (
                  <div key={app.id} style={{ background:'white', borderRadius:'12px', padding:'20px', marginBottom:'12px', boxShadow:'var(--shadow-sm)', border:`1px solid ${si.color}33` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)' }}>{app.app_id}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>{fmtDate(app.created_at)}</div>
                      </div>
                      <span style={{ background:si.bg, color:si.color, padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>
                        {si.icon} {si.label}
                      </span>
                    </div>
                    <div style={{ background:si.bg, borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'12px', color:si.color, lineHeight:1.6 }}>{si.desc}</div>
                    {[
                      ['Loan Amount',   fmt(app.loan_amount)],
                      ['Loan Term',     `${app.loan_term} months`],
                      ['Interest Rate', `${app.interest_rate}%`],
                      ['Monthly',       fmt(app.monthly_payment)],
                      ['Total Payable', fmt(app.total_payable)],
                      ['Purpose',       app.purpose ?? '—'],
                    ].map(([l,v]) => (
                      <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f5f0f1', fontSize:'12px' }}>
                        <span style={{ color:'#888' }}>{l}</span>
                        <span style={{ fontWeight:600 }}>{v}</span>
                      </div>
                    ))}
                    {app.remarks && (
                      <div style={{ marginTop:'10px', background:'#fff8f8', border:'1px solid #fecaca', borderRadius:'8px', padding:'10px 12px' }}>
                        <span style={{ fontSize:'11px', fontWeight:700, color:'#dc2626' }}>Admin Remarks: </span>
                        <span style={{ fontSize:'12px', color:'#666' }}>{app.remarks}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              payments.length === 0 ? (
                <div style={{ background:'white', borderRadius:'12px', padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>💳</div>
                  <p style={{ color:'#888' }}>No payment records yet.</p>
                </div>
              ) : payments.map(p => (
                <div key={p.id} style={{ background:'white', borderRadius:'10px', padding:'14px 16px', marginBottom:'10px', boxShadow:'var(--shadow-sm)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#333', textTransform:'capitalize' }}>
                      {p.payment_method?.replace('_',' ')}
                    </div>
                    <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{fmtDate(p.payment_date)}</div>
                    {p.gcash_ref && <div style={{ fontSize:'11px', color:'#888' }}>Ref: {p.gcash_ref}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'var(--primary)' }}>{fmt(p.amount)}</div>
                    <span style={{
                      fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'100px',
                      background: p.status==='confirmed'?'#dcfce7':p.status==='pending'?'#fef3c7':'#fee2e2',
                      color: p.status==='confirmed'?'#16a34a':p.status==='pending'?'#d97706':'#dc2626'
                    }}>{p.status}</span>
                  </div>
                </div>
              ))
            )}

            {/* DOCUMENTS */}
            {tab === 'documents' && (
              <>
                <div style={{ background:'var(--primary-pale)', border:'1px solid var(--primary-muted)', borderRadius:'10px', padding:'12px 14px', marginBottom:'14px', fontSize:'12px', color:'var(--text-medium)', lineHeight:1.7 }}>
                  📋 Documents are reviewed by admin. Status updates appear here in real time.
                </div>
                {documents.length === 0 ? (
                  <div style={{ background:'white', borderRadius:'12px', padding:'40px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:'48px', marginBottom:'12px' }}>📁</div>
                    <p style={{ color:'#888', marginBottom:'16px' }}>No documents uploaded yet.</p>
                    <Link to="/apply" className="btn btn-primary">Upload via Loan Application</Link>
                  </div>
                ) : documents.map(doc => {
                  const ds = docStatusStyle(doc.status)
                  return (
                    <div key={doc.id} style={{ background:'white', borderRadius:'10px', padding:'14px 16px', marginBottom:'10px', boxShadow:'var(--shadow-sm)', border:`1px solid ${doc.status==='rejected'?'#fca5a5':doc.status==='verified'?'#86efac':'#e8e0e0'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                        <div>
                          <div style={{ fontSize:'13px', fontWeight:600, textTransform:'capitalize' }}>{doc.doc_type?.replace(/_/g,' ')}</div>
                          <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{doc.file_name}</div>
                          <div style={{ fontSize:'11px', color:'#888' }}>
                            {doc.loan_applications?.app_id ?? '—'} · {fmtDate(doc.created_at)}
                          </div>
                        </div>
                        <span style={{ background:ds.bg, color:ds.color, padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>
                          {ds.icon} {doc.status}
                        </span>
                      </div>
                      {doc.notes && (
                        <div style={{ background: doc.status==='rejected'?'#fff1f2':'#f0fdf4', borderRadius:'6px', padding:'8px 10px', fontSize:'12px', color: doc.status==='rejected'?'#dc2626':'#16a34a', marginBottom:'8px' }}>
                          Admin note: {doc.notes}
                        </div>
                      )}
                      {doc.file_path && (
                        <button onClick={()=>openFile(doc.file_path)} className="btn btn-sm btn-secondary" style={{ fontSize:'11px', marginTop:'4px' }}>
                          📄 View My Document
                        </button>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
      <CustomerNav />
    </div>
  )
}
