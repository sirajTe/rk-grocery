import { useMemo, useState } from 'react'
import { deleteProduct, isVisible, setProductActive, useCatalog } from '../catalog'
import { CATEGORIES } from '../config'
import { SearchIcon } from '../components/Icons'
import { discount, inr } from '../utils'

const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name ?? id
const STATUS = [['all', 'All products'], ['active', 'Visible'], ['hidden', 'Hidden'], ['low', 'Low stock (≤ 3)'], ['out', 'Out of stock']]
const matchStatus = {
  all: () => true,
  active: isVisible,
  hidden: (p) => !isVisible(p),
  low: (p) => p.stock > 0 && p.stock <= 3,
  out: (p) => !p.stock,
}

export default function Products() {
  const { products, loading, error } = useCatalog()
  const [busy, setBusy] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')

  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return products.filter((p) => {
      const text = [p.name, p.id, p.sku, p.brand, ...(p.tags ?? [])].filter(Boolean).join(' ').toLowerCase()
      return (cat === 'all' || p.cat === cat) && matchStatus[status](p) && words.every((w) => text.includes(w))
    })
  }, [products, q, cat, status])

  const run = async (p, f) => {
    setBusy(p.id)
    try { await f() } catch (x) { window.alert(x.message) } finally { setBusy(null) }
  }
  const remove = (p) => {
    if (window.confirm(`Delete "${p.name}"?\n\nIt will be removed from the store. This can't be undone.`)) run(p, () => deleteProduct(p.id))
  }
  const toggle = (p) => run(p, () => setProductActive(p.id, !isVisible(p)))
  const select = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none'

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">{products.length} total · {products.filter(isVisible).length} visible · {products.filter((p) => !p.stock).length} out of stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#/admin/products/new" className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">+ Add product</a>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 md:flex-row">
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search name, SKU, brand or tag" aria-label="Search products"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-navy-500" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={select} aria-label="Category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label="Status">
          {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Can’t load products from the server: {error}</p>}
      {loading ? (
        <p className="mt-6 p-10 text-center text-sm text-slate-400">Loading products…</p>
      ) : !list.length ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No products match these filters.</p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {list.map((p) => {
            const off = discount(p)
            return (
              <li key={p.id} className={`flex items-center gap-3 p-3 ${isVisible(p) ? '' : 'bg-slate-50'} ${busy === p.id ? 'pointer-events-none opacity-50' : ''}`}>
                <img src={p.image} alt="" loading="lazy" className={`h-14 w-14 shrink-0 rounded-lg border border-slate-100 bg-white object-contain ${isVisible(p) ? '' : 'opacity-50'}`} />
                <div className="min-w-0 flex-1">
                  <a href={`#/admin/products/${encodeURIComponent(p.id)}`} className="line-clamp-1 text-sm font-bold text-slate-900 hover:underline">{p.name}</a>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {catName(p.cat)}{p.sku && ` · ${p.sku}`}{!isVisible(p) && <span className="font-bold text-slate-700"> · Hidden</span>}
                  </p>
                  <p className="mt-0.5 text-xs">
                    <span className="font-extrabold text-slate-900">{inr(p.price)}</span>
                    {off > 0 && <span className="text-slate-400"> <s>{inr(p.mrp)}</s> {off}% off</span>}
                    <span className={`ml-2 font-bold ${p.stock > 3 ? 'text-emerald-600' : p.stock ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.stock ? `${p.stock} in stock` : 'Out of stock'}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <button onClick={() => toggle(p)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">{isVisible(p) ? 'Hide' : 'Show'}</button>
                  <a href={`#/admin/products/${encodeURIComponent(p.id)}`} className="rounded-lg border border-navy-200 bg-navy-50 px-2.5 py-1.5 text-center text-xs font-bold text-navy-700 hover:bg-navy-100">Edit</a>
                  <button onClick={() => remove(p)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
