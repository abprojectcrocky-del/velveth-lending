import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerNav() {
  const { profile } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    const load = () => supabase.from('notifications').select('id',{count:'exact',head:true})
      .eq('user_id',profile.id).eq('is_read',false).then(({count})=>setUnread(count??0))
    load()
    const ch = supabase.channel(`nav-badge-${profile.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${profile.id}`},load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  const items = [
    { to:'/dashboard',     label:'Home',      icon:<HomeIcon/> },
    { to:'/notifications', label:'Notifs',    icon:<BellIcon/>, badge:unread },
    { to:'/payments',      label:'Pay',       icon:<PayIcon/> },
    { to:'/penalties',     label:'Penalties', icon:<WarnIcon/> },
    { to:'/profile',       label:'Profile',   icon:<UserIcon/> },
  ]

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <NavLink key={item.to} to={item.to}
          className={({isActive}) => `bottom-nav-item${isActive?' active':''}`}>
          <div style={{position:'relative'}}>
            {item.icon}
            {item.badge > 0 && <span className="nav-badge">{Math.min(item.badge,99)}</span>}
          </div>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function PayIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
function WarnIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
