import { useCart } from '../store'
import { inr } from '../utils'
import { CartIcon } from './Icons'

export default function CartBar() {
  const { lines, count, total, open, setOpen } = useCart()
  if (!count || open) return null
  return (
    <button onClick={() => setOpen(true)} className="print-hide animate-fade-up fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-600 p-2.5 pr-4 text-white shadow-2xl shadow-emerald-900/30 md:hidden">
      <span className="flex -space-x-3">
        {lines.slice(0, 3).map((l) => <img key={l.id} src={l.image} alt="" className="h-10 w-10 rounded-lg border-2 border-emerald-600 bg-white object-cover" />)}
      </span>
      <span className="text-left text-sm font-bold leading-tight">{count} item{count > 1 ? 's' : ''}<br /><span className="font-extrabold">{inr(total)}</span></span>
      <span className="ml-auto flex items-center gap-1.5 font-bold"><CartIcon className="h-5 w-5" /> View cart ›</span>
    </button>
  )
}
