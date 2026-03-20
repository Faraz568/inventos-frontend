import api, { DEMO_MODE, storage } from './axiosInstance'

// ─── Storage keys ───────────────────────────────────────────────
const CHAT_KEY      = 'inv_chat_messages'        // group chat
const DM_KEY        = (a, b) => `inv_dm_${[a,b].sort().join('_')}` // private DMs
const USERS_KEY     = 'inv_known_users'
const LISTENERS     = new Set()
const DM_LISTENERS  = new Map()  // conversationKey → Set of fns

// ─── Helpers ────────────────────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function save(key, msgs) {
  localStorage.setItem(key, JSON.stringify(msgs))
}
function notify(msgs) {
  LISTENERS.forEach(fn => fn(msgs))
}
function notifyDm(key, msgs) {
  DM_LISTENERS.get(key)?.forEach(fn => fn(msgs))
}

// ─── Known users (for DM contact list) ─────────────────────────
export function registerKnownUser(user) {
  const users = getKnownUsers()
  const idx = users.findIndex(u => u.username === user.username)
  const entry = {
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email || null,
    profilePic: user.profilePic || null,
    joinedAt: user.joinedAt || (idx !== -1 ? users[idx].joinedAt : null) || new Date().toISOString(),
  }
  if (idx === -1) {
    users.push(entry)
  } else {
    users[idx] = { ...users[idx], ...entry }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}
export function getKnownUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') } catch { return [] }
}

export async function fetchKnownUsers() {
  if (DEMO_MODE) return getKnownUsers()
  try {
    const { data } = await api.get('/users')
    const users = (data.data || []).map(u => ({
      username:   u.username,
      fullName:   u.fullName,
      email:      u.email,
      role:       u.role,
      profilePic: u.profilePic || null,
      joinedAt:   u.createdAt || null,
    }))
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return users
  } catch { return getKnownUsers() }
}

// ─── Group Chat ─────────────────────────────────────────────────
export function subscribeMessages(fn) {
  LISTENERS.add(fn)
  return () => LISTENERS.delete(fn)
}
export function getMessages() { return load(CHAT_KEY) }

export async function fetchMessages() {
  if (DEMO_MODE) return load(CHAT_KEY)
  try {
    const { data } = await api.get('/chat')
    const msgs = (data.data || []).map(m => ({
      id:   m.id,
      from: m.senderUsername,
      role: m.senderRole,
      text: m.text,
      ts:   m.sentAt,
    }))
    save(CHAT_KEY, msgs)
    notify(msgs)
    return msgs
  } catch { return load(CHAT_KEY) }
}

export async function sendMessage({ from, role, text }) {
  if (DEMO_MODE) {
    const msgs = load(CHAT_KEY)
    const msg = { id: Date.now() + Math.random(), from, role, text, ts: new Date().toISOString() }
    msgs.push(msg)
    save(CHAT_KEY, msgs)
    notify(msgs)
    window.dispatchEvent(new Event('inv_chat_update'))
    return msg
  }
  const { data } = await api.post('/chat', { text })
  const msg = {
    id:   data.data.id,
    from: data.data.senderUsername,
    role: data.data.senderRole,
    text: data.data.text,
    ts:   data.data.sentAt,
  }
  const msgs = load(CHAT_KEY)
  msgs.push(msg)
  save(CHAT_KEY, msgs)
  notify(msgs)
  window.dispatchEvent(new Event('inv_chat_update'))
  return msg
}

export async function clearMessages() {
  if (!DEMO_MODE) { try { await api.delete('/chat') } catch {} }
  save(CHAT_KEY, [])
  notify([])
  window.dispatchEvent(new Event('inv_chat_update'))
}

// ─── Private / DM Chat ──────────────────────────────────────────
export function getDmKey(userA, userB) { return DM_KEY(userA, userB) }

export function subscribeDm(userA, userB, fn) {
  const key = DM_KEY(userA, userB)
  if (!DM_LISTENERS.has(key)) DM_LISTENERS.set(key, new Set())
  DM_LISTENERS.get(key).add(fn)
  return () => DM_LISTENERS.get(key)?.delete(fn)
}

export function getDmMessages(userA, userB) {
  return load(DM_KEY(userA, userB))
}

// Background refresh from backend - call this to sync across devices
export async function refreshDmMessages(userA, userB) {
  if (DEMO_MODE) return
  try {
    await fetchDmMessages(userA, userB)
  } catch {}
}

export async function fetchDmMessages(userA, userB) {
  if (DEMO_MODE) return load(DM_KEY(userA, userB))
  try {
    const { data } = await api.get(`/chat/dm/${userB}`)
    const msgs = (data.data || []).map(m => ({
      id:   m.id,
      from: m.senderUsername,
      to:   m.recipientUsername,
      role: m.senderRole,
      text: m.text,
      ts:   m.sentAt,
    }))
    const key = DM_KEY(userA, userB)
    save(key, msgs)        // cache locally for offline/speed
    notifyDm(key, msgs)
    return msgs
  } catch {
    return load(DM_KEY(userA, userB))  // fallback to cache if offline
  }
}

export async function sendDmMessage({ from, to, role, text }) {
  const key = DM_KEY(from, to)
  if (DEMO_MODE) {
    const msgs = load(key)
    const msg = { id: Date.now() + Math.random(), from, to, role, text, ts: new Date().toISOString() }
    msgs.push(msg)
    save(key, msgs)
    notifyDm(key, msgs)
    window.dispatchEvent(new CustomEvent('inv_dm_update', { detail: { key } }))
    return msg
  }
  const { data } = await api.post('/chat/dm', { recipientUsername: to, text })
  const msg = {
    id:   data.data.id,
    from: data.data.senderUsername,
    to:   data.data.recipientUsername,
    role: data.data.senderRole,
    text: data.data.text,
    ts:   data.data.sentAt,
  }
  // Optimistically add to local cache
  const msgs = load(key)
  msgs.push(msg)
  save(key, msgs)
  notifyDm(key, msgs)
  window.dispatchEvent(new CustomEvent('inv_dm_update', { detail: { key } }))
  // Then re-fetch from backend to ensure full sync
  fetchDmMessages(from, to).catch(() => {})
  return msg
}

export function getUnreadDmCount(myUsername, otherUsername) {
  const msgs = load(DM_KEY(myUsername, otherUsername))
  const lastRead = Number(localStorage.getItem(`inv_dm_read_${DM_KEY(myUsername, otherUsername)}`) || 0)
  return msgs.filter(m => m.from !== myUsername && new Date(m.ts).getTime() > lastRead).length
}

export function markDmRead(myUsername, otherUsername) {
  localStorage.setItem(`inv_dm_read_${DM_KEY(myUsername, otherUsername)}`, Date.now().toString())
}