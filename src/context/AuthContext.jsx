import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../api/axiosInstance'
import * as authApi from '../api/authApi'

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
      const pic = storage.getPic(u.id)
      setToken(t)
      setUser({ ...u, profilePic: pic || u.profilePic || null })
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (creds) => {
    const { accessToken, user: u } = await authApi.login(creds)
    const pic = storage.getPic(u.id)
    const userWithPic = { ...u, profilePic: pic || null }
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

  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields }
      storage.setUser(updated)
      if (fields.profilePic !== undefined && prev?.id) {
        if (fields.profilePic) {
          storage.setPic(prev.id, fields.profilePic)
        } else {
          storage.removePic(prev.id)
        }
      }
      return updated
    })
  }

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
