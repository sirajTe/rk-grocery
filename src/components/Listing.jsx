import { useMemo, useState } from 'react'
import { CATEGORIES } from '../config'
import { useCatalog, useProducts } from '../catalog'
import { discount } from '../utils'
import ProductCard from './ProductCard'

const SORTS = {
  relevance: ['Relevance', () => 0],
  low: ['Price (low to high)', (a, b) => a.price - b.price],
  high: ['Price (high to low)', (a, b) => b.price - a.price],
  off: ['Discount', (a, b) => discount(b) - discount(a)],
}

function Sort({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none" aria-label="Sort by">
      {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>Sort: {l}</option>)}
    </select>
  )
}

function Grid({ list }) {
  const { loading } = useCatalog()
  if (loading) return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white" />)}
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
      {list.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}

export function CategoryPage({ id }) {
  const [sort, setSort] = useState('relevance')
  const PRODUCTS = useProducts()
  const { loading } = useCatalog()
  const cat = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
  const list = useMemo(() => PRODUCTS.filter((p) => p.cat === cat.id).sort(SORTS[sort][1]), [PRODUCTS, cat.id, sort])
  const count = (cid) => PRODUCTS.filter((p) => p.cat === cid).length

  return (
    <div className="mx-auto flex max-w-7xl pb-32">
      <aside className="no-scrollbar sticky top-[73px] h-[calc(100vh-73px)] w-[84px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white sm:w-[200px] max-md:top-[125px] max-md:h-[calc(100vh-125px)]">
        {CATEGORIES.map((c) => {
          const on = c.id === cat.id
          return (
            <a key={c.id} href={`#/c/${c.id}`} className={`relative flex flex-col items-center gap-1 border-b border-slate-100 px-2 py-3 text-center sm:flex-row sm:gap-3 sm:px-4 sm:text-left ${on ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
              {on && <span className="absolute inset-y-0 right-0 w-1 rounded-l bg-brand-500" />}
              <img src={c.image} alt="" className={`h-12 w-12 shrink-0 rounded-xl object-cover ${on ? 'ring-2 ring-brand-500' : 'bg-slate-100'}`} />
              <span className={`text-[11px] leading-tight sm:text-sm ${on ? 'font-extrabold text-slate-900' : 'font-medium text-slate-600'}`}>
                {c.name}<span className="hidden text-slate-400 sm:inline"> ({count(c.id)})</span>
              </span>
            </a>
          )
        })}
      </aside>

      <div className="min-w-0 flex-1 px-3 sm:px-5">
        <div className="sticky top-[73px] z-20 flex flex-wrap items-center justify-between gap-2 bg-[#f4f6fb] py-3 max-md:top-[125px]">
          <h1 className="text-lg font-extrabold text-slate-900">{cat.name} <span className="text-sm font-medium text-slate-400">· {list.length} items</span></h1>
          <Sort value={sort} onChange={setSort} />
        </div>
        {list.length || loading ? <Grid list={list} /> : (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center">
            <img src={cat.image} alt="" className="mx-auto h-24 w-24 rounded-2xl object-cover" />
            <p className="mt-4 font-bold">Fresh stock arriving soon</p>
            <p className="mt-1 text-sm text-slate-500">Message us on WhatsApp and we’ll source what you need.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function SearchPage({ q }) {
  const [sort, setSort] = useState('relevance')
  const PRODUCTS = useProducts()
  const { loading } = useCatalog()
  const term = q.trim().toLowerCase()
  const haystack = (p) => [p.name, p.brand, p.sku, ...(p.tags ?? []), CATEGORIES.find((c) => c.id === p.cat)?.name].filter(Boolean).join(' ').toLowerCase()
  const list = useMemo(() => PRODUCTS.filter((p) => !term || haystack(p).includes(term)).sort(SORTS[sort][1]), [PRODUCTS, term, sort])
  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold text-slate-900">{term ? <>Results for “{q}”</> : 'All products'} <span className="text-sm font-medium text-slate-400">· {list.length}</span></h1>
        <Sort value={sort} onChange={setSort} />
      </div>
      {list.length || loading ? <Grid list={list} /> : (
        <div className="rounded-2xl bg-white p-10 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-bold">No results for “{q}”</p>
          <p className="mt-1 text-sm text-slate-500">Try “speaker”, “keychain” or “bottle”.</p>
        </div>
      )}
    </div>
  )
}
