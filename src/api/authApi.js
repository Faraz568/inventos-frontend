import api, { DEMO_MODE } from './axiosInstance'

const DEMO_USERS = {
  admin:   { id:1, username:'admin',   fullName:'System Administrator', email:'admin@inventos.local',   role:'ADMIN',   joinedAt:'2023-01-15T09:00:00' },
  john:    { id:2, username:'john',    fullName:'John Doe',             email:'john@example.com',       role:'USER',    joinedAt:'2023-06-10T11:30:00' },
  sarah:   { id:3, username:'sarah',   fullName:'Sarah Smith',          email:'sarah@example.com',      role:'USER',    joinedAt:'2023-08-22T14:00:00' },
  manager: { id:4, username:'manager', fullName:'Store Manager',        email:'manager@inventos.local', role:'MANAGER', joinedAt:'2023-03-05T08:45:00' },
}

export const login = async (creds) => {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 600))
    if (!creds.username || !creds.password)
      throw { response: { data: { message: 'Username and password are required.' } } }
    const user = DEMO_USERS[creds.username.toLowerCase()] || {
      id: 99, username: creds.username,
      fullName: creds.username, email: `${creds.username}@demo.local`, role: 'USER',
      joinedAt: new Date().toISOString(),
    }
    return { accessToken: `demo-token-${Date.now()}`, expiresIn: 3600, user }
  }
  
  const { data } = await api.post('/auth/login', creds)
  return data.data
}

export const initiateLogin = async (username, password) => {
  const { data } = await api.post('/auth/initiate-login', { username, password })
  return data   
}

export const verifyLoginOtp = async (username, otp) => {
  const { data } = await api.post('/auth/verify-otp', { username, otp })
  return data.data  
}

export const register = async (payload) => {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 700))
    if (!payload.username || !payload.password)
      throw { response: { data: { message: 'All fields are required.' } } }
    return {
      accessToken: `demo-token-${Date.now()}`, expiresIn: 3600,
      user: { id: Math.floor(Math.random()*900)+100, username: payload.username, fullName: payload.fullName || payload.username, email: payload.email, role: 'USER', joinedAt: new Date().toISOString() },
    }
  }
  const { data } = await api.post('/auth/register', payload)
  return data.data
}

export const logout = async () => {
  if (DEMO_MODE) return
  try { await api.post('/auth/logout') } catch {}
}
