import { useEffect, useMemo, useState } from 'react'
import { STORE, whatsappLink } from '../config'
import { load, placeOrder, save, useCart } from '../store'
import { inr } from '../utils'
import AddButton from './AddButton'
import { BackIcon, BillIcon, BoltIcon, CartIcon, ClockIcon, PinIcon, WhatsAppIcon } from './Icons'

const hour = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }).replace(/\s?(am|pm)/i, (m) => ` ${m.trim().toUpperCase()}`)

const PHONE_RE = /^[6-9]\d{9}$/
// Keep digits only, drop a leading +91 / 0, cap at 10
const cleanPhone = (v = '') => {
  let d = v.replace(/\D/g, '')
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

// Next 4 one-hour slots, starting at the first full hour at least 1 hour from now
const nextSlots = (now = new Date()) => {
  const start = new Date(now.getTime() + 3600000)
  if (start.getMinutes() || start.getSeconds() || start.getMilliseconds()) start.setHours(start.getHours() + 1)
  start.setMinutes(0, 0, 0)
  return Array.from({ length: 4 }, (_, i) => {
    const from = new Date(start.getTime() + i * 3600000)
    const to = new Date(from.getTime() + 3600000)
    const day = from.getDate() === now.getDate() ? 'Today' : 'Tomorrow'
    return { day, time: `${hour(from)} – ${hour(to)}`, from: from.toISOString() }
  })
}

export default function CartPanel() {
  const { lines, count, total, mrp, clear, open, setOpen } = useCart()
  const [step, setStep] = useState('cart')
  const [f, setF] = useState(() => {
    const a = { name: '', phone: '', flat: '', address: '', landmark: '', ...load('rk-address', {}) }
    return { ...a, phone: cleanPhone(a.phone) }
  })
  const set = (k) => (e) => {
    const n = { ...f, [k]: k === 'phone' ? cleanPhone(e.target.value) : e.target.value }
    setF(n); save('rk-address', n)
  }
  const [phoneTouched, setPhoneTouched] = useState(false)
  const phoneOk = PHONE_RE.test(f.phone)
  const phoneErr = (phoneTouched || f.phone.length === 10) && f.phone && !phoneOk
  const slots = useMemo(() => nextSlots(), [step])
  const [slot, setSlot] = useState(0)
  const [placed, setPlaced] = useState(null)
  const [busy, setBusy] = useState(false)
  const [orderErr, setOrderErr] = useState('')

  useEffect(() => {
    if (!open) { setStep('cart'); setSlot(0); setPhoneTouched(false); setOrderErr(''); return }
    const k = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, setOpen])
  if (!open) return null

  const saved = mrp - total
  const ready = f.name.trim() && phoneOk && f.flat.trim() && f.address.trim()

  const place = async (cod) => {
    const sl = slots[slot]
    // Open the WhatsApp tab now, inside the click, so popup blockers allow it; filled in once the order is saved
    const tab = cod ? null : window.open('', '_blank')
    setBusy(true); setOrderErr('')
    let order
    try {
      order = await placeOrder({
        items: lines.map(({ id, qty }) => ({ product_id: id, qty })),
        customer: { name: f.name.trim(), phone: f.phone, flat: f.flat.trim(), address: f.address.trim(), landmark: f.landmark.trim() },
        slot: { from: sl.from, label: sl.time },
        payment: cod ? 'cod' : 'whatsapp',
      })
    } catch (e) {
      tab?.close()
      const out = e.detail?.items?.map((x) => x.name ?? lines.find((l) => l.id === x.product_id)?.name).filter(Boolean)
      setOrderErr(out?.length ? `${e.message}: ${out.join(', ')}. Please update your cart.` : e.message)
      return
    } finally { setBusy(false) }

    setPlaced({ cod, total: order.total, slot: sl, id: order.id })
    clear(); setStep('done')
    if (cod) return
    const msg = [
      `🛒 *New order #${order.id} — RKeTECH*`, '',
      ...order.items.map((l, i) => `${i + 1}. ${l.name} × ${l.qty} = ${inr(l.price * l.qty)}`), '',
      `Items: ${order.count}`, order.saved > 0 ? `You saved: ${inr(order.saved)}` : '', `*To pay: ${inr(order.total)}*`, '',
      `👤 ${f.name} · ${f.phone}`, `📍 Flat/House ${f.flat}, ${f.address}${f.landmark ? `, near ${f.landmark}` : ''}`,
      `🕒 Delivery slot: ${sl.day}, ${sl.time}`,
    ].filter(Boolean).join('\n')
    const url = whatsappLink(msg)
    // Popup blocked (common in mobile / in-app browsers) → open WhatsApp in this tab
    if (tab) tab.location.href = url; else window.location.href = url
  }

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-navy-500'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="My cart">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
      <aside className="animate-slide-in absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-[#f4f6fb]">
        <div className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
          <button onClick={() => (step === 'address' ? setStep('cart') : setOpen(false))} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Back"><BackIcon /></button>
          <p className="text-lg font-extrabold text-slate-900">{step === 'address' ? 'Delivery details' : step === 'done' ? 'Order placed' : 'My Cart'}</p>
        </div>

        {step === 'done' ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-4xl text-white">✓</span>
              <p className="mt-5 text-xl font-extrabold">{placed?.cod ? 'Order placed!' : 'Order sent on WhatsApp!'}</p>
              {placed?.id && <p className="mt-1 text-sm font-bold text-slate-500">Order #{placed.id}</p>}
              {placed?.cod ? (
                <p className="mt-2 text-sm text-slate-500">
                  Arriving {placed.slot.day.toLowerCase()}, {placed.slot.time}. Pay <span className="font-bold text-slate-700">{inr(placed.total)}</span> in cash on delivery. Need help? Call {STORE.phone}.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">RKeTECH will confirm your order and delivery time shortly. Need help? Call {STORE.phone}.</p>
              )}
              <button onClick={() => setOpen(false)} className="mt-6 rounded-xl bg-navy-800 px-6 py-3 font-bold text-white">Continue shopping</button>
            </div>
          </div>
        ) : !lines.length ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-navy-700 shadow"><CartIcon className="h-9 w-9" /></span>
              <p className="mt-5 text-lg font-extrabold">You don’t have any items in your cart</p>
              <p className="mt-1 text-sm text-slate-500">Your favourite gadgets and gifts are waiting.</p>
              <button onClick={() => setOpen(false)} className="mt-6 rounded-xl bg-brand-500 px-6 py-3 font-bold text-white">Start shopping</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {step === 'cart' ? (
                <>
                  {saved > 0 && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">🎉 You’re saving {inr(saved)} on this order</p>}
                  <section className="rounded-2xl bg-white p-4">
                    <p className="flex items-center gap-2 text-sm font-extrabold"><BoltIcon className="h-5 w-5 text-brand-500" /> Delivery within {STORE.deliveryRadius}</p>
                    <p className="text-xs text-slate-500">Shipment of {count} item{count > 1 ? 's' : ''}</p>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {lines.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 py-3">
                          <img src={l.image} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-contain" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-semibold leading-tight">{l.name}</p>
                            <p className="mt-1 text-[13px]"><span className="font-extrabold">{inr(l.price)}</span>{l.mrp > l.price && <span className="ml-1.5 text-xs text-slate-400 line-through">{inr(l.mrp)}</span>}</p>
                          </div>
                          <AddButton product={l} />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-2xl bg-white p-4 text-sm">
                    <p className="flex items-center gap-2 font-extrabold"><BillIcon className="h-5 w-5" /> Bill details</p>
                    <p className="mt-3 flex justify-between text-slate-600"><span>Items total {saved > 0 && <span className="ml-1 rounded bg-navy-50 px-1.5 text-[11px] font-bold text-navy-700">Saved {inr(saved)}</span>}</span><span>{saved > 0 && <span className="mr-1.5 text-slate-400 line-through">{inr(mrp)}</span>}{inr(total)}</span></p>
                    <p className="mt-1.5 flex justify-between text-slate-600"><span>Delivery charge</span><span className="text-slate-500">Confirmed on WhatsApp</span></p>
                    <p className="mt-3 flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-extrabold"><span>Grand total</span><span>{inr(total)}</span></p>
                  </section>
                  <section className="rounded-2xl bg-white p-4 text-xs text-slate-500">
                    <p className="font-bold text-slate-700">Cancellation & returns</p>
                    <p className="mt-1">Orders can be cancelled before dispatch. See our <a href={`${STORE.legacySite}/refund-policy`} target="_blank" rel="noreferrer" className="font-semibold text-navy-700 underline">return & refund policy</a>.</p>
                  </section>
                </>
              ) : (
                <>
                <section className="space-y-3 rounded-2xl bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-extrabold"><PinIcon className="h-5 w-5 text-brand-500" /> Where should we deliver?</p>
                  <input value={f.name} onChange={set('name')} placeholder="Full name *" className={input} />
                  <div>
                    <input value={f.phone} onChange={set('phone')} onBlur={() => setPhoneTouched(true)} placeholder="10-digit mobile number *"
                      type="tel" inputMode="numeric" aria-invalid={!!phoneErr} className={`${input} ${phoneErr ? 'border-red-400 focus:border-red-500' : ''}`} />
                    {phoneErr && <p className="mt-1 text-xs font-semibold text-red-600">Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9</p>}
                  </div>
                  <input value={f.flat} onChange={set('flat')} placeholder="Flat / house no., floor, building *" className={input} />
                  <textarea value={f.address} onChange={set('address')} rows="3" placeholder="Street, area, sector *" className={input} />
                  <input value={f.landmark} onChange={set('landmark')} placeholder="Landmark (optional)" className={input} />
                  <p className="text-xs text-slate-500">We deliver within {STORE.deliveryRadius} of Sector 103, Gurgaon. Saved for next time.</p>
                </section>
                <section className="rounded-2xl bg-white p-4">
                  <p className="flex items-center gap-2 text-sm font-extrabold"><ClockIcon className="h-5 w-5 text-brand-500" /> When should we deliver?</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {slots.map((s, i) => (
                      <button key={i} type="button" onClick={() => setSlot(i)} aria-pressed={slot === i}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${slot === i ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span className="block text-[11px] font-semibold uppercase text-slate-500">{s.day}</span>
                        <span className="block text-sm font-bold text-slate-900">{s.time}</span>
                      </button>
                    ))}
                  </div>
                </section>
                </>
              )}
            </div>

            <div className="bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {step === 'cart' ? (
                <button onClick={() => setStep('address')} className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3.5 font-bold text-white hover:bg-emerald-700">
                  <span className="text-left text-sm leading-tight">{inr(total)}<br /><span className="text-[11px] font-medium uppercase opacity-80">Total</span></span>
                  <span>Proceed →</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {orderErr && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{orderErr}</p>}
                  <button disabled={!ready || busy} onClick={() => place(true)} className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    <span className="text-left text-sm leading-tight">{inr(total)}<br /><span className="text-[11px] font-medium uppercase opacity-80">Cash on delivery</span></span>
                    <span>{busy ? 'Placing…' : 'Place order →'}</span>
                  </button>
                  <button disabled={!ready || busy} onClick={() => place(false)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] py-3 font-bold text-[#128C4B] hover:bg-[#25D366]/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                    <WhatsAppIcon /> Order on WhatsApp
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
