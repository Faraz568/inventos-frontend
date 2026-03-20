import { useEffect, useState, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ChatWidget from '../ui/ChatWidget'

const NAV = [
  { to:'/home',           label:'Home',      icon:'🏠' },
  { to:'/sales',          label:'Sales',     icon:'📄' },
  { to:'/products',       label:'Products',  icon:'▦'  },
  { to:'/purchases',      label:'Purchases', icon:'↓'  },
  { to:'/categories',     label:'Categories',icon:'◫'  },
  { to:'/reports',        label:'Reports',   icon:'◻'  },
  { to:'/stock/ledger',   label:'Ledger',    icon:'📒' },
  { to:'/stock/balance',  label:'Balance',   icon:'⚖'  },
  { to:'/database',       label:'DB',        icon:'⊞'  },
]

function UserMenu({ user, isAdmin, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const avatar = user?.profilePic
    ? <img src={user.profilePic} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    : user?.username?.[0]?.toUpperCase()

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div className="avatar" onClick={() => setOpen(o => !o)} title="Account">{avatar}</div>
      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 8px)',
          background:'var(--surface)', border:'1px solid var(--border-md)',
          borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)',
          minWidth:220, overflow:'hidden', animation:'slideDown 150ms ease', zIndex:300,
        }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', overflow:'hidden', background:'var(--accent-dim)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', fontFamily:'var(--mono)', fontSize:13, fontWeight:600, flexShrink:0 }}>
                {user?.profilePic ? <img src={user.profilePic} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color:'var(--text)', fontSize:13, fontWeight:500 }}>{user?.fullName || user?.username}</div>
                <div style={{ color:'var(--text-3)', fontSize:11, fontFamily:'var(--mono)' }}>{user?.email}</div>
              </div>
            </div>
          </div>
          <div style={{ padding:'6px 8px' }}>
            {[
              { icon:'⚙', label:'Settings',    action:()=>{ navigate('/settings'); setOpen(false) } },
              ...(isAdmin?[{ icon:'◈', label:'Admin Panel', action:()=>{ navigate('/admin'); setOpen(false) } }]:[]),
            ].map(item=>(
              <button key={item.label} onClick={item.action} style={{ width:'100%', background:'transparent', border:'none', borderRadius:6, color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:'7px 8px', fontSize:13, transition:'background 120ms, color 120ms', fontFamily:'var(--font)', textAlign:'left' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='var(--hover)'; e.currentTarget.style.color='var(--text)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-2)' }}>
                <span style={{ fontSize:13 }}>{item.icon}</span> {item.label}
              </button>
            ))}
            <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0' }} />
            <button onClick={()=>{ logout(); setOpen(false) }} style={{ width:'100%', background:'transparent', border:'none', borderRadius:6, color:'var(--text-3)', cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:'7px 8px', fontSize:13, transition:'background 120ms, color 120ms', fontFamily:'var(--font)' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='var(--red-dim)'; e.currentTarget.style.color='var(--red)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-3)' }}>
              <span>↩</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children, title }) {
  const { user, isAdmin, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const triggerPalette = () => window.dispatchEvent(new KeyboardEvent('keydown', { key:'k', ctrlKey:true, bubbles:true }))

  return (
    <div className="app-layout">

      
      <div className={`topnav-wrap${scrolled ? ' scrolled' : ''}`}>
        <nav className="topnav">

          
          <NavLink to="/dashboard" className="topnav-logo">
            <div className="topnav-logo-mark">
              <img src="/logo.png" alt="InventOS" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:7 }} />
            </div>
            <span className="topnav-logo-text">InventOS</span>
          </NavLink>

          
          <div className="topnav-links">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </div>

          
          <div className="topnav-right">
            
            <button onClick={triggerPalette} style={{
              display:'flex', alignItems:'center', gap:5, background:'var(--raised)',
              border:'1px solid var(--border-md)', borderRadius:7, padding:'4px 9px',
              cursor:'pointer', fontSize:11, color:'var(--text-3)', fontFamily:'var(--font)',
              transition:'all 140ms',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--border-hi)'; e.currentTarget.style.color='var(--text-2)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-md)'; e.currentTarget.style.color='var(--text-3)' }}>
              <span style={{ fontSize:12 }}>⌕</span>
              <span>Search</span>
              <kbd style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:3, fontSize:9, padding:'1px 4px', fontFamily:'var(--mono)', color:'var(--text-3)' }}>⌘K</kbd>
            </button>

            <span style={{ color:'var(--text-3)', fontSize:10.5, fontFamily:'var(--mono)' }}>
              {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            </span>
            <UserMenu user={user} isAdmin={isAdmin} logout={logout} />
          </div>
        </nav>
      </div>

      <main className="page-content">{children}</main>
      <ChatWidget />
    </div>
  )
}
