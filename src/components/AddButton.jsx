import { useCart } from '../store'
import { MinusIcon, PlusIcon } from './Icons'

export default function AddButton({ product: p, size = 'sm' }) {
  const { qty, change } = useCart()
  const n = qty(p.id)
  const dims = size === 'lg' ? 'h-11 w-36 text-base' : 'h-8 w-[72px] text-[13px]'
  if (!p.stock) return <span className={`${dims} grid place-items-center rounded-lg bg-slate-100 font-bold text-slate-400`}>Sold out</span>
  if (!n) return (
    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); change(p, 1) }}
      className={`${dims} rounded-lg border border-brand-500 bg-brand-50 font-extrabold text-brand-600 transition hover:bg-brand-500 hover:text-white`}>
      ADD
    </button>
  )
  return (
    <div onClick={(e) => { e.stopPropagation(); e.preventDefault() }} className={`${dims} flex items-center justify-between rounded-lg bg-brand-500 px-1 font-extrabold text-white`}>
      <button onClick={() => change(p, -1)} className="grid h-full w-7 place-items-center" aria-label="Remove one"><MinusIcon className="h-4 w-4" /></button>
      <span key={n} className="animate-fade-up">{n}</span>
      <button onClick={() => change(p, 1)} disabled={n >= p.stock} className="grid h-full w-7 place-items-center disabled:opacity-40" aria-label="Add one"><PlusIcon className="h-4 w-4" /></button>
    </div>
  )
}
