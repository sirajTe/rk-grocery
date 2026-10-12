import { useState } from 'react'
import { STORE } from '../config'
import { go } from '../store'
import { login, logout, useAdminSession } from './auth'
import Orders from './Orders'
import ProductForm from './ProductForm'
import Products from './Products'

const TABS = [['/admin/all-orders', 'Orders'], ['/admin/products', 'Products'], ['/admin/products/new', '+ Add product']]

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await login(email, password) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-navy-500'

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin login</h1>
        <p className="mt-1 text-sm text-slate-500">{STORE.name} business owner area</p>
        <label className="mt-6 block text-sm font-semibold text-slate-700">Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-navy-800 py-3 font-bold text-white hover:bg-navy-700 disabled:opacity-60">
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

export default function Admin({ route }) {
  const session = useAdminSession()
  if (!session) return <Login />

  const [, , section, id] = route.split('?')[0].split('/') // /admin/<section>/<id>
  const page =
    section === 'products' && id === 'new' ? <ProductForm key="new" /> :
    section === 'products' && id ? <ProductForm key={id} id={decodeURIComponent(id)} /> :
    section === 'products' ? <Products /> :
    <Orders />
  const active = section === 'products' ? (id === 'new' ? 2 : 1) : 0

  return (
    <>
      <nav className="print-hide sticky top-[57px] z-30 border-b border-slate-200 bg-white sm:top-[69px]">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
          {TABS.map(([href, label], i) => (
            <a key={href} href={`#${href}`} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${i === active ? 'border-brand-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</a>
          ))}
          <span className="ml-auto hidden shrink-0 pl-3 text-xs text-slate-400 sm:block">{session.email}</span>
          <button onClick={() => { logout(); go('/admin') }} className="shrink-0 px-3 py-3 text-sm font-bold text-slate-500 hover:text-red-600">Log out</button>
        </div>
      </nav>
      {page}
    </>
  )
}
