import { useEffect, useState } from 'react'
import { STORE } from '../config'
import { go, useCart } from '../store'
import { BoltIcon, CartIcon, ChevronIcon, SearchIcon } from './Icons'

const HINTS = ['"speaker"', '"keychain"', '"bottle"', '"diwali decor"', '"return gifts"', '"bedsheet"', '"massager"']

// Admin pages: logo only (no location, search, help or cart)
function AdminHeader() {
  return (
    <header className="print-hide sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
        <a href="#/admin" aria-label="RKeTECH admin"><img src="/logo.png" alt="RKeTECH" className="h-8 w-auto sm:h-11" /></a>
      </div>
    </header>
  )
}

export default function Header({ route, admin }) {
  return admin ? <AdminHeader /> : <StoreHeader route={route} />
}

function StoreHeader({ route }) {
  const { count, setOpen } = useCart()
  const [hint, setHint] = useState(0)
  const initial = route.startsWith('/search') ? decodeURIComponent(route.split('q=')[1] ?? '') : ''
  const [q, setQ] = useState(initial)

  useEffect(() => { const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2200); return () => clearInterval(t) }, [])
  useEffect(() => { if (!route.startsWith('/search')) setQ('') }, [route])

  const search = (v) => { setQ(v); go(v ? `/search?q=${encodeURIComponent(v)}` : '/') }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:gap-x-5">
        <a href="#/" className="shrink-0 md:border-r md:border-slate-200 md:pr-5" aria-label="RKeTECH home">
          <img src="/logo.png" alt="RKeTECH" className="h-8 w-auto sm:h-11" />
        </a>

        <div className="min-w-0 flex-1 border-l border-slate-200 pl-3 md:flex-none md:border-0 md:pl-0">
          <p className="flex items-center gap-1 whitespace-nowrap text-[13px] font-extrabold leading-tight text-slate-900 sm:text-[15px]">
            <BoltIcon className="h-3.5 w-3.5 shrink-0 fill-brand-500 text-brand-500 sm:h-4 sm:w-4" /> Fast local delivery
          </p>
          <p className="mt-0.5 flex items-center gap-0.5 text-[11px] text-slate-600 sm:text-xs">
            <span className="truncate">Sector 103, Gurgaon<span className="hidden sm:inline"> · within {STORE.deliveryRadius}</span></span>
            <ChevronIcon className="h-3.5 w-3.5 shrink-0" />
          </p>
        </div>

        <label className="relative order-last w-full md:order-none md:flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => search(e.target.value)} type="search" aria-label="Search products"
            className="peer w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-navy-500 focus:bg-white" />
          {!q && (
            <span className="pointer-events-none absolute left-11 top-1/2 flex -translate-y-1/2 gap-1 overflow-hidden text-sm text-slate-500">
              Search <span key={hint} className="animate-fade-up">{HINTS[hint]}</span>
            </span>
          )}
        </label>

        <a href={`tel:+${STORE.phoneRaw}`} className="hidden text-sm font-semibold text-slate-700 hover:text-navy-700 lg:block">Help · {STORE.phone}</a>

        <button onClick={() => setOpen(true)} className="relative flex shrink-0 items-center rounded-xl bg-navy-800 p-2.5 text-white transition hover:bg-navy-700" aria-label={`My cart, ${count} items`}>
          <CartIcon className="h-6 w-6" />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white">{count > 99 ? '99+' : count}</span>
          )}
        </button>
      </div>
    </header>
  )
}
