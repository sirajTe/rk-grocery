import { useSyncExternalStore } from 'react'
import { API_BASE, api } from './api'
import { PRODUCTS } from './data/products'

// Products come from the backend (GET /api/products). Admin requests carry the token,
// so they also include hidden products. If the API is unreachable the bundled
// catalogue is shown, so the storefront never goes blank.
let state = { products: [], loading: true, error: '' }
let started = false
const subs = new Set()
const emit = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }

export async function refreshCatalog() {
  started = true
  try {
    const r = await api('/api/products?status=all&limit=500')
    emit({ products: r.items, loading: false, error: '' })
  } catch (e) {
    emit({ products: state.products.length ? state.products : PRODUCTS, loading: false, error: e.message })
  }
}

const subscribe = (f) => {
  subs.add(f)
  if (!started) refreshCatalog()
  return () => subs.delete(f)
}
const snapshot = () => state

export const isVisible = (p) => p.active !== false
export const getProduct = (id) => state.products.find((p) => p.id === id)
export const useCatalog = () => useSyncExternalStore(subscribe, snapshot)

// Storefront: only active products. Admin passes { all: true }.
export function useProducts({ all = false } = {}) {
  const { products } = useCatalog()
  return all ? products : products.filter(isVisible)
}

// ---- Admin mutations (need an admin token) ----

export async function saveProduct(p, prevId) {
  const saved = prevId
    ? await api(`/api/products/${encodeURIComponent(prevId)}`, { method: 'PUT', body: p })
    : await api('/api/products', { method: 'POST', body: p })
  await refreshCatalog()
  return saved
}

export async function setProductActive(id, active) {
  await api(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active } })
  await refreshCatalog()
}

export async function deleteProduct(id) {
  await api(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  await refreshCatalog()
}

export async function uploadImage(blob, name = 'photo.webp') {
  const form = new FormData()
  form.append('file', blob, name)
  return API_BASE + (await api('/api/admin/uploads', { method: 'POST', form })).url
}
