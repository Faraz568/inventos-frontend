import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
      <span style={{ color:'var(--muted)', fontFamily:'var(--mono)', fontSize:12 }}>Verifying session…</span>
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
