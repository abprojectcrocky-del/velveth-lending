// Admin Users Management
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { toast } from 'sonner'

export default function AdminUsers() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', password:'', role:'customer' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (form.password.length < 9) { toast.error('Password must be at least 9 characters'); return }
    setSubmitting(true)
    try {
      // NOTE: In production use Supabase Admin API (service_role key) to create users server-side
      // For now this works for direct signUp
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.full_name, phone: form.phone, role: form.role } }
      })
      if (error) { toast.error(error.message); return }
      toast.success('User created successfully!')
      setShowAdd(false)
      setForm({ full_name:'', email:'', phone:'', password:'', role:'customer' })
      setTimeout(fetchUsers, 1500)
    } finally { setSubmitting(false) }
  }

  async function toggleStatus(user) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id)
    toast.success(`User ${newStatus}`)
    fetchUsers()
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'

  return (
    <div className="layout">
      <AdminSidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">User Management</div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Create User</button>
        </header>
        <div className="page-content">
          <div className="page-header"><h2>Users</h2><p>Manage all admin and customer accounts</p></div>
          <div className="card-admin">
            <div className="card-header-admin"><h3>All Users ({users.length})</h3></div>
            <div className="table-container">
              {loading ? <div style={{ padding:'40px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div> : (
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight:600 }}>{u.full_name}</td>
                        <td style={{ fontSize:'12px', color:'#666' }}>{u.email}</td>
                        <td><span style={{ background: u.role==='admin'?'var(--primary-pale)':'#f5f5f5', color: u.role==='admin'?'var(--primary)':'#666', padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:600, textTransform:'capitalize' }}>{u.role}</span></td>
                        <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                        <td style={{ fontSize:'12px', color:'#888' }}>{fmtDate(u.created_at)}</td>
                        <td>
                          <button onClick={()=>toggleStatus(u)} className={`btn btn-sm btn-${u.status==='active'?'warning':'success'}`} style={{ fontSize:'11px' }}>
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
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

      {showAdd && (
        <div className="modal-overlay-admin open" onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className="modal-box">
            <div className="modal-header-admin">
              <h3>Create New User</h3>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body-admin" style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div><label className="form-label">Full Name</label><input className="form-control" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required /></div>
                <div><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
                <div><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                <div>
                  <label className="form-label">Role</label>
                  <select className="form-control" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div><label className="form-label">Password (min 9 chars)</label><input type="password" className="form-control" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required minLength={9} /></div>
              </div>
              <div className="modal-footer-admin">
                <button type="button" onClick={()=>setShowAdd(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Creating…' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
