import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { isVisible, useProducts } from './catalog'

export const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export function useHashRoute() {
  // Hash routes (#/p/x) win; otherwise a clean path like /admin/all-orders is used as the route
  const read = () => window.location.hash.replace(/^#/, '') || window.location.pathname.replace(/\/$/, '') || '/'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
export const go = (path) => { window.location.hash = path }

// Anonymous server cart, identified by a UUID kept in this browser
const uuid = () => crypto.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0
  return (c === 'x' ? r : (r & 3) | 8).toString(16)
})
export const cartId = () => {
  let id = load('rk-cart-id', null)
  if (!id) { id = uuid(); save('rk-cart-id', id) }
  return id
}
const syncLine = (id, qty) => api(`/api/cart/${cartId()}/items/${encodeURIComponent(id)}`, { method: 'PUT', body: { qty } }).catch(() => {})

// POST /api/orders — the server re-prices items from the catalogue and checks stock
export const placeOrder = (order) => api('/api/orders', { method: 'POST', body: { cart_id: cartId(), ...order } })

export function useCartState() {
  const [items, setItems] = useState(() => load('rk-cart-v2', {}))
  const [open, setOpen] = useState(false)
  const products = useProducts({ all: true })
  useEffect(() => save('rk-cart-v2', items), [items])

  // The cart UI updates instantly from local state; every change is mirrored to /api/cart.
  // On load the server cart wins (it drops sold-out items and caps quantities at stock).
  useEffect(() => {
    api(`/api/cart/${cartId()}`).then((c) => {
      if (c.items.length) setItems(Object.fromEntries(c.items.map((l) => [l.product_id, l.qty])))
      else Object.entries(load('rk-cart-v2', {})).forEach(([id, q]) => syncLine(id, q))
    }).catch(() => {})
  }, [])

  const qty = (id) => items[id] ?? 0
  const latest = useRef(items)
  latest.current = items
  const change = (p, delta) => {
    const c = latest.current
    const n = Math.max(0, Math.min((c[p.id] ?? 0) + delta, p.stock || 99))
    if (n === (c[p.id] ?? 0)) return
    const next = { ...c }
    if (n) next[p.id] = n; else delete next[p.id]
    latest.current = next // rapid clicks before re-render still count
    setItems(next)
    syncLine(p.id, n)
  }
  const lines = Object.entries(items).map(([id, q]) => ({ ...products.find((p) => p.id === id), qty: q })).filter((l) => l.name && isVisible(l))
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const mrp = lines.reduce((s, l) => s + l.mrp * l.qty, 0)
  return { qty, change, lines, count, total, mrp, clear: () => { setItems({}); api(`/api/cart/${cartId()}`, { method: 'DELETE' }).catch(() => {}) }, open, setOpen }
}

export const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)
