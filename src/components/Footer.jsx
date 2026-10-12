import { CATEGORIES, POLICIES, STORE, whatsappLink } from '../config'
import { WhatsAppIcon } from './Icons'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_2fr_1fr]">
        <div>
          <img src="/logo.png" alt="RKeTECH" className="h-12" />
          <p className="mt-3 text-sm text-slate-500">{STORE.promise}</p>
          <p className="mt-3 text-sm text-slate-600">{STORE.address}</p>
          <p className="mt-1 text-xs text-slate-400">GSTIN {STORE.gstin}</p>
        </div>
        <div>
          <p className="font-extrabold text-slate-900">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-500 sm:grid-cols-3">
            {CATEGORIES.map((c) => <li key={c.id}><a href={`#/c/${c.id}`} className="hover:text-slate-900">{c.name}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="font-extrabold text-slate-900">Help</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            {POLICIES.map((p) => <li key={p.label}><a href={p.href} target="_blank" rel="noreferrer" className="hover:text-slate-900">{p.label}</a></li>)}
          </ul>
          <a href={whatsappLink('Hi RKeTECH!')} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" /> {STORE.whatsapp}</a>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} RKeTECH · {STORE.hours} · {STORE.email}</p>
    </footer>
  )
}
