import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getMessages, sendMessage, subscribeMessages, fetchMessages,
  getDmMessages, sendDmMessage, subscribeDm, fetchDmMessages,
  getKnownUsers, registerKnownUser, getUnreadDmCount, markDmRead,
  getDmKey
} from '../../api/chatApi'
import { DEMO_MODE } from '../../api/axiosInstance'
import { mockSales } from '../../api/salesApi'

const ROLE_COLORS = {
  ADMIN:   { bg: '#7c3aed', label: 'Admin' },
  MANAGER: { bg: '#0ea5e9', label: 'Manager' },
  USER:    { bg: '#10b981', label: 'User' },
}

const DEMO_USERS = [
  { username:'admin',   role:'ADMIN',   fullName:'System Administrator', email:'admin@inventos.local',   joinedAt:'2023-01-15T09:00:00' },
  { username:'manager', role:'MANAGER', fullName:'Store Manager',        email:'manager@inventos.local', joinedAt:'2023-03-05T08:45:00' },
  { username:'john',    role:'USER',    fullName:'John Doe',              email:'john@example.com',       joinedAt:'2023-06-10T11:30:00' },
  { username:'sarah',   role:'USER',    fullName:'Sarah Smith',           email:'sarah@example.com',      joinedAt:'2023-08-22T14:00:00' },
]

