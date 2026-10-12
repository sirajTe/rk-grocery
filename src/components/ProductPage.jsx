import { Fragment, useState } from 'react'
import { CATEGORIES, FESTIVALS, STORE, whatsappLink } from '../config'
import { useCatalog, useProducts } from '../catalog'
import { discount, inr } from '../utils'
import AddButton from './AddButton'
import { BoltIcon, ShieldIcon, TagIcon, WhatsAppIcon } from './Icons'
import Rail from './Rail'

export default function ProductPage({ id }) {
  const PRODUCTS = useProducts()
  const p = PRODUCTS.find((x) => x.id === id)
  const [img, setImg] = useState(0)
  const { loading } = useCatalog()
  if (!p && loading) return <div className="mx-auto mt-6 h-96 max-w-7xl animate-pulse rounded-3xl bg-white" />
  if (!p) return <p className="p-10 text-center">Product not found. <a href="#/" className="font-bold text-brand-600">Go home</a></p>
  const imgs = [...new Set([p.image, p.image2, ...(p.images ?? [])].filter(Boolean))]
  const cat = CATEGORIES.find((c) => c.id === p.cat) ?? { id: p.cat, name: 'Shop' }
  const highlights = (p.highlights ?? []).filter(Boolean)
  const specs = [['Brand', p.brand], ['Pack size', p.unit], ['SKU', p.sku]].filter(([, v]) => v)
  const off = discount(p)

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32">
      <nav className="py-3 text-xs text-slate-500">
        <a href="#/" className="hover:text-slate-800">Home</a> / <a href={`#/c/${cat.id}`} className="hover:text-slate-800">{cat.name}</a> / <span className="text-slate-800">{p.name}</span>
      </nav>
      <div className="grid gap-6 rounded-3xl bg-white p-4 sm:p-6 md:grid-cols-2 md:gap-10">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            <img key={imgs[img]} src={imgs[img]} alt={p.name} className="animate-fade-up h-full w-full object-contain" />
          </div>
          {imgs.length > 1 && (
            <div className="mt-3 flex gap-2">
              {imgs.map((src, i) => (
                <button key={src} onClick={() => setImg(i)} className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === img ? 'border-brand-500' : 'border-slate-100'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <a href={`#/c/${cat.id}`} className="w-fit text-sm font-bold text-navy-700 hover:underline">{cat.name}{p.festival ? ` · ${FESTIVALS[p.festival]}` : ''}</a>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">{p.name}</h1>
          {(p.brand || p.unit) && <p className="mt-1 text-sm text-slate-500">{[p.brand, p.unit].filter(Boolean).join(' · ')}</p>}
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"><BoltIcon className="h-3.5 w-3.5 text-brand-500" /> Delivered within {STORE.deliveryRadius} of Sector 103</span>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{inr(p.price)}</span>
                {off > 0 && <span className="text-sm text-slate-400">MRP <span className="line-through">{inr(p.mrp)}</span></span>}
                {off > 0 && <span className="rounded-md bg-navy-700 px-1.5 py-0.5 text-xs font-extrabold text-white">{off}% OFF</span>}
              </p>
              <p className="text-xs text-slate-500">Inclusive of all taxes</p>
            </div>
            <AddButton product={p} size="lg" />
          </div>
          <p className={`mt-3 text-sm font-semibold ${p.stock > 3 ? 'text-emerald-600' : p.stock ? 'text-amber-600' : 'text-red-600'}`}>
            {p.stock > 3 ? '● In stock' : p.stock ? `● Only ${p.stock} left in stock` : '● Out of stock'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            {[[BoltIcon, 'Fast local delivery'], [TagIcon, 'Better prices'], [ShieldIcon, 'GST invoice']].map(([I, t]) => (
              <div key={t} className="rounded-xl bg-slate-50 p-3"><I className="mx-auto h-6 w-6 text-brand-500" /><p className="mt-1.5 font-semibold text-slate-700">{t}</p></div>
            ))}
          </div>

          {(p.description || highlights.length > 0 || specs.length > 0) && (
            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <h2 className="font-extrabold text-slate-900">Product details</h2>
              {p.description && <p className="whitespace-pre-line leading-relaxed">{p.description}</p>}
              {highlights.length > 0 && <ul className="list-disc space-y-1 pl-5">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
              {specs.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                  {specs.map(([k, v]) => <Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></Fragment>)}
                </dl>
              )}
            </div>
          )}

          <a href={whatsappLink(`Hi RKeTECH! Is "${p.name}" (${inr(p.price)}) available?`)} target="_blank" rel="noreferrer"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-[#25D366] py-3 text-sm font-bold text-[#128C7E] hover:bg-[#25D366]/10">
            <WhatsAppIcon /> Ask about this product
          </a>
        </div>
      </div>

      <Rail title="Similar products" href={`#/c/${cat.id}`} products={PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id)} />
      <Rail title="You might also like" products={PRODUCTS.filter((x) => x.cat !== p.cat && discount(x) >= 40).slice(0, 12)} />
    </div>
  )
}
