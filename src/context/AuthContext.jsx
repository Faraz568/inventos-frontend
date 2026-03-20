import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../api/axiosInstance'
import * as authApi from '../api/authApi'
import api from '../api/axiosInstance'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const t = storage.getToken()
    const u = storage.getUser()
    if (t && u) {
      setToken(t)
      setUser(u)
      // refresh user from backend to get latest profilePic
      api.get('/users/me').then(res => {
        const fresh = res.data?.data
        if (fresh) {
          const merged = { ...u, ...fresh, profilePic: fresh.profilePic || u.profilePic || null }
          setUser(merged)
          storage.setUser(merged)
        }
      }).catch(() => {})
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (creds) => {
    const { accessToken, user: u } = await authApi.login(creds)
    // profilePic comes from backend in the user object
    const userWithPic = { ...u, profilePic: u.profilePic || null }
    storage.setToken(accessToken)
    storage.setUser(userWithPic)
    setToken(accessToken)
    setUser(userWithPic)
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const register = useCallback(async (payload) => {
    const { accessToken, user: u } = await authApi.register(payload)
    storage.setToken(accessToken)
    storage.setUser(u)
    setToken(accessToken)
    setUser(u)
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const logout = useCallback(async () => {
    await authApi.logout()
    storage.clear()
    setUser(null)
    setToken(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const updateUser = useCallback((fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields }
      storage.setUser(updated)
      // sync profilePic to backend so other devices see it
      if (fields.profilePic !== undefined) {
        api.put('/users/me/profile-pic', { profilePic: fields.profilePic || null }).catch(() => {})
      }
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated: Boolean(token && user),
      isAdmin:   user?.role === 'ADMIN',
      isManager: user?.role === 'MANAGER',
      canEdit:   user?.role === 'ADMIN' || user?.role === 'MANAGER',
      login, register, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
