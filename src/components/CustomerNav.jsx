import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerNav() {
  const { profile } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile?.id) return

    const loadCount = () =>
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))

    loadCount()

    // Realtime updates
    const ch = supabase
      .channel(`notif-badge-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, loadCount)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  const items = [
    { to: '/dashboard',    icon: HomeIcon,   label: 'Home' },
    { to: '/notifications', icon: BellIcon,  label: 'Notif', badge: unread },
    { to: '/payments',     icon: PayIcon,    label: 'Pay' },
    { to: '/penalties',    icon: WarnIcon,   label: 'Penalties' },
    { to: '/profile',      icon: UserIcon,   label: 'Profile' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <div style={{ position: 'relative' }}>
            <item.icon />
            {item.badge > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-6px',
                background: '#ef4444', color: 'white',
                fontSize: '8px', fontWeight: 700,
                minWidth: '14px', height: '14px', borderRadius: '100px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px'
              }}>{item.badge}</span>
            )}
          </div>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

// Simple inline SVG icons
function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function PayIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}
function WarnIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