// ─── User Profile Panel ──────────────────────────────────────────
function UserProfilePanel({ username, userPics, contacts, currentUser, onClose, onDm }) {
  const fmt     = (n)  => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n)
  const fmtDate = (ts) => { try { return new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) } catch { return '—' } }

  const info =
    contacts.find(c => c.username === username) ||
    (currentUser?.username === username ? currentUser : null) ||
    DEMO_USERS.find(u => u.username === username) ||
    { username, role: 'USER', fullName: username }

  const profilePic = userPics[username] || null
  const color      = ROLE_COLORS[info.role]?.bg || '#6b7280'
  const isSelf     = currentUser?.username === username

  const userSales   = DEMO_MODE ? mockSales.filter(s => s.soldBy === username) : []
  const totalRev    = userSales.reduce((s, x) => s + x.totalPrice, 0)
  const totalQty    = userSales.reduce((s, x) => s + x.quantity, 0)
  const recentSales = [...userSales].sort((a,b) => new Date(b.soldAt) - new Date(a.soldAt)).slice(0, 5)
  const msgCount    = getMessages().filter(m => m.from === username).length

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:20,
      background:'var(--surface)', display:'flex', flexDirection:'column',
      borderRadius:16, overflow:'hidden',
    }}>

      {/* Gradient header */}
      <div style={{
        background:`linear-gradient(145deg, ${color}28 0%, ${color}08 100%)`,
        borderBottom:'1px solid var(--border)',
        padding:'12px 14px 16px',
        flexShrink:0,
      }}>
        {/* Back row */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, padding:0, lineHeight:1, flexShrink:0 }}>←</button>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>User Profile</span>
          {isSelf && <span style={{ marginLeft:'auto', fontSize:10, background:'var(--accent-dim)', color:'var(--accent)', padding:'2px 7px', borderRadius:10, fontWeight:600 }}>You</span>}
        </div>

        {/* Avatar + name */}
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{
            width:60, height:60, borderRadius:'50%', flexShrink:0,
            background:color, overflow:'hidden',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:24, fontWeight:700, fontFamily:'var(--mono)',
            boxShadow:`0 0 0 3px var(--surface), 0 0 0 5px ${color}44`,
          }}>
            {profilePic
              ? <img src={profilePic} alt={username} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : username?.[0]?.toUpperCase()
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', lineHeight:1.2, marginBottom:2 }}>{info.fullName || username}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)', marginBottom:6 }}>@{username}</div>
            <span style={{ fontSize:10, background:color+'22', color, padding:'2px 9px', borderRadius:20, fontWeight:700 }}>
              {ROLE_COLORS[info.role]?.label || info.role}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:7 }}>
          {info.email && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:'var(--text-3)', width:18, textAlign:'center', flexShrink:0 }}>✉</span>
              <span style={{ fontSize:12, color:'var(--text-2)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {info.email}
              </span>
            </div>
          )}
          {info.joinedAt && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:'var(--text-3)', width:18, textAlign:'center', flexShrink:0 }}>📅</span>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>
                Member since <strong style={{ color:'var(--text)', fontWeight:600 }}>{fmtDate(info.joinedAt)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:'var(--border)', flexShrink:0 }}>
        {[
          { label:'Sales',    value: userSales.length || '—' },
          { label:'Revenue',  value: totalRev > 0 ? fmt(totalRev) : '—' },
          { label:'Messages', value: msgCount || '0' },
        ].map(stat => (
          <div key={stat.label} style={{ background:'var(--raised)', padding:'10px 6px', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)', lineHeight:1 }}>{stat.value}</div>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:14 }}>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
            Recent Sales
          </div>
          {recentSales.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-3)', padding:'16px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:22 }}>📭</span>
              No sales recorded yet
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {recentSales.map(s => (
                <div key={s.id} style={{ background:'var(--raised)', borderRadius:8, padding:'8px 10px', border:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.productName}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{s.customerName || 'Walk-in'} · {fmtDate(s.soldAt)}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)' }}>{fmt(s.totalPrice)}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)' }}>×{s.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {userSales.length > 0 && (
          <div style={{ background:'var(--accent-dim)', borderRadius:10, padding:'12px', border:'1px solid var(--accent-border)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Sales Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Total Revenue',   value: fmt(totalRev) },
                { label:'Units Sold',      value: totalQty },
                { label:'Avg Order',       value: fmt(totalRev / userSales.length) },
                { label:'Invoices',        value: [...new Set(userSales.map(s => s.invoiceNo))].length },
              ].map(item => (
                <div key={item.label} style={{ background:'var(--surface)', borderRadius:6, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isSelf && (
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--raised)', flexShrink:0 }}>
          <button onClick={() => onDm(username)} style={{
            width:'100%', padding:'9px 0', borderRadius:8,
            background:'var(--accent)', color:'#fff', border:'none',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)',
            transition:'opacity 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity='.85'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
          >
            💬 Send Direct Message
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────
function Avatar({ username, role, size = 28, profilePic, onClick }) {
  const color = ROLE_COLORS[role]?.bg || '#6b7280'
  return (
    <div
      onClick={onClick}
      title={onClick ? `View ${username}'s profile` : undefined}
      style={{
        width:size, height:size, borderRadius:'50%',
        background:color, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontSize:size*0.42, fontWeight:700, fontFamily:'var(--mono)',
        overflow:'hidden', border: profilePic ? `2px solid ${color}33` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition:'transform 120ms, box-shadow 120ms',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform='scale(1.12)'; e.currentTarget.style.boxShadow=`0 2px 8px ${color}55` } }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none' }}
    >
      {profilePic
        ? <img src={profilePic} alt={username} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : username?.[0]?.toUpperCase()
      }
    </div>
  )
}

// ─── Time formatter ──────────────────────────────────────────────
function formatTime(ts) {
  try {
    const d = new Date(ts)
    const isToday = d.toDateString() === new Date().toDateString()
    if (isToday) return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  } catch { return '' }
}

// ─── Message Bubbles ─────────────────────────────────────────────
function MessageBubbles({ messages, myUsername, userPics = {}, onAvatarClick }) {
  const grouped = messages.reduce((acc, msg) => {
    const last = acc[acc.length - 1]
    if (last && last.from === msg.from &&
        (new Date(msg.ts) - new Date(last.messages[last.messages.length - 1].ts)) < 60000) {
      last.messages.push(msg)
    } else {
      acc.push({ from: msg.from, role: msg.role, messages: [msg] })
    }
    return acc
  }, [])

  return grouped.map((group, gi) => {
    const mine = group.from === myUsername
    const roleColor = ROLE_COLORS[group.role]?.bg || '#6b7280'
    const profilePic = userPics[group.from] || null
    return (
      <div key={gi} style={{ display:'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems:'flex-end', gap:8 }}>
        <Avatar
          username={group.from} role={group.role} size={26} profilePic={profilePic}
          onClick={onAvatarClick ? () => onAvatarClick(group.from) : undefined}
        />
        <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', gap:3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
          <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', display:'flex', gap:5, alignItems:'center', flexDirection: mine ? 'row-reverse' : 'row' }}>
            <span style={{ fontWeight:600, color:roleColor }}>{group.from}</span>
            <span style={{ fontSize:9, background:roleColor+'22', color:roleColor, padding:'1px 5px', borderRadius:4, fontWeight:600 }}>
              {ROLE_COLORS[group.role]?.label || group.role}
            </span>
          </div>
          {group.messages.map((msg, mi) => (
            <div key={msg.id} style={{
              background: mine ? 'var(--accent)' : 'var(--raised)',
              color: mine ? '#fff' : 'var(--text)',
              borderRadius: mine
                ? (mi === 0 ? '14px 4px 14px 14px' : '14px 14px 4px 14px')
                : (mi === 0 ? '4px 14px 14px 14px' : '14px 14px 14px 4px'),
              padding:'8px 11px', fontSize:13, lineHeight:1.5,
              wordBreak:'break-word', border: mine ? 'none' : '1px solid var(--border)',
            }}>
              {msg.text}
              <div style={{ fontSize:9, marginTop:3, opacity:0.6, textAlign: mine ? 'right' : 'left', fontFamily:'var(--mono)' }}>
                {formatTime(msg.ts)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  })
}

// ─── Chat Input ──────────────────────────────────────────────────
function ChatInput({ onSend, placeholder }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const handleSend = () => {
    const t = text.trim(); if (!t) return
    onSend(t); setText(''); inputRef.current?.focus()
  }
  return (
    <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', background:'var(--raised)', flexShrink:0 }}>
      <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--surface)', border:'1px solid var(--border-md)', borderRadius:12, padding:'6px 8px' }}>
        <textarea
          ref={inputRef} value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={placeholder || 'Type a message…'} rows={1}
          style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent', color:'var(--text)', fontSize:13, fontFamily:'var(--font)', lineHeight:1.5, maxHeight:80, overflow:'auto' }}
        />
        <button onClick={handleSend} disabled={!text.trim()} style={{
          width:30, height:30, borderRadius:'50%',
          background: text.trim() ? 'var(--accent)' : 'var(--border)',
          border:'none', cursor: text.trim() ? 'pointer' : 'default',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, transition:'background 120ms', flexShrink:0,
        }}>➤</button>
      </div>
      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:5, textAlign:'center' }}>
        Enter to send · Shift+Enter for new line
      </div>
    </div>
  )
}

// ─── Main ChatWidget ─────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth()
  const [open,          setOpen]          = useState(false)
  const [tab,           setTab]           = useState('group')
  const [dmTarget,      setDmTarget]      = useState(null)
  const [profileTarget, setProfileTarget] = useState(null)
  const [groupMsgs,     setGroupMsgs]     = useState(() => getMessages())
  const [dmMsgs,        setDmMsgs]        = useState([])
  const [contacts,      setContacts]      = useState([])
  const [unread,        setUnread]        = useState(0)
  const [dmUnreads,     setDmUnreads]     = useState({})
  const bottomRef    = useRef(null)
  const prevCountRef = useRef(groupMsgs.length)

  useEffect(() => { if (user) registerKnownUser(user) }, [user])

  const refreshContacts = useCallback(() => {
    const known = DEMO_MODE ? DEMO_USERS : getKnownUsers()
    setContacts(known.filter(u => u.username !== user?.username))
  }, [user])
  useEffect(() => { refreshContacts() }, [refreshContacts])

  // Group chat
  useEffect(() => {
    const unsub   = subscribeMessages(msgs => setGroupMsgs([...msgs]))
    const onStore = () => setGroupMsgs([...getMessages()])
    window.addEventListener('inv_chat_update', onStore)
    window.addEventListener('storage', onStore)
    fetchMessages().then(msgs => setGroupMsgs([...msgs]))
    const iv = !DEMO_MODE ? setInterval(() => fetchMessages().then(msgs => setGroupMsgs([...msgs])), 5000) : null
    return () => { unsub(); window.removeEventListener('inv_chat_update', onStore); window.removeEventListener('storage', onStore); if (iv) clearInterval(iv) }
  }, [])

  // DM subscription — fresh when dmTarget changes
  useEffect(() => {
    if (!dmTarget || !user) { setDmMsgs([]); return }
    const load = () => {
      if (DEMO_MODE) {
        setDmMsgs([...getDmMessages(user.username, dmTarget)])
      } else {
        fetchDmMessages(user.username, dmTarget).then(msgs => setDmMsgs([...msgs]))
      }
    }
    load()
    const key      = getDmKey(user.username, dmTarget)
    const unsub    = subscribeDm(user.username, dmTarget, msgs => setDmMsgs([...msgs]))
    const onDmEv   = e => { if (e.detail?.key === key) load() }
    const onStore  = () => load()
    window.addEventListener('inv_dm_update', onDmEv)
    window.addEventListener('storage', onStore)
    const iv = !DEMO_MODE ? setInterval(load, 3000) : null
    return () => {
      unsub()
      window.removeEventListener('inv_dm_update', onDmEv)
      window.removeEventListener('storage', onStore)
      if (iv) clearInterval(iv)
    }
  }, [dmTarget, user])

  // Group unread
  useEffect(() => {
    if (!open || tab !== 'group') {
      const prev = prevCountRef.current
      if (groupMsgs.length > prev) setUnread(u => u + (groupMsgs.length - prev))
    } else { setUnread(0) }
    prevCountRef.current = groupMsgs.length
  }, [groupMsgs, open, tab])

  // DM unreads
  useEffect(() => {
    if (!user) return
    const counts = {}
    contacts.forEach(c => { counts[c.username] = getUnreadDmCount(user.username, c.username) })
    setDmUnreads(counts)
  }, [contacts, user, dmMsgs, groupMsgs])

  // Scroll to bottom
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 80)
  }, [groupMsgs, dmMsgs, open, tab, dmTarget])

  // Mark read
  useEffect(() => {
    if (open && tab === 'dm' && dmTarget && user) {
      markDmRead(user.username, dmTarget)
      setDmUnreads(prev => ({ ...prev, [dmTarget]: 0 }))
    }
  }, [open, tab, dmTarget, user])

  const totalUnread = unread + Object.values(dmUnreads).reduce((s, n) => s + n, 0)

  const handleGroupSend = (text) => { if (!user) return; sendMessage({ from: user.username, role: user.role, text }) }
  const handleDmSend    = (text) => { if (!user || !dmTarget) return; sendDmMessage({ from: user.username, to: dmTarget, role: user.role, text }) }

  const openDm = (username) => {
    setDmTarget(username)
    setTab('dm')
    if (user) markDmRead(user.username, username)
    setDmUnreads(prev => ({ ...prev, [username]: 0 }))
  }

  const openProfile       = (username) => setProfileTarget(username)
  const closeProfile      = () => setProfileTarget(null)
  const openDmFromProfile = (username) => { closeProfile(); openDm(username) }

  const currentContact = contacts.find(c => c.username === dmTarget)

  const userPics = {
    ...(user?.profilePic ? { [user.username]: user.profilePic } : {}),
    ...Object.fromEntries(contacts.filter(c => c.profilePic).map(c => [c.username, c.profilePic])),
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)} title="Chat"
        style={{
          position:'fixed', bottom:24, right:24, zIndex:400,
          width:50, height:50, borderRadius:'50%',
          background:'var(--accent)', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(0,201,177,.4)',
          transition:'transform 120ms, box-shadow 120ms', fontSize:20,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(0,201,177,.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,201,177,.4)' }}
      >
        {open ? '✕' : '💬'}
        {!open && totalUnread > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', borderRadius:'50%', fontSize:10, fontWeight:700, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid var(--surface)' }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:'fixed', bottom:84, right:24, zIndex:399,
          width:380, maxWidth:'calc(100vw - 48px)',
          height:540, maxHeight:'calc(100vh - 120px)',
          background:'var(--surface)', border:'1px solid var(--border-md)',
          borderRadius:16, boxShadow:'0 16px 48px rgba(0,0,0,.25)',
          display:'flex', flexDirection:'column',
          animation:'slideUp 180ms ease',
          overflow:'hidden',
        }}>

          {/* Profile overlay — absolutely positioned within this container */}
          {profileTarget && (
            <UserProfilePanel
              username={profileTarget}
              userPics={userPics}
              contacts={contacts}
              currentUser={user}
              onClose={closeProfile}
              onDm={openDmFromProfile}
            />
          )}

          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--raised)', flexShrink:0 }}>
            <button onClick={() => setTab('group')} style={{
              flex:1, padding:'12px 0', background:'none', border:'none', cursor:'pointer',
              fontSize:12, fontWeight:600, fontFamily:'var(--font)',
              color: tab==='group' ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: tab==='group' ? '2px solid var(--accent)' : '2px solid transparent',
              transition:'color 120ms',
            }}>
              💬 Group Chat
              {unread > 0 && <span style={{ marginLeft:6, background:'#ef4444', color:'#fff', borderRadius:10, fontSize:9, padding:'1px 5px', fontWeight:700 }}>{unread}</span>}
            </button>
            <button onClick={() => setTab('contacts')} style={{
              flex:1, padding:'12px 0', background:'none', border:'none', cursor:'pointer',
              fontSize:12, fontWeight:600, fontFamily:'var(--font)',
              color: (tab==='contacts'||tab==='dm') ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: (tab==='contacts'||tab==='dm') ? '2px solid var(--accent)' : '2px solid transparent',
              transition:'color 120ms',
            }}>
              🔒 Private
              {Object.values(dmUnreads).reduce((s,n)=>s+n,0) > 0 && (
                <span style={{ marginLeft:6, background:'#ef4444', color:'#fff', borderRadius:10, fontSize:9, padding:'1px 5px', fontWeight:700 }}>
                  {Object.values(dmUnreads).reduce((s,n)=>s+n,0)}
                </span>
              )}
            </button>
          </div>

          {/* Group Chat */}
          {tab === 'group' && <>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--raised)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>Team Chat</div>
              <span style={{ background:'var(--green-dim)', color:'var(--green)', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10 }}>● Live</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
              {groupMsgs.length === 0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'var(--text-3)', fontSize:13 }}>
                  <span style={{ fontSize:32 }}>💬</span><div>No messages yet</div>
                </div>
              )}
              <MessageBubbles messages={groupMsgs} myUsername={user?.username} userPics={userPics} onAvatarClick={openProfile} />
              <div ref={bottomRef} />
            </div>
            <ChatInput onSend={handleGroupSend} placeholder="Message the team…" />
          </>}

          {/* Contacts list */}
          {tab === 'contacts' && (
            <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
              <div style={{ padding:'8px 10px', fontSize:11, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Direct Messages</div>
              {contacts.length === 0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>No other users found</div>}
              {contacts.map(c => {
                const dmCount   = dmUnreads[c.username] || 0
                const msgs      = getDmMessages(user?.username, c.username)
                const lastMsg   = msgs[msgs.length - 1] || null
                const roleColor = ROLE_COLORS[c.role]?.bg || '#6b7280'
                return (
                  <div key={c.username}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px', borderRadius:10, cursor:'pointer', transition:'background 120ms', background: dmCount > 0 ? 'var(--accent-dim)' : 'transparent' }}
                    onClick={() => openDm(c.username)}
                    onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = dmCount > 0 ? 'var(--accent-dim)' : 'transparent'}
                  >
                    <Avatar username={c.username} role={c.role} size={36} profilePic={c.profilePic || null}
                      onClick={e => { e.stopPropagation(); openProfile(c.username) }}
                    />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{c.fullName || c.username}</span>
                        {lastMsg && <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{formatTime(lastMsg.ts)}</span>}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:11, color:roleColor, fontWeight:500 }}>{ROLE_COLORS[c.role]?.label || c.role}</span>
                        {dmCount > 0 && <span style={{ background:'var(--accent)', color:'#fff', borderRadius:10, fontSize:9, padding:'2px 6px', fontWeight:700 }}>{dmCount}</span>}
                      </div>
                      {lastMsg && (
                        <div style={{ fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>
                          {lastMsg.from === user?.username ? 'You: ' : ''}{lastMsg.text}
                        </div>
                      )}
                    </div>
                    <span style={{ color:'var(--text-3)', fontSize:16 }}>›</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* DM Conversation */}
          {tab === 'dm' && dmTarget && <>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--raised)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <button onClick={() => setTab('contacts')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, padding:0, lineHeight:1 }}>←</button>
              <Avatar username={dmTarget} role={currentContact?.role} size={28} profilePic={currentContact?.profilePic || null} onClick={() => openProfile(dmTarget)} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{currentContact?.fullName || dmTarget}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)' }}>Private · End-to-end</div>
              </div>
              <span style={{ background:'var(--green-dim)', color:'var(--green)', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10 }}>🔒</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
              {dmMsgs.length === 0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'var(--text-3)', fontSize:13 }}>
                  <span style={{ fontSize:32 }}>🔒</span>
                  <div>Private conversation</div>
                  <div style={{ fontSize:11, textAlign:'center' }}>Messages visible only to you and {dmTarget}</div>
                </div>
              )}
              <MessageBubbles messages={dmMsgs} myUsername={user?.username} userPics={userPics} onAvatarClick={openProfile} />
              <div ref={bottomRef} />
            </div>
            <ChatInput onSend={handleDmSend} placeholder={`Message ${dmTarget}…`} />
          </>}

        </div>
      )}
    </>
  )
}
