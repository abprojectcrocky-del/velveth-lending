import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [filtered,  setFiltered]  = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [tab,       setTab]       = useState('info') // info | loans | payments | penalties | docs
  const [detail,    setDetail]    = useState({ loans:[], payments:[], penalties:[], docs:[] })
  const [detailLoading, setDetailLoading] = useState(false)
  const [loanMap,   setLoanMap]   = useState({})

  // Edit profile inline
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState({})

  useEffect(() => { fetchCustomers() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(customers.filter(c =>
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ))
  }, [search, customers])

  // Realtime — refresh table when any profile changes
  useEffect(() => {
    const ch = supabase.channel('admin-customers-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchCustomers)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role','customer').order('created_at',{ascending:false})
    const list = data ?? []
    setCustomers(list)
    setFiltered(list)
    if (list.length) {
      const ids = list.map(c => c.id)
      const { data: loans } = await supabase.from('loans').select('customer_id,status').in('customer_id', ids)
      const map = {}
      ;(loans ?? []).forEach(l => {
        if (!map[l.customer_id]) map[l.customer_id] = { active:0, completed:0 }
        map[l.customer_id][l.status] = (map[l.customer_id][l.status] ?? 0) + 1
      })
      setLoanMap(map)
    }
    setLoading(false)
  }

  async function openCustomer(c) {
    setSelected(c)
    setTab('info')
    setEditing(false)
    setEditForm({ full_name: c.full_name, phone: c.phone ?? '', address: c.address ?? '', status: c.status })
    loadDetail(c.id)
  }

  async function loadDetail(uid) {
    setDetailLoading(true)
    const [loansR, payR, penR, docR] = await Promise.all([
      supabase.from('loans').select('*, loan_applications(app_id,purpose,loan_term)').eq('customer_id', uid).order('created_at',{ascending:false}),
      supabase.from('payments').select('*').eq('customer_id', uid).order('payment_date',{ascending:false}).limit(20),
      supabase.from('penalties').select('*, loans(loan_applications(app_id))').eq('customer_id', uid).order('created_at',{ascending:false}),
      supabase.from('documents').select('*, loan_applications(app_id)').eq('customer_id', uid).order('created_at',{ascending:false}),
    ])
    setDetail({
      loans:    loansR.data ?? [],
      payments: payR.data   ?? [],
      penalties:penR.data   ?? [],
      docs:     docR.data   ?? [],
    })
    setDetailLoading(false)
  }

  async function handleSaveEdit() {
    if (!selected) return
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      phone:     editForm.phone,
      address:   editForm.address,
      status:    editForm.status,
      updated_at: new Date().toISOString()
    }).eq('id', selected.id)
    if (error) { toast.error('Update failed'); return }
    toast.success('Profile updated')
    setEditing(false)
    setSelected({ ...selected, ...editForm })
    fetchCustomers()
  }

  async function handleDeleteCustomer() {
    if (!selected) return
    if (!window.confirm(`Delete ${selected.full_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', selected.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Customer deleted')
    setSelected(null)
    fetchCustomers()
  }

  async function toggleStatus() {
    if (!selected) return
    const ns = selected.status === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: ns }).eq('id', selected.id)
    setSelected({ ...selected, status: ns })
    toast.success(`Customer ${ns}`)
    fetchCustomers()
  }

  async function openFile(filePath) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Cannot open file')
  }

  async function updatePenaltyStatus(id, status) {
    await supabase.from('penalties').update({ status }).eq('id', id)
    toast.success(`Penalty ${status}`)
    loadDetail(selected.id)
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const s = selected

  const TABS = [
    { key:'info',      label:'Profile' },
    { key:'loans',     label:`Loans (${detail.loans.length})` },
    { key:'payments',  label:`Payments (${detail.payments.length})` },
    { key:'penalties', label:`Penalties (${detail.penalties.length})` },
    { key:'docs',      label:`Documents (${detail.docs.length})` },
  ]

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Customers</div>
        </header>
        <div className="page-content">
          <div className="page-header"><h2>Customer Management</h2><p>View, edit, and manage all customers — click any row to open full profile</p></div>

          <div className="card-admin">
            <div className="card-header-admin">
              <h3>All Customers ({filtered.length})</h3>
              <div className="search-box" style={{ width:'260px' }}>
                <span className="search-icon">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, phone…" />
              </div>
            </div>
            <div className="table-container">
              {loading ? <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div> : (
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Active Loans</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'#aaa' }}>No customers found</td></tr>
                    ) : filtered.map(c => (
                      <tr key={c.id} onClick={() => openCustomer(c)} style={{ cursor:'pointer' }}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'var(--primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>
                              {c.full_name?.substring(0,2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600 }}>{c.full_name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:'12px', color:'#666' }}>{c.email}</td>
                        <td style={{ fontSize:'12px' }}>{c.phone ?? '—'}</td>
                        <td>
                          {loanMap[c.id]?.active > 0
                            ? <span style={{ background:'#dcfce7', color:'#16a34a', padding:'3px 8px', borderRadius:'100px', fontSize:'11px', fontWeight:600 }}>{loanMap[c.id].active} active</span>
                            : <span style={{ color:'#aaa', fontSize:'12px' }}>None</span>}
                        </td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                        <td style={{ fontSize:'12px', color:'#888' }}>{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-detail side panel */}
      {s && (
        <div style={{ position:'fixed', inset:0, background:'rgba(61,16,24,0.45)', zIndex:999, display:'flex', justifyContent:'flex-end' }} onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div style={{ width:'600px', background:'white', height:'100vh', overflowY:'auto', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.15)' }}>

            {/* Panel header */}
            <div style={{ background:'var(--primary)', padding:'20px 24px', display:'flex', alignItems:'center', gap:'14px', flexShrink:0 }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, flexShrink:0 }}>
                {s.full_name?.substring(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'white', fontSize:'16px', fontWeight:700 }}>{s.full_name}</div>
                <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'12px' }}>{s.email}</div>
              </div>
              <span style={{ background: s.status==='active'?'#dcfce7':'#fee2e2', color: s.status==='active'?'#16a34a':'#dc2626', padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>{s.status}</span>
              <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:'30px', height:'30px', borderRadius:'50%', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            {/* Action bar */}
            <div style={{ display:'flex', gap:'8px', padding:'12px 24px', borderBottom:'1px solid #f0f0f0', flexShrink:0 }}>
              <button onClick={toggleStatus} className={`btn btn-sm btn-${s.status==='active'?'warning':'success'}`}>
                {s.status==='active' ? '🚫 Suspend' : '✅ Activate'}
              </button>
              <button onClick={()=>setEditing(!editing)} className="btn btn-sm btn-secondary">✏️ Edit</button>
              <button onClick={handleDeleteCustomer} className="btn btn-sm btn-danger" style={{ marginLeft:'auto' }}>🗑 Delete</button>
            </div>

            {/* Tab bar */}
            <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0', flexShrink:0, overflowX:'auto' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={()=>setTab(t.key)} style={{
                  padding:'12px 16px', border:'none', background:'none', cursor:'pointer', whiteSpace:'nowrap',
                  fontSize:'12px', fontWeight: tab===t.key?700:400,
                  color: tab===t.key?'var(--primary)':'#888',
                  borderBottom: tab===t.key?'2px solid var(--primary)':'2px solid transparent'
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ flex:1, padding:'20px 24px', overflowY:'auto' }}>
              {detailLoading ? <div style={{ textAlign:'center', padding:'40px' }}><div className="spinner" style={{ margin:'0 auto' }}/></div> : (
                <>
                  {/* ── INFO TAB ── */}
                  {tab === 'info' && (
                    editing ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                        <div><label className="form-label">Full Name</label><input className="form-control" value={editForm.full_name} onChange={e=>setEditForm(f=>({...f,full_name:e.target.value}))} /></div>
                        <div><label className="form-label">Phone</label><input className="form-control" value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))} /></div>
                        <div><label className="form-label">Address</label><input className="form-control" value={editForm.address} onChange={e=>setEditForm(f=>({...f,address:e.target.value}))} /></div>
                        <div>
                          <label className="form-label">Status</label>
                          <select className="form-control" value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))}>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button onClick={()=>setEditing(false)} className="btn btn-secondary">Cancel</button>
                          <button onClick={handleSaveEdit} className="btn btn-primary">Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {[
                          ['Full Name', s.full_name],
                          ['Email', s.email],
                          ['Phone', s.phone ?? '—'],
                          ['Address', s.address ?? '—'],
                          ['Status', s.status],
                          ['Role', s.role],
                          ['Joined', fmtDate(s.created_at)],
                          ['Active Loans', loanMap[s.id]?.active ?? 0],
                          ['Completed Loans', loanMap[s.id]?.completed ?? 0],
                        ].map(([l,v]) => (
                          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid #f5f0f1', fontSize:'13px' }}>
                            <span style={{ color:'#888' }}>{l}</span>
                            <span style={{ fontWeight:600, textTransform:'capitalize' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* ── LOANS TAB ── */}
                  {tab === 'loans' && (
                    detail.loans.length === 0 ? <p style={{ color:'#aaa', textAlign:'center', padding:'30px 0' }}>No loans</p> :
                    detail.loans.map(loan => {
                      const prog = loan.loan_amount > 0 ? Math.round((loan.amount_paid / loan.loan_amount) * 100) : 0
                      return (
                        <div key={loan.id} style={{ background:'#fafafa', borderRadius:'10px', padding:'16px', marginBottom:'12px', border:'1px solid #f0ecec' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                            <div>
                              <div style={{ fontWeight:700, color:'var(--primary)', fontSize:'13px' }}>{loan.loan_applications?.app_id}</div>
                              <div style={{ fontSize:'12px', color:'#888' }}>{loan.loan_applications?.purpose}</div>
                            </div>
                            <span className={`badge badge-${loan.status}`}>{loan.status}</span>
                          </div>
                          {[
                            ['Loan Amount', fmt(loan.loan_amount)],
                            ['Amount Paid', fmt(loan.amount_paid)],
                            ['Outstanding', fmt(loan.outstanding_balance)],
                            ['Monthly', fmt(loan.monthly_payment)],
                            ['Next Payment', fmtDate(loan.next_payment_date)],
                          ].map(([l,v]) => (
                            <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'4px 0', borderBottom:'1px solid #f0f0f0' }}>
                              <span style={{ color:'#888' }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                            </div>
                          ))}
                          <div style={{ marginTop:'10px' }}>
                            <div className="progress-track"><div className="progress-fill" style={{ width:`${prog}%` }}/></div>
                            <div style={{ fontSize:'11px', color:'#888', marginTop:'4px', textAlign:'right' }}>{prog}% paid</div>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {/* ── PAYMENTS TAB ── */}
                  {tab === 'payments' && (
                    detail.payments.length === 0 ? <p style={{ color:'#aaa', textAlign:'center', padding:'30px 0' }}>No payments</p> :
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                      <thead><tr style={{ background:'#fff0f2' }}>
                        <th style={{ padding:'10px 12px', textAlign:'left', color:'var(--primary)', fontWeight:700, fontSize:'10px', textTransform:'uppercase' }}>Date</th>
                        <th style={{ padding:'10px 12px', textAlign:'left', color:'var(--primary)', fontWeight:700, fontSize:'10px', textTransform:'uppercase' }}>Amount</th>
                        <th style={{ padding:'10px 12px', textAlign:'left', color:'var(--primary)', fontWeight:700, fontSize:'10px', textTransform:'uppercase' }}>Method</th>
                        <th style={{ padding:'10px 12px', textAlign:'left', color:'var(--primary)', fontWeight:700, fontSize:'10px', textTransform:'uppercase' }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {detail.payments.map(p => (
                          <tr key={p.id} style={{ borderBottom:'1px solid #f5f0f1' }}>
                            <td style={{ padding:'10px 12px', color:'#666' }}>{fmtDate(p.payment_date)}</td>
                            <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--primary)' }}>{fmt(p.amount)}</td>
                            <td style={{ padding:'10px 12px', textTransform:'capitalize' }}>{p.payment_method?.replace('_',' ')}</td>
                            <td style={{ padding:'10px 12px' }}><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* ── PENALTIES TAB ── */}
                  {tab === 'penalties' && (
                    detail.penalties.length === 0 ? <p style={{ color:'#aaa', textAlign:'center', padding:'30px 0' }}>No penalties</p> :
                    detail.penalties.map(pen => (
                      <div key={pen.id} style={{ background:'#fafafa', borderRadius:'10px', padding:'14px', marginBottom:'10px', border:'1px solid #f0ecec' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                          <div>
                            <div style={{ fontWeight:700, color:'#dc2626', fontSize:'14px' }}>{fmt(pen.penalty_amount)}</div>
                            <div style={{ fontSize:'12px', color:'#888' }}>{pen.reason}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <span className={`badge badge-${pen.status}`}>{pen.status}</span>
                            <div style={{ fontSize:'11px', color:'#aaa', marginTop:'4px' }}>{fmtDate(pen.created_at)}</div>
                          </div>
                        </div>
                        {pen.status === 'pending' && (
                          <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
                            <button onClick={()=>updatePenaltyStatus(pen.id,'paid')} className="btn btn-sm btn-success" style={{ fontSize:'11px' }}>Mark Paid</button>
                            <button onClick={()=>updatePenaltyStatus(pen.id,'waived')} className="btn btn-sm btn-secondary" style={{ fontSize:'11px' }}>Waive</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* ── DOCUMENTS TAB ── */}
                  {tab === 'docs' && (
                    detail.docs.length === 0 ? <p style={{ color:'#aaa', textAlign:'center', padding:'30px 0' }}>No documents uploaded</p> :
                    detail.docs.map(doc => (
                      <div key={doc.id} style={{ background:'#fafafa', borderRadius:'10px', padding:'14px', marginBottom:'10px', border:'1px solid #f0ecec', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'13px' }}>{doc.doc_type?.replace('_',' ')}</div>
                          <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{doc.file_name} · {fmtDate(doc.created_at)}</div>
                          {doc.notes && <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>Note: {doc.notes}</div>}
                        </div>
                        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                          <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                          {doc.file_path && (
                            <button onClick={()=>openFile(doc.file_path)} className="btn btn-sm btn-secondary" style={{ fontSize:'11px' }}>📄 View</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
