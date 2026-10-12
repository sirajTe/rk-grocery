// FastAPI backend (see backend/). Empty base = same origin (Vite proxies /api in dev).
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

let token = null
let onUnauthorized = () => {}
export const setToken = (t) => { token = t }
export const setOnUnauthorized = (f) => { onUnauthorized = f }

const message = (detail, status) => {
  if (!detail) return `Request failed (${status})`
  if (typeof detail === 'string') return detail
  if (detail.message) return detail.message
  if (Array.isArray(detail)) return detail.map((d) => d.msg?.replace(/^Value error, /, '')).filter(Boolean).join('; ')
  return JSON.stringify(detail)
}

export class ApiError extends Error {
  constructor(status, detail) { super(message(detail, status)); this.status = status; this.detail = detail }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(API_BASE + path, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) })
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your internet connection and try again.')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data?.detail)
  }
  return data
}

export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()
  return s ? `?${s}` : ''
}
