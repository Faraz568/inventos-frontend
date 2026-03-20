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

export default function AdminPage() {
  const toast = useToast()
  const [stats,        setStats]        = useState(null)
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [actionTarget, setActionTarget] = useState(null)
  const [acting,       setActing]       = useState(false)

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

  const execAction = async () => {
    if (!actionTarget) return
    const { user, action } = actionTarget
    setActing(true)
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 400))
        setUsers(prev => {
          if (action === 'delete')     return prev.filter(u => u.id !== user.id)
          if (action === 'activate')   return prev.map(u => u.id === user.id ? { ...u, isActive: true  } : u)
          if (action === 'deactivate') return prev.map(u => u.id === user.id ? { ...u, isActive: false } : u)
          if (action === 'promoteAdmin')   return prev.map(u => u.id === user.id ? { ...u, role: 'ADMIN'   } : u)
          if (action === 'promoteManager') return prev.map(u => u.id === user.id ? { ...u, role: 'MANAGER' } : u)
          if (action === 'demote')     return prev.map(u => u.id === user.id ? { ...u, role: 'USER'    } : u)
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
        <div style={{ alignItems:'center', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, padding:'14px 18px' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-2)', letterSpacing:'.1em', textTransform:'uppercase' }}>
            User Accounts ({users.length})
          </span>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
        {loading
          ? <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:22, height:22 }} /></div>
          : <table className="data-table">
              <thead>
                <tr><th className="hide-mobile">ID</th><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th className="hide-mobile">Status</th><th className="hide-mobile">Created</th><th style={{ textAlign:'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="mono muted">{u.id}</td>
                    <td style={{ fontWeight:500, fontFamily:'var(--mono)', fontSize:13 }}>{u.username}</td>
                    <td>{u.fullName}</td>
                    <td style={{ color:'var(--text-2)', fontSize:12 }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : u.role === 'MANAGER' ? 'badge-manager' : 'badge-user'}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.isActive ? 'badge-ok' : 'badge-out'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="mono muted" style={{ fontSize:11 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        {u.isActive
                          ? <button className="btn btn-ghost btn-sm" style={{ color:'var(--amber)', borderColor:'rgba(245,158,11,.3)', fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'deactivate' })}>Deactivate</button>
                          : <button className="btn btn-ghost btn-sm" style={{ color:'var(--green)', borderColor:'rgba(52,199,138,.3)', fontSize:11 }}  onClick={() => setActionTarget({ user:u, action:'activate' })}>Activate</button>
                        }
                        {u.role === 'USER' && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--green)', borderColor:'rgba(52,199,138,.3)', fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'promoteManager' })}>→ Manager</button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent)', borderColor:'var(--accent-border)', fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'promoteAdmin'   })}>→ Admin</button>
                          </>
                        )}
                        {u.role === 'MANAGER' && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent)', borderColor:'var(--accent-border)', fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'promoteAdmin' })}>→ Admin</button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'demote' })}>→ User</button>
                          </>
                        )}
                        {u.role === 'ADMIN' && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => setActionTarget({ user:u, action:'demote' })}>→ User</button>
                        )}
                        <button className="btn-icon danger" onClick={() => setActionTarget({ user:u, action:'delete' })}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
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
