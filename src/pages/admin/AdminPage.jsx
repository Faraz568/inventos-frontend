import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { DEMO_MODE } from '../../api/axiosInstance'
import api from '../../api/axiosInstance'

const MOCK_USERS = [
  { id:1, username:'admin',   fullName:'System Administrator', email:'admin@inventos.local',   role:'ADMIN',   isActive:true,  createdAt:'2024-01-01T00:00:00' },
  { id:2, username:'john',    fullName:'John Doe',             email:'john@example.com',        role:'USER',    isActive:true,  createdAt:'2024-02-15T10:30:00' },
  { id:3, username:'sarah',   fullName:'Sarah Smith',          email:'sarah@example.com',       role:'USER',    isActive:true,  createdAt:'2024-03-10T09:15:00' },
  { id:4, username:'manager', fullName:'Store Manager',        email:'manager@inventos.local',  role:'MANAGER', isActive:true,  createdAt:'2024-01-20T08:00:00' },
  { id:5, username:'bob',     fullName:'Bob Wilson',           email:'bob@example.com',         role:'USER',    isActive:false, createdAt:'2024-04-05T14:00:00' },
]

const MOCK_STATS = { totalUsers:5, activeUsers:4, totalProducts:10, outOfStock:1, lowStock:2, monthlySales:34 }

function RoleBadge({ role }) {
  const cls = role === 'ADMIN' ? 'badge-admin' : role === 'MANAGER' ? 'badge-manager' : 'badge-user'
  return <span className={`badge ${cls}`}>{role}</span>
}

function StatusBadge({ active }) {
  return <span className={`badge ${active ? 'badge-ok' : 'badge-out'}`}>{active ? 'Active' : 'Inactive'}</span>
}

function UserActions({ u, onAction }) {
  return (
    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
      {u.isActive
        ? <button className="btn btn-ghost btn-sm" style={{ color:'var(--amber)', borderColor:'rgba(245,158,11,.3)', fontSize:11 }} onClick={() => onAction(u,'deactivate')}>Deactivate</button>
        : <button className="btn btn-ghost btn-sm" style={{ color:'var(--green)', borderColor:'rgba(52,199,138,.3)', fontSize:11 }}  onClick={() => onAction(u,'activate')}>Activate</button>
      }
      {u.role === 'USER' && (<>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--green)', borderColor:'rgba(52,199,138,.3)', fontSize:11 }} onClick={() => onAction(u,'promoteManager')}>→ Manager</button>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent)', borderColor:'var(--accent-border)', fontSize:11 }} onClick={() => onAction(u,'promoteAdmin')}>→ Admin</button>
      </>)}
      {u.role === 'MANAGER' && (<>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent)', borderColor:'var(--accent-border)', fontSize:11 }} onClick={() => onAction(u,'promoteAdmin')}>→ Admin</button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => onAction(u,'demote')}>→ User</button>
      </>)}
      {u.role === 'ADMIN' && (
        <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => onAction(u,'demote')}>→ User</button>
      )}
      <button className="btn-icon danger" onClick={() => onAction(u,'delete')}>✕</button>
    </div>
  )
}

