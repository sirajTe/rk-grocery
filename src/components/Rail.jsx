import { useRef } from 'react'
import ProductCard from './ProductCard'
import { ArrowIcon, BackIcon } from './Icons'

export default function Rail({ title, href, products }) {
  const ref = useRef(null)
  if (!products.length) return null
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {href && <a href={href} className="text-sm font-bold text-brand-600 hover:underline">see all</a>}
          <button onClick={() => scroll(-1)} className="hidden h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 md:grid" aria-label="Scroll left"><BackIcon className="h-4 w-4" /></button>
          <button onClick={() => scroll(1)} className="hidden h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 md:grid" aria-label="Scroll right"><ArrowIcon className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {products.map((p) => <ProductCard key={p.id} product={p} className="w-[150px] shrink-0 snap-start sm:w-[170px]" />)}
      </div>
    </section>
  )
}
