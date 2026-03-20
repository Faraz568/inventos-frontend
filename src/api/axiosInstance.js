import axios from 'axios'

const TOKEN_KEY = 'inv_jwt'
const USER_KEY  = 'inv_user'

const picKey = (id) => `inv_pic_${id}`

export const storage = {
  getToken:  ()  => localStorage.getItem(TOKEN_KEY),
  setToken:  (t) => localStorage.setItem(TOKEN_KEY, t),
  getUser:   ()  => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } },
  setUser:   (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear:     ()  => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) },
  getPic:    (id) => { try { return localStorage.getItem(picKey(id)) } catch { return null } },
  setPic:    (id, data) => { try { localStorage.setItem(picKey(id), data) } catch {} },
  removePic: (id) => { try { localStorage.removeItem(picKey(id)) } catch {} },
}

export const DEMO_MODE = false

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(cfg => {
  const token = storage.getToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (!DEMO_MODE && err.response?.status === 401) {
      storage.clear()
      window.location.replace('/login')
    }
    return Promise.reject(err)
  }
)

export default api