export default function AdminPage() {
  const toast = useToast()
  const [stats,        setStats]        = useState(null)
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [actionTarget, setActionTarget] = useState(null)
  const [acting,       setActing]       = useState(false)
  const [view,         setView]         = useState('table') // 'table' | 'cards'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 400))
        setStats(MOCK_STATS)
        setUsers([...MOCK_USERS])
      } else {
        const [sr, ur] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/users')])
        setStats(sr.data.data); setUsers(ur.data.data ?? [])
      }
    } catch (err) { toast.error(err.response?.data?.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const onAction = (user, action) => setActionTarget({ user, action })

  const execAction = async () => {
    if (!actionTarget) return
    const { user, action } = actionTarget
    setActing(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 400))
        setUsers(prev => {
          if (action === 'delete')          return prev.filter(u => u.id !== user.id)
          if (action === 'activate')        return prev.map(u => u.id === user.id ? { ...u, isActive: true  } : u)
          if (action === 'deactivate')      return prev.map(u => u.id === user.id ? { ...u, isActive: false } : u)
          if (action === 'promoteAdmin')    return prev.map(u => u.id === user.id ? { ...u, role: 'ADMIN'   } : u)
          if (action === 'promoteManager')  return prev.map(u => u.id === user.id ? { ...u, role: 'MANAGER' } : u)
          if (action === 'demote')          return prev.map(u => u.id === user.id ? { ...u, role: 'USER'    } : u)
          return prev
        })
      } else {
        if (action === 'activate')       await api.patch(`/admin/users/${user.id}/activate`)
        if (action === 'deactivate')     await api.patch(`/admin/users/${user.id}/deactivate`)
        if (action === 'delete')         await api.delete(`/admin/users/${user.id}`)
        if (action === 'promoteAdmin')   await api.patch(`/admin/users/${user.id}/role`, null, { params:{ role:'ADMIN'   } })
        if (action === 'promoteManager') await api.patch(`/admin/users/${user.id}/role`, null, { params:{ role:'MANAGER' } })
        if (action === 'demote')         await api.patch(`/admin/users/${user.id}/role`, null, { params:{ role:'USER'    } })
        load()
      }
      toast.success(`User "${user.username}" ${action}d.`)
      setActionTarget(null)
    } catch (err) { toast.error(err.response?.data?.message ?? 'Action failed') }
    finally { setActing(false) }
  }

  const fmt = n => (typeof n === 'number' ? n.toLocaleString() : '—')

  return (
    <AppLayout title="Admin Panel">
      <div className="page-header">
        <div className="page-title">Admin Panel</div>
        <div className="page-sub">System overview and user management{DEMO_MODE ? ' · Demo Mode' : ''}</div>
      </div>

      <div className="stats-grid">
        {[
          { cls:'blue',  label:'Total Users',    value: fmt(stats?.totalUsers),    sub:`${fmt(stats?.activeUsers)} active` },
          { cls:'teal',  label:'Total Products', value: fmt(stats?.totalProducts), sub:`${fmt(stats?.outOfStock)} out of stock` },
          { cls:'amber', label:'Low Stock',      value: fmt(stats?.lowStock),      sub:'Below reorder level' },
          { cls:'red',   label:'Monthly Sales',  value: fmt(stats?.monthlySales),  sub:'Transactions this month' },
        ].map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            {loading ? <div style={{ height:60, background:'var(--raised)', borderRadius:6, opacity:.5 }} />
              : <><div className="stat-label">{c.label}</div><div className="stat-value">{c.value}</div><div className="stat-sub">{c.sub}</div></>
            }
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {/* Header */}
        <div style={{ alignItems:'center', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, padding:'14px 18px' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-2)', letterSpacing:'.1em', textTransform:'uppercase' }}>
            User Accounts ({users.length})
          </span>
          <div style={{ display:'flex', gap:6 }}>
            {/* view toggle */}
            <div style={{ display:'flex', border:'1px solid var(--border-md)', borderRadius:6, overflow:'hidden' }}>
              <button onClick={() => setView('table')} style={{ padding:'4px 10px', fontSize:11, border:'none', cursor:'pointer', fontFamily:'var(--font)', background: view==='table' ? 'var(--accent)' : 'transparent', color: view==='table' ? '#fff' : 'var(--text-3)', transition:'all 140ms' }}>Table</button>
              <button onClick={() => setView('cards')} style={{ padding:'4px 10px', fontSize:11, border:'none', cursor:'pointer', fontFamily:'var(--font)', background: view==='cards' ? 'var(--accent)' : 'transparent', color: view==='cards' ? '#fff' : 'var(--text-3)', transition:'all 140ms' }}>Cards</button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:22, height:22 }} /></div>
        ) : view === 'table' ? (
          /* ── Desktop Table View ── */
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <table className="data-table" style={{ minWidth:700 }}>
              <thead>
                <tr>
                  <th style={{ width:40 }}>ID</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th style={{ width:90 }}>Role</th>
                  <th style={{ width:80 }}>Status</th>
                  <th style={{ width:90 }}>Joined</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="mono muted" style={{ fontSize:11 }}>{u.id}</td>
                    <td style={{ fontWeight:500, fontFamily:'var(--mono)', fontSize:13 }}>{u.username}</td>
                    <td>{u.fullName}</td>
                    <td style={{ color:'var(--text-2)', fontSize:12 }}>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusBadge active={u.isActive} /></td>
                    <td className="mono muted" style={{ fontSize:11 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td><div style={{ display:'flex', gap:5, justifyContent:'flex-end', flexWrap:'wrap' }}><UserActions u={u} onAction={onAction} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Card View (mobile-friendly) ── */
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {users.map((u, i) => (
              <div key={u.id} style={{ padding:'14px 16px', borderBottom: i < users.length-1 ? '1px solid var(--border)' : 'none' }}>
                {/* Row 1: identity */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:13, color:'var(--text)' }}>{u.username}</span>
                      <RoleBadge role={u.role} />
                      <StatusBadge active={u.isActive} />
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:2 }}>{u.fullName}</div>
                    <div style={{ fontSize:11.5, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', flexShrink:0, marginTop:2 }}>
                    #{u.id} · {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                {/* Row 2: actions */}
                <UserActions u={u} onAction={onAction} />
              </div>
            ))}
          </div>
        )}
      </div>

      {actionTarget && (
        <ConfirmDialog
          title={`${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} User`}
          message={<>Are you sure you want to <strong style={{ color:'var(--text)' }}>{actionTarget.action}</strong> user <strong style={{ color:'var(--text)' }}>"{actionTarget.user.username}"</strong>?{actionTarget.action === 'delete' && <span style={{ display:'block', marginTop:8, color:'var(--red)', fontSize:12 }}>⚠ This permanently removes the account.</span>}</>}
          onConfirm={execAction} onCancel={() => setActionTarget(null)}
          danger={actionTarget.action === 'delete' || actionTarget.action === 'deactivate'}
          loading={acting}
        />
      )}
    </AppLayout>
  )
}
