import { CATEGORIES } from '../config'
import { discount, inr } from '../utils'
import AddButton from './AddButton'

export default function ProductCard({ product: p, className = '' }) {
  const off = discount(p)
  const cat = CATEGORIES.find((c) => c.id === p.cat)
  return (
    <a href={`#/p/${p.id}`} className={`group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-2.5 transition hover:shadow-lg hover:shadow-navy-900/5 ${className}`}>
      {off > 0 && (
        <span className="absolute left-2.5 top-0 z-10 rounded-b-lg bg-navy-700 px-1.5 pb-1 pt-0.5 text-center text-[10px] font-extrabold leading-tight text-white">
          {off}%<br />OFF
        </span>
      )}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-105" />
        {p.stock > 0 && p.stock <= 3 && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-red-600 shadow-sm">Only {p.stock} left</span>}
      </div>
      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        ⚡ Local delivery
      </span>
      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-tight text-slate-800">{p.name}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">{cat?.name}</p>
      <div className="mt-auto flex items-end justify-between gap-1 pt-2">
        <div className="leading-tight">
          <p className="text-[13px] font-extrabold text-slate-900">{inr(p.price)}</p>
          {off > 0 && <p className="text-[11px] text-slate-400 line-through">{inr(p.mrp)}</p>}
        </div>
        <AddButton product={p} />
      </div>
    </a>
  )
}
