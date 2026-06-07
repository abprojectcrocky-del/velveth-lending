import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'

export default function AdminAuditTrail() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchLogs() }, [filter])

  async function fetchLogs() {
    setLoading(true)
    let q = supabase.from('audit_trail').select('*').order('created_at',{ascending:false}).limit(200)
    if (filter !== 'all') q = q.eq('type', filter)
    const { data } = await q
    setLogs(data ?? [])
    setLoading(false)
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{
    month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'
  }) : '—'

  const TYPE_STYLE = {
    admin:    { bg:'#dbeafe', color:'#1d4ed8' },
    customer: { bg:'#dcfce7', color:'#16a34a' },
    system:   { bg:'#f5f5f5', color:'#666' },
    payment:  { bg:'#fef3c7', color:'#d97706' },
  }

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    return !q || l.user_name?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q)
  })

  const types = ['all', ...new Set(logs.map(l => l.type).filter(Boolean))]

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">Audit Trail</div>
        </header>
        <div className="page-content">
          <div className="page-header">
            <h2>Audit Trail</h2>
            <p>Complete log of all system activities</p>
          </div>

          {/* Filter + Search */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {types.map(t => (
                <button key={t} onClick={()=>setFilter(t)} style={{
                  padding:'6px 12px', borderRadius:'100px', border:'1.5px solid', fontSize:'11px', fontWeight:600, cursor:'pointer', textTransform:'capitalize',
                  borderColor: filter===t?'var(--primary)':'#e0e0e0',
                  background: filter===t?'var(--primary)':'white',
                  color: filter===t?'white':'#666'
                }}>{t}</button>
              ))}
            </div>
            <div className="search-box" style={{ width:'240px', marginLeft:'auto' }}>
              <span className="search-icon">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs…" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Activity Logs ({filtered.length})</h3>
              <div style={{ fontSize:'12px', color:'#888' }}>Showing last 200 entries</div>
            </div>
            <div className="table-container">
              {loading ? (
                <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:'60px', textAlign:'center', color:'#aaa' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>🕵️</div>
                  <p>No audit logs found</p>
                  <p style={{ fontSize:'12px', marginTop:'8px' }}>Logs are generated automatically as users interact with the system.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Details</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => {
                      const ts = TYPE_STYLE[log.type] ?? TYPE_STYLE.system
                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize:'11px', color:'#888', whiteSpace:'nowrap' }}>{fmtDate(log.created_at)}</td>
                          <td>
                            <span style={{ background:ts.bg, color:ts.color, padding:'3px 8px', borderRadius:'100px', fontSize:'10px', fontWeight:600, textTransform:'capitalize' }}>
                              {log.type ?? 'system'}
                            </span>
                          </td>
                          <td style={{ fontWeight:600, fontSize:'13px' }}>{log.user_name ?? '—'}</td>
                          <td style={{ fontSize:'12px' }}>{log.action ?? '—'}</td>
                          <td style={{ fontSize:'12px', color:'#666', maxWidth:'280px' }}>{log.details ?? '—'}</td>
                          <td style={{ fontSize:'11px', color:'#aaa' }}>{log.ip_address ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
