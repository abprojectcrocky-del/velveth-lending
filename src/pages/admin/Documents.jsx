import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'

export default function AdminDocuments() {
  const [docs,     setDocs]    = useState([])
  const [filter,   setFilter]  = useState('pending')
  const [search,   setSearch]  = useState('')
  const [loading,  setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [notes,    setNotes]    = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchDocs() }, [filter])

  // Realtime — admin sees new documents instantly when customer uploads
  useEffect(() => {
    const ch = supabase.channel('admin-docs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchDocs())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [filter])

  async function fetchDocs() {
    setLoading(true)
    let q = supabase.from('documents')
      .select('*, profiles(full_name,email), loan_applications(app_id)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setDocs(data ?? [])
    setLoading(false)
  }

  async function updateDocStatus(status) {
    if (!selected) return
    setActionLoading(true)
    try {
      await supabase.from('documents').update({
        status,
        notes,
        reviewed_at: new Date().toISOString()
      }).eq('id', selected.id)

      // Notify customer — in-app realtime
      await supabase.from('notifications').insert({
        user_id: selected.customer_id,
        title:   status === 'verified' ? '✅ Document Verified' : '❌ Document Rejected',
        message: `Your document "${selected.doc_type?.replace('_',' ')}" has been ${status}.${notes ? ` Note: ${notes}` : ''}`,
        type:    status === 'verified' ? 'success' : 'warning'
      })

      toast.success(`Document ${status}`)
      setSelected(null)
      fetchDocs()
    } finally { setActionLoading(false) }
  }

  async function deleteDoc(doc) {
    if (!window.confirm('Delete this document record?')) return
    // Remove file from storage
    if (doc.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path])
    }
    await supabase.from('documents').delete().eq('id', doc.id)
    toast.success('Document deleted')
    setSelected(null)
    fetchDocs()
  }

  async function openFile(filePath) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not open file')
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const filtered = docs.filter(d => {
    const q = search.toLowerCase()
    return !q || d.profiles?.full_name?.toLowerCase().includes(q) || d.doc_type?.toLowerCase().includes(q) || d.loan_applications?.app_id?.toLowerCase().includes(q)
  })

  const stats = {
    pending:  docs.filter(d=>d.status==='pending').length,
    verified: docs.filter(d=>d.status==='verified').length,
    rejected: docs.filter(d=>d.status==='rejected').length,
  }

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Documents</div>
        </header>
        <div className="page-content">
          <div className="page-header">
            <h2>Document Management</h2>
            <p>Live updates — new uploads appear automatically</p>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'20px' }}>
            {[
              { label:'Pending Review', count: stats.pending,  color:'#d97706', bg:'#fef3c7' },
              { label:'Verified',       count: stats.verified, color:'#16a34a', bg:'#dcfce7' },
              { label:'Rejected',       count: stats.rejected, color:'#dc2626', bg:'#fee2e2' },
            ].map(s => (
              <div key={s.label} style={{ background:'white', borderRadius:'var(--radius-md)', padding:'18px', border:`1px solid ${s.bg}`, boxShadow:'var(--shadow-sm)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'26px', fontWeight:700, color:s.color }}>{s.count}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{s.label}</div>
                </div>
                <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
                  {s.label==='Pending Review'?'⏳':s.label==='Verified'?'✅':'❌'}
                </div>
              </div>
            ))}
          </div>

          {/* Filter + search */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:'6px' }}>
              {['all','pending','verified','rejected'].map(f => (
                <button key={f} onClick={()=>setFilter(f)} style={{
                  padding:'7px 14px', borderRadius:'100px', border:'1.5px solid', fontSize:'12px', fontWeight:600, cursor:'pointer', textTransform:'capitalize',
                  borderColor: filter===f?'var(--primary)':'#e0e0e0',
                  background:  filter===f?'var(--primary)':'white',
                  color:       filter===f?'white':'#666'
                }}>{f}</button>
              ))}
            </div>
            <div className="search-box" style={{ width:'240px', marginLeft:'auto' }}>
              <span className="search-icon">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, doc type…" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Documents ({filtered.length})</h3>
              <span style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>🟢 Live</span>
            </div>
            <div className="table-container">
              {loading ? (
                <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:'60px', textAlign:'center', color:'#aaa' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📁</div>
                  <p>No documents {filter !== 'all' ? `with status "${filter}"` : ''}</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th><th>App ID</th><th>Document Type</th>
                      <th>File</th><th>Status</th><th>Submitted</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id}>
                        <td>
                          <div style={{ fontWeight:600, fontSize:'13px' }}>{d.profiles?.full_name}</div>
                          <div style={{ fontSize:'11px', color:'#888' }}>{d.profiles?.email}</div>
                        </td>
                        <td style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>{d.loan_applications?.app_id ?? '—'}</td>
                        <td style={{ fontSize:'13px', textTransform:'capitalize' }}>{d.doc_type?.replace(/_/g,' ')}</td>
                        <td>
                          {d.file_path
                            ? <button onClick={()=>openFile(d.file_path)} className="btn btn-sm btn-secondary" style={{ fontSize:'11px' }}>📄 Open</button>
                            : <span style={{ color:'#aaa', fontSize:'12px' }}>—</span>}
                        </td>
                        <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                        <td style={{ fontSize:'12px', color:'#888' }}>{fmtDate(d.created_at)}</td>
                        <td>
                          <div style={{ display:'flex', gap:'4px' }}>
                            <button onClick={()=>{ setSelected(d); setNotes(d.notes ?? '') }} className="btn btn-sm btn-primary" style={{ fontSize:'11px' }}>
                              {d.status==='pending' ? '⚖️ Review' : '👁 View'}
                            </button>
                            <button onClick={()=>deleteDoc(d)} className="btn btn-sm btn-danger" style={{ fontSize:'11px' }}>🗑</button>
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

      {/* Review Modal */}
      {selected && (
        <div className="modal-overlay open" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div className="modal-box" style={{ maxWidth:'520px' }}>
            <div className="modal-header">
              <h3>Review Document</h3>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px' }}>
                <div style={{ fontWeight:700, fontSize:'14px' }}>{selected.profiles?.full_name}</div>
                <div style={{ fontSize:'12px', color:'#888' }}>{selected.profiles?.email}</div>
              </div>
              {[
                ['App ID',         selected.loan_applications?.app_id ?? '—'],
                ['Document Type',  selected.doc_type?.replace(/_/g,' ')],
                ['File Name',      selected.file_name ?? '—'],
                ['Current Status', selected.status],
                ['Submitted',      fmtDate(selected.created_at)],
                ['Reviewed',       fmtDate(selected.reviewed_at)],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f5f0f1', fontSize:'13px' }}>
                  <span style={{ color:'#888' }}>{l}</span>
                  <span style={{ fontWeight:600, textTransform:'capitalize' }}>{v}</span>
                </div>
              ))}
              {selected.file_path && (
                <button onClick={()=>openFile(selected.file_path)} className="btn btn-secondary" style={{ width:'100%', justifyContent:'center', marginTop:'14px' }}>
                  📄 Open Document File
                </button>
              )}
              <div style={{ marginTop:'16px' }}>
                <label className="form-label">Admin Notes / Reason</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="form-control" rows={3}
                  placeholder="Optional notes for the customer…"
                  disabled={selected.status !== 'pending'} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setSelected(null)} className="btn btn-secondary">Close</button>
              {selected.status === 'pending' && (
                <>
                  <button onClick={()=>updateDocStatus('rejected')} disabled={actionLoading} className="btn btn-danger">✕ Reject</button>
                  <button onClick={()=>updateDocStatus('verified')} disabled={actionLoading} className="btn btn-success">✓ Verify</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
