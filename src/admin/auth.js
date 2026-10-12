import { useSyncExternalStore } from 'react'
import { api, setOnUnauthorized, setToken } from '../api'
import { refreshCatalog } from '../catalog'

// Login is checked by the backend (ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env),
// which returns a signed token that admin API calls send as a Bearer header.
const KEY = 'rk-admin-session'

const read = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s?.token && new Date(s.exp) > new Date() ? s : null
  } catch { return null }
}

let session = read()
setToken(session?.token ?? null)
const subs = new Set()
const set = (s) => {
  session = s
  setToken(s?.token ?? null)
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY) } catch {}
  subs.forEach((f) => f())
  refreshCatalog() // admins also see hidden products
}

export const useAdminSession = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => {
  if (session && new Date(session.exp) <= new Date()) set(null)
  return session
})

export async function login(email, password) {
  const r = await api('/api/admin/login', { method: 'POST', body: { email, password } })
  set({ email: r.email, token: r.access_token, exp: r.expires_at })
}

export const logout = () => set(null)

// Token expired or revoked → back to the login form
setOnUnauthorized(() => session && set(null))
