import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

const navItems = [
  { to: '/admin',               label: 'Dashboard',       icon: '⊞' },
  { to: '/admin/customers',     label: 'Customers',       icon: '👥' },
  { to: '/admin/loans',         label: 'Loan Applicants', icon: '📋' },
  { to: '/admin/payments',      label: 'Payments',        icon: '💳' },
  { to: '/admin/penalties',     label: 'Penalties',       icon: '⚠️' },
  { to: '/admin/documents',     label: 'Documents',       icon: '📁' },
  { to: '/admin/notifications', label: 'Notifications',   icon: '🔔', badge: true },
  { to: '/admin/users',         label: 'User Management', icon: '🔧' },
  { to: '/admin/audit-trail',   label: 'Audit Trail',     icon: '🕵️' },
]

export default function AdminSidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile?.id) return

    // Initial count
    const loadCount = () =>
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))

    loadCount()

    // Realtime — badge updates instantly when new notification arrives
    const ch = supabase.channel(`admin-sidebar-badge-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, loadCount)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function handleLogout() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo"><span>Velveth</span> Lending</div>
        <div className="brand-sub">Admin Panel</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.badge && unread > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--primary)',
                color: 'white', fontSize: '9px', fontWeight: 800,
                minWidth: '16px', height: '16px', padding: '0 3px',
                borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {Math.min(unread, 99)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {profile && (
          <div style={{ padding: '0 20px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {profile.full_name}
          </div>
        )}
        <button onClick={handleLogout} className="nav-item logout" style={{ width: '100%', border: 'none', cursor: 'pointer' }}>
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  )
}
