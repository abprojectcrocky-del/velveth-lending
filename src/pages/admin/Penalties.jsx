import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'
import { notifyPenaltyAdded } from '../../lib/gmail'

export default function AdminPenalties() {
  const [penalties, setPenalties] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showEdit,  setShowEdit]  = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [customers, setCustomers] = useState([])
  const [loans,     setLoans]     = useState([])
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [form, setForm] = useState({ customer_id:'', loan_id:'', penalty_amount:'', reason:'', due_date:'' })

  useEffect(() => { fetchAll() }, [])

  // Realtime — customer sees penalty the moment admin adds it
  useEffect(() => {
    const ch = supabase.channel('admin-penalties-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penalties' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [penRes, cusRes] = await Promise.all([
      supabase.from('penalties')
        .select('*, profiles(full_name,email), loans(loan_applications(app_id))')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name').eq('role','customer').eq('status','active').order('full_name')
    ])
    setPenalties(penRes.data ?? [])
    setCustomers(cusRes.data ?? [])
    setLoading(false)
  }

  async function fetchCustomerLoans(customerId) {
    const { data } = await supabase.from('loans')
      .select('id, loan_applications(app_id)')
      .eq('customer_id', customerId)
      .in('status', ['active'])
    setLoans(data ?? [])
    setForm(f => ({ ...f, customer_id: customerId, loan_id: '' }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.loan_id) { toast.error('Please select a loan'); return }
    if (!form.penalty_amount || parseFloat(form.penalty_amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.reason) { toast.error('Please enter a reason'); return }

    const { error } = await supabase.from('penalties').insert({
      loan_id:        form.loan_id,
      customer_id:    form.customer_id,
      penalty_amount: parseFloat(form.penalty_amount),
      reason:         form.reason,
      due_date:       form.due_date || null,
      status:         'pending'
    })
    if (error) { toast.error('Failed to add penalty'); return }

    // In-app + Gmail notification to customer
    await supabase.from('notifications').insert({
      user_id: form.customer_id,
      title:   '⚠️ Penalty Added to Your Account',
      message: `A penalty of ₱${parseFloat(form.penalty_amount).toLocaleString('en-PH',{minimumFractionDigits:2})} has been added. Reason: ${form.reason}${form.due_date ? `. Due: ${new Date(form.due_date).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}` : ''}`,
      type:    'warning'
    })
    const { data: custProfile } = await supabase.from('profiles').select('email,full_name').eq('id', form.customer_id).single()
    if (custProfile?.email) {
      notifyPenaltyAdded(custProfile.email, custProfile.full_name, parseFloat(form.penalty_amount), form.reason)
    }

    toast.success('Penalty added — customer notified')
    setShowAdd(false)
    setForm({ customer_id:'', loan_id:'', penalty_amount:'', reason:'', due_date:'' })
    fetchAll()
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!selected) return
    await supabase.from('penalties').update({
      penalty_amount: parseFloat(form.penalty_amount),
      reason:         form.reason,
      due_date:       form.due_date || null,
    }).eq('id', selected.id)
    toast.success('Penalty updated')
    setShowEdit(false)
    setSelected(null)
    fetchAll()
  }

  async function updateStatus(id, status) {
    await supabase.from('penalties').update({ status }).eq('id', id)
    // Notify customer
    const pen = penalties.find(p => p.id === id)
    if (pen) {
      await supabase.from('notifications').insert({
        user_id: pen.customer_id,
        title:   status === 'paid' ? '✅ Penalty Marked Paid' : '✅ Penalty Waived',
        message: `Your penalty of ₱${Number(pen.penalty_amount).toLocaleString('en-PH',{minimumFractionDigits:2})} has been ${status}.`,
        type:    'success'
      })
    }
    toast.success(`Penalty ${status}`)
    fetchAll()
  }

  async function deletePenalty(id) {
    if (!window.confirm('Delete this penalty?')) return
    await supabase.from('penalties').delete().eq('id', id)
    toast.success('Penalty deleted')
    fetchAll()
  }

  function openEdit(pen) {
    setSelected(pen)
    setForm({
      customer_id:    pen.customer_id,
      loan_id:        pen.loan_id,
      penalty_amount: pen.penalty_amount,
      reason:         pen.reason ?? '',
      due_date:       pen.due_date ?? ''
    })
    setShowEdit(true)
  }

  const fmt = n => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'

  const displayed = penalties.filter(p => {
    const q = search.toLowerCase()
    const matchFilter = filter === 'all' || p.status === filter
    const matchSearch = !q || p.profiles?.full_name?.toLowerCase().includes(q) || p.reason?.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalPending = penalties.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.penalty_amount),0)

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Penalties</div>
          <button onClick={()=>{ setShowAdd(true); setLoans([]) }} className="btn btn-primary">+ Add Penalty</button>
        </header>
        <div className="page-content">
          <div className="page-header"><h2>Penalty Management</h2><p>Add, edit, update, and delete customer penalties — changes appear on customer side instantly</p></div>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
            {[
              { label:'Total Pending',   value: fmt(totalPending),                                     color:'#dc2626' },
              { label:'Pending Count',   value: penalties.filter(p=>p.status==='pending').length,      color:'#d97706' },
              { label:'Paid',            value: penalties.filter(p=>p.status==='paid').length,         color:'#16a34a' },
              { label:'Waived',          value: penalties.filter(p=>p.status==='waived').length,       color:'#2563eb' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color:s.color, fontSize:'22px' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter + search */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'16px', alignItems:'center', flexWrap:'wrap' }}>
            {['all','pending','paid','waived'].map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:'7px 14px', borderRadius:'100px', border:'1.5px solid', fontSize:'12px', fontWeight:600, cursor:'pointer', textTransform:'capitalize',
                borderColor: filter===f?'var(--primary)':'#e0e0e0',
                background:  filter===f?'var(--primary)':'white',
                color:       filter===f?'white':'#666'
              }}>{f}</button>
            ))}
            <div className="search-box" style={{ width:'220px', marginLeft:'auto' }}>
              <span className="search-icon">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer or reason…" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Penalties ({displayed.length})</h3>
              <span style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>🟢 Live</span>
            </div>
            <div className="table-container">
              {loading ? (
                <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
              ) : displayed.length === 0 ? (
                <div style={{ padding:'60px', textAlign:'center', color:'#aaa' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
                  <p>No penalties found</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Customer</th><th>Loan</th><th>Amount</th><th>Reason</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {displayed.map(pen => (
                      <tr key={pen.id}>
                        <td>
                          <div style={{ fontWeight:600, fontSize:'13px' }}>{pen.profiles?.full_name}</div>
                          <div style={{ fontSize:'11px', color:'#888' }}>{fmtDate(pen.created_at)}</div>
                        </td>
                        <td style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>{pen.loans?.loan_applications?.app_id ?? '—'}</td>
                        <td style={{ fontWeight:700, color:'#dc2626' }}>{fmt(pen.penalty_amount)}</td>
                        <td style={{ fontSize:'12px', color:'#666', maxWidth:'160px' }}>{pen.reason ?? '—'}</td>
                        <td style={{ fontSize:'12px' }}>{fmtDate(pen.due_date)}</td>
                        <td><span className={`badge badge-${pen.status}`}>{pen.status}</span></td>
                        <td>
                          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                            {pen.status === 'pending' && (
                              <>
                                <button onClick={()=>openEdit(pen)} className="btn btn-sm btn-secondary" style={{ fontSize:'10px' }}>✏️ Edit</button>
                                <button onClick={()=>updateStatus(pen.id,'paid')} className="btn btn-sm btn-success" style={{ fontSize:'10px' }}>Paid</button>
                                <button onClick={()=>updateStatus(pen.id,'waived')} className="btn btn-sm btn-secondary" style={{ fontSize:'10px' }}>Waive</button>
                              </>
                            )}
                            <button onClick={()=>deletePenalty(pen.id)} className="btn btn-sm btn-danger" style={{ fontSize:'10px' }}>🗑</button>
                          </div>
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

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay open" onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Penalty</h3>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label className="form-label">Customer *</label>
                  <select className="form-control" value={form.customer_id} onChange={e=>fetchCustomerLoans(e.target.value)} required>
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Active Loan *</label>
                  <select className="form-control" value={form.loan_id} onChange={e=>setForm(f=>({...f,loan_id:e.target.value}))} required>
                    <option value="">Select loan…</option>
                    {loans.map(l => <option key={l.id} value={l.id}>{l.loan_applications?.app_id}</option>)}
                  </select>
                  {form.customer_id && loans.length === 0 && <p style={{ fontSize:'11px', color:'#dc2626', marginTop:'4px' }}>This customer has no active loans.</p>}
                </div>
                <div>
                  <label className="form-label">Penalty Amount (₱) *</label>
                  <input type="number" className="form-control" value={form.penalty_amount} onChange={e=>setForm(f=>({...f,penalty_amount:e.target.value}))} required min="1" step="0.01" placeholder="e.g. 250" />
                </div>
                <div>
                  <label className="form-label">Reason *</label>
                  <input className="form-control" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} required placeholder="e.g. Late Payment (5 Days Overdue)" />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={()=>setShowAdd(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-danger">Add Penalty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <div className="modal-overlay open" onClick={e=>{if(e.target===e.currentTarget)setShowEdit(false)}}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Penalty</h3>
              <button onClick={()=>setShowEdit(false)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'12px', fontSize:'13px' }}>
                  <strong>{selected.profiles?.full_name}</strong> — {selected.loans?.loan_applications?.app_id}
                </div>
                <div>
                  <label className="form-label">Penalty Amount (₱)</label>
                  <input type="number" className="form-control" value={form.penalty_amount} onChange={e=>setForm(f=>({...f,penalty_amount:e.target.value}))} required min="1" step="0.01" />
                </div>
                <div>
                  <label className="form-label">Reason</label>
                  <input className="form-control" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} required />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={()=>setShowEdit(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
