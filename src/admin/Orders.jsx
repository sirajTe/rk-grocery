import { useEffect, useState } from 'react'
import { api, qs } from '../api'
import { STORE } from '../config'
import { SearchIcon } from '../components/Icons'
import { inr } from '../utils'

const STATUSES = [['pending', 'To deliver'], ['completed', 'Completed'], ['all', 'All']]
const PAYMENTS = [['all', 'All payments'], ['cod', 'Cash on delivery'], ['whatsapp', 'WhatsApp']]

const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
const slotText = (s) => `${new Date(s.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${s.label}`
const overdue = (o) => o.status === 'pending' && new Date(o.slot.from).getTime() + 3600000 < Date.now()

const CheckIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
)

const PrintIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></svg>
)

const Field = ({ label, children }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="mt-0.5 text-[13px] font-semibold text-slate-800">{children}</dd>
  </div>
)

export default function Orders() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('pending')
  const [pay, setPay] = useState('all')
  const [page, setPage] = useState(null) // { items, total, pending, completed, revenue }
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(null) // order id being updated
  const [tick, setTick] = useState(0)

  // GET /api/orders — server sorts by nearest delivery slot first (overdue on top), completed last
  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      api(`/api/orders${qs({ q: q.trim(), status, payment: pay, limit: 500 })}`)
        .then((r) => { if (live) { setPage(r); setErr('') } })
        .catch((e) => live && setErr(e.message))
    }, q ? 250 : 0)
    return () => { live = false; clearTimeout(t) }
  }, [q, status, pay, tick])

  const setOrderStatus = async (o, next) => {
    setSaving(o.id)
    try {
      await api(`/api/orders/${o.id}/status`, { method: 'PATCH', body: { status: next } })
      setTick((n) => n + 1)
    } catch (e) { window.alert(e.message) } finally { setSaving(null) }
  }

  const orders = page?.items ?? []
  const filtered = q.trim() || pay !== 'all'
  const items = orders.reduce((s, o) => s + o.count, 0)
  // id of the single order being printed (null = print all)
  const [only, setOnly] = useState(null)

  useEffect(() => {
    if (!only) return
    const done = () => setOnly(null)
    window.addEventListener('afterprint', done)
    window.print()
    return () => window.removeEventListener('afterprint', done)
  }, [only])
  const hideIfSingle = only ? 'print-hide' : ''

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-6 print:max-w-none print:p-0">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${hideIfSingle}`}>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Orders{filtered && page && <span className="text-base font-semibold text-slate-400"> · {page.total} found</span>}</h1>
          <p className="text-sm text-slate-500">{STORE.name} · printed {when(new Date().toISOString())}</p>
        </div>
        {orders.length > 0 && (
          <button onClick={() => window.print()} title={filtered ? 'Prints the orders matching your search' : undefined} className="print-hide inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-700">
            <PrintIcon className="h-4 w-4" /> {filtered ? 'Print results' : 'Print all'}
          </button>
        )}
      </div>

      <div className="print-hide mt-5 flex gap-1 rounded-xl bg-slate-200/60 p-1">
        {STATUSES.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} aria-pressed={status === v}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${status === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {l}{page && v !== 'all' && status === 'all' ? ` (${page[v]})` : ''}
          </button>
        ))}
      </div>

      {(
        <div className="print-hide mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" autoFocus
              placeholder="Search order ID, customer, phone, address or product"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-navy-500" aria-label="Search orders" />
          </label>
          <select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment type"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none">
            {PAYMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      <div className={`mt-5 grid grid-cols-3 gap-3 ${hideIfSingle}`}>
        {[['Orders', page?.total ?? '–'], ['Items', page ? items : '–'], ['Total value', page ? inr(page.revenue) : '–']].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{k}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      {err ? (
        <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">{err} <button onClick={() => setTick((n) => n + 1)} className="underline">Retry</button></p>
      ) : !page ? (
        <p className="mt-6 p-10 text-center text-sm text-slate-400">Loading orders…</p>
      ) : !orders.length ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {filtered ? <>No orders match. <button onClick={() => { setQ(''); setPay('all') }} className="font-bold text-brand-600">Clear search</button></> : status === 'pending' ? 'All caught up — no orders waiting for delivery.' : 'No orders yet.'}
        </p>
      ) : (
        <div className="mt-5 space-y-4 print:mt-0">
          {orders.map((o) => (
            <article key={o.id} className={`break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white ${only && only !== o.id ? 'print-hide' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-extrabold text-slate-900">
                  #{o.id}
                  {o.status === 'completed' && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 align-middle text-[11px] font-bold text-slate-600">Completed</span>}
                  {overdue(o) && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 align-middle text-[11px] font-bold text-red-700">Overdue</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                  <span className="text-xs text-slate-500">Ordered {when(o.created_at)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${o.payment === 'cod' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {o.payment === 'cod' ? 'Cash on delivery' : 'WhatsApp'}
                  </span>
                  <button onClick={() => setOnly(o.id)} className="print-hide inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100" aria-label={`Print order ${o.id}`}>
                    <PrintIcon className="h-3.5 w-3.5" /> Print
                  </button>
                  {o.status === 'pending' ? (
                    <button onClick={() => setOrderStatus(o, 'completed')} disabled={saving === o.id}
                      className="print-hide inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60" aria-label={`Mark order ${o.id} complete`}>
                      <CheckIcon className="h-3.5 w-3.5" /> {saving === o.id ? 'Saving…' : 'Mark complete'}
                    </button>
                  ) : (
                    <button onClick={() => setOrderStatus(o, 'pending')} disabled={saving === o.id} title={o.completed_at ? `Completed ${when(o.completed_at)}` : undefined}
                      className="print-hide rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-60">
                      Undo complete
                    </button>
                  )}
                </div>
              </div>

              <dl className="grid gap-3 px-4 pt-4 sm:grid-cols-3">
                <Field label="Customer">{o.customer.name}<br /><span className="font-medium text-slate-600">{o.customer.phone}</span></Field>
                <Field label="Address">
                  {o.customer.flat}, {o.customer.address}
                  {o.customer.landmark && <span className="block font-medium text-slate-600">Near {o.customer.landmark}</span>}
                </Field>
                <Field label="Delivery slot">{slotText(o.slot)}</Field>
              </dl>

              <div className="px-4 pb-4 pt-3">
                <table className="w-full table-fixed text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="py-2 font-semibold">Item</th>
                      <th className="w-9 py-2 text-right sm:w-10 font-semibold">Qty</th>
                      <th className="w-14 py-2 text-right sm:w-20 font-semibold">Price</th>
                      <th className="w-16 py-2 text-right sm:w-24 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((l) => (
                      <tr key={l.product_id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-medium text-slate-800">{l.name}</td>
                        <td className="py-2 text-right tabular-nums">{l.qty}</td>
                        <td className="py-2 text-right tabular-nums text-slate-600">{inr(l.price)}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{inr(l.price * l.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {o.saved > 0 && (
                      <tr><td colSpan="3" className="pt-2 text-right text-slate-500">Customer saved</td><td className="pt-2 text-right tabular-nums text-emerald-700">{inr(o.saved)}</td></tr>
                    )}
                    <tr className="text-[15px] font-extrabold text-slate-900">
                      <td colSpan="3" className="pt-1.5 text-right">Total ({o.count} item{o.count > 1 ? 's' : ''})</td>
                      <td className="pt-1.5 text-right tabular-nums">{inr(o.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
