import { CATEGORIES } from '../config'
import { useProducts } from '../catalog'
import { discount } from '../utils'
import Rail from './Rail'

export default function Home() {
  const PRODUCTS = useProducts()
  const byCat = (id) => PRODUCTS.filter((p) => p.cat === id)
  const pic = (id) => PRODUCTS.find((p) => p.id === id)?.image
  const maxOff = Math.max(0, ...PRODUCTS.map(discount))
  const deals = [...PRODUCTS].sort((a, b) => discount(b) - discount(a)).slice(0, 14)
  const under199 = PRODUCTS.filter((p) => p.price <= 199).sort((a, b) => a.price - b.price)

  const BANNERS = [
    { href: '#/c/festivals-items', bg: 'from-orange-500 to-amber-400', kicker: 'Festive store is live', title: 'Diwali, Navratri & Karva Chauth essentials', cta: 'Shop festive', img: byCat('festivals-items')[0]?.image },
    { href: '#/c/speakers-and-headphones', bg: 'from-navy-800 to-navy-500', kicker: `Up to ${maxOff}% off`, title: 'Party speakers & smart gadgets', cta: 'Order now', img: pic('rechargeable-karaoke-speaker-with-rgb-light') },
    { href: '#/c/keychains-526056', bg: 'from-fuchsia-600 to-pink-500', kicker: 'Starting ₹99', title: 'Keychains, bags & return gifts', cta: 'Explore', img: byCat('keychains-526056')[0]?.image },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32">
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
        {BANNERS.map((b) => (
          <a key={b.title} href={b.href} className={`relative flex h-44 w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br ${b.bg} p-5 text-white sm:h-48 sm:w-[60%] lg:w-auto`}>
            <div className="relative z-10 flex max-w-[58%] flex-col">
              <span className="text-xs font-bold uppercase tracking-wide text-white/80">{b.kicker}</span>
              <p className="mt-1 text-xl font-extrabold leading-tight">{b.title}</p>
              <span className="mt-auto w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold">{b.cta}</span>
            </div>
            {b.img && <img src={b.img} alt="" className="absolute -bottom-2 -right-2 h-40 w-40 rotate-6 rounded-2xl object-cover shadow-2xl sm:h-44 sm:w-44" />}
          </a>
        ))}
      </div>

      <section className="pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Shop by category</h2>
        <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 lg:grid-cols-12">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`#/c/${c.id}`} className="group text-center">
              <span className="block aspect-square overflow-hidden rounded-2xl bg-[#eef3fb] p-1.5 transition group-hover:bg-brand-50">
                <img src={c.image} alt="" loading="lazy" className="h-full w-full rounded-xl object-cover transition duration-300 group-hover:scale-105" />
              </span>
              <span className="mt-1.5 line-clamp-2 block text-[11px] font-semibold leading-tight text-slate-700 sm:text-xs">{c.name}</span>
            </a>
          ))}
        </div>
      </section>

      <Rail title="🥬 Fresh vegetables" href="#/c/vegetables" products={byCat('vegetables')} />
      <Rail title="🔥 Biggest discounts right now" products={deals} />
      <Rail title="Festival specials" href="#/c/festivals-items" products={byCat('festivals-items')} />
      <Rail title="Everything under ₹199" href="#/search?q=" products={under199.slice(0, 16)} />
      <Rail title="Home & kitchen" href="#/c/home-and-kitchen" products={byCat('home-and-kitchen')} />
      <Rail title="Keychains" href="#/c/keychains-526056" products={byCat('keychains-526056')} />
      <Rail title="Bags & clutches" href="#/c/gift-and-bags" products={byCat('gift-and-bags')} />
      <Rail title="Speakers & smart gadgets" href="#/c/speakers-and-headphones" products={[...byCat('speakers-and-headphones'), ...byCat('smart-lifestyle-gadgets')]} />
      <Rail title="Bottles, glasses & sippers" href="#/c/bottlesglasscups" products={byCat('bottlesglasscups')} />
      <Rail title="Return gifts & new arrivals" href="#/c/return-gift-items" products={[...byCat('return-gift-items'), ...byCat('recent-updated-new-items')]} />
    </div>
  )
}
