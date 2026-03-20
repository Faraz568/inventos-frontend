import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth }   from './context/AuthContext'
import { ToastProvider }           from './context/ToastContext'
import ProtectedRoute              from './components/layout/ProtectedRoute'
import HomePage                    from './pages/HomePage'
import LoginPage                   from './pages/auth/LoginPage'
import RegisterPage                from './pages/auth/RegisterPage'
import DashboardPage               from './pages/dashboard/DashboardPage'
import ProductsPage                from './pages/products/ProductsPage'
import PurchasesPage               from './pages/purchases/PurchasesPage'
import ReportsPage                 from './pages/reports/ReportsPage'
import DatabasePage                from './pages/database/DatabasePage'
import AdminPage                   from './pages/admin/AdminPage'
import CategoriesPage              from './pages/categories/CategoriesPage'
import { NotFoundPage }            from './pages/Placeholders'
import SettingsPage                from './pages/settings/SettingsPage'
import SalesInvoicePage            from './pages/sales/SalesInvoicePage'
import StockLedgerPage             from './pages/stock/StockLedgerPage'
import StockBalancePage            from './pages/stock/StockBalancePage'
import CommandPalette              from './components/ui/CommandPalette'
import { getProducts }             from './api/productApi'

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AuthShell() {
  const [screen, setScreen] = useState('login')
  return screen === 'login'
    ? <LoginPage    goRegister={() => setScreen('register')} />
    : <RegisterPage goLogin={()    => setScreen('login')}    />
}

function AppWithPalette({ children }) {
  const { isAuthenticated } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!isAuthenticated) return
    getProducts({ size: 200 }).then(r => setProducts(r?.content ?? [])).catch(() => {})
  }, [isAuthenticated])

  const handleKey = useCallback(e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (isAuthenticated) setOpen(o => !o)
    }
  }, [isAuthenticated])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <>
      {children}
      {open && <CommandPalette products={products} onClose={() => setOpen(false)} />}
    </>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"             element={<HomePage />} />
      <Route path="/login"        element={<PublicOnly><AuthShell /></PublicOnly>} />
      <Route path="/register"     element={<PublicOnly><AuthShell /></PublicOnly>} />

      <Route path="/home"         element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/products"     element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/purchases"    element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
      <Route path="/sales"        element={<ProtectedRoute><SalesInvoicePage /></ProtectedRoute>} />
      <Route path="/reports"      element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/database"     element={<ProtectedRoute><DatabasePage /></ProtectedRoute>} />
      <Route path="/categories"   element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
      <Route path="/settings"     element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin"        element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      <Route path="/stock/ledger" element={<ProtectedRoute><StockLedgerPage /></ProtectedRoute>} />
      <Route path="/stock/balance"element={<ProtectedRoute><StockBalancePage /></ProtectedRoute>} />

      <Route path="*"             element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppWithPalette>
          <AppRoutes />
        </AppWithPalette>
      </ToastProvider>
    </AuthProvider>
  )
}
