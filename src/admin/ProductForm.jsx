import { useState } from 'react'
import { deleteProduct, getProduct, saveProduct, uploadImage, useCatalog } from '../catalog'
import { CATEGORIES, FESTIVALS } from '../config'
import ProductCard from '../components/ProductCard'
import { go } from '../store'
import { discount, inr } from '../utils'

const GST_RATES = [0, 5, 12, 18, 28]
const MAX_EXTRA_IMAGES = 4

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

// Shrink a photo to max 1200px WebP before uploading
const readImage = (file) => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'))
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(img.src)
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image'))), 'image/webp', 0.85)
  }
  img.onerror = () => reject(new Error('Could not read that image'))
  img.src = URL.createObjectURL(file)
})

const toForm = (p) => ({
  name: p?.name ?? '',
  id: p?.id ?? '',
  cat: p?.cat ?? '',
  festival: p?.festival ?? '',
  brand: p?.brand ?? '',
  sku: p?.sku ?? '',
  unit: p?.unit ?? '',
  price: p?.price ?? '',
  mrp: p?.mrp ?? '',
  gst: p?.gst ?? 18,
  hsn: p?.hsn ?? '',
  stock: p?.stock ?? '',
  active: p ? p.active !== false : true,
  image: p?.image ?? '',
  images: [...new Set([p?.image2, ...(p?.images ?? [])].filter((x) => x && x !== p?.image))],
  description: p?.description ?? '',
  highlights: (p?.highlights ?? []).join('\n'),
  tags: (p?.tags ?? []).join(', '),
})

function validate(f, editingId) {
  const e = {}
  const price = Number(f.price), mrp = Number(f.mrp), stock = Number(f.stock)
  if (!f.name.trim()) e.name = 'Product name is required'
  if (!f.id) e.id = 'URL slug is required'
  else if (!/^[a-z0-9-]+$/.test(f.id)) e.id = 'Use only lowercase letters, numbers and dashes'
  else if (f.id !== editingId && getProduct(f.id)) e.id = 'Another product already uses this slug'
  if (!f.cat) e.cat = 'Choose a category'
  if (f.price === '' || !(price > 0)) e.price = 'Enter a selling price above ₹0'
  if (f.mrp === '' || !(mrp > 0)) e.mrp = 'Enter the MRP'
  else if (mrp < price) e.mrp = 'MRP can’t be lower than the selling price'
  if (f.stock === '' || !Number.isInteger(stock) || stock < 0) e.stock = 'Enter stock as a whole number (0 or more)'
  if (!f.image) e.image = 'Add a main product photo'
  if (f.hsn && !/^\d{4,8}$/.test(f.hsn)) e.hsn = 'HSN code is 4–8 digits'
  return e
}

const toProduct = (f) => ({
  id: f.id,
  name: f.name.trim(),
  cat: f.cat,
  festival: f.festival || null,
  price: Number(f.price),
  mrp: Number(f.mrp),
  image: f.image,
  ...(f.images.length && { images: f.images }),
  stock: Number(f.stock),
  active: f.active,
  ...(f.brand.trim() && { brand: f.brand.trim() }),
  ...(f.sku.trim() && { sku: f.sku.trim().toUpperCase() }),
  ...(f.unit.trim() && { unit: f.unit.trim() }),
  gst: Number(f.gst),
  ...(f.hsn && { hsn: f.hsn }),
  ...(f.description.trim() && { description: f.description.trim() }),
  ...(f.highlights.trim() && { highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean) }),
  ...(f.tags.trim() && { tags: f.tags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) }),
})

const inputCls = (err) => `mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 ${err ? 'border-red-400' : 'border-slate-200'}`

function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${className}`}>
      {label}{required && <span className="text-red-500"> *</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function ImagePicker({ value, onChange, onRemove, label }) {
  const [err, setErr] = useState('')
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setUploading(true)
    try { onChange(await uploadImage(await readImage(file))) } catch (x) { setErr(x.message) } finally { setUploading(false) }
  }
  if (value) return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <img src={value} alt="" className="h-full w-full object-contain" />
      <button type="button" onClick={onRemove} className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 px-2 py-1 text-xs font-bold text-red-600 shadow">Remove</button>
    </div>
  )
  return (
    <div className="flex aspect-square flex-col justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center">
      <label className={`cursor-pointer rounded-lg bg-navy-800 px-3 py-2 text-xs font-bold text-white hover:bg-navy-700 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
        {uploading ? 'Uploading…' : `Upload ${label}`}
        <input type="file" accept="image/*" onChange={pick} disabled={uploading} className="sr-only" />
      </label>
      <span className="text-[11px] text-slate-400">or paste image URL</span>
      <div className="flex gap-1">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none" />
        <button type="button" disabled={!url.trim()} onClick={() => { onChange(url.trim()); setUrl('') }} className="rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold disabled:opacity-40">Add</button>
      </div>
      {err && <span className="text-[11px] font-semibold text-red-600">{err}</span>}
    </div>
  )
}

export default function ProductForm({ id }) {
  const { loading } = useCatalog()
  if (loading) return <p className="p-10 text-center text-sm text-slate-400">Loading…</p>
  return <Form id={id} />
}

function Form({ id }) {
  const existing = id ? getProduct(id) : null
  const [f, setF] = useState(() => toForm(existing))
  const [slugTouched, setSlugTouched] = useState(!!existing)
  const [errors, setErrors] = useState({})
  const [saveErr, setSaveErr] = useState('')
  const [saving, setSaving] = useState(false)

  if (id && !existing) return (
    <p className="p-10 text-center">Product not found. <a href="#/admin/products" className="font-bold text-brand-600">Back to products</a></p>
  )

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((o) => ({ ...o, [k]: v, ...(k === 'name' && !slugTouched && { id: slugify(v) }) }))
    setErrors((o) => ({ ...o, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(f, existing?.id)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus()
      return
    }
    setSaving(true); setSaveErr('')
    try {
      await saveProduct(toProduct(f), existing?.id)
      go('/admin/products')
    } catch (x) {
      // 409 from the server: slug or SKU already taken
      if (x.status === 409 && /slug/i.test(x.message)) setErrors({ id: x.message })
      else if (x.status === 409 && /sku/i.test(x.message)) setErrors({ sku: x.message })
      setSaveErr(x.message)
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${existing.name}"? This can't be undone.`)) return
    try { await deleteProduct(existing.id); go('/admin/products') } catch (x) { setSaveErr(x.message) }
  }

  const preview = { ...toProduct(f), id: f.id || 'preview', name: f.name || 'Product name', price: Number(f.price) || 0, mrp: Number(f.mrp) || Number(f.price) || 0, stock: Number(f.stock) || 0, image: f.image || '/logo.png' }
  const off = discount(preview)
  const gstAmount = preview.price ? Math.round((preview.price * Number(f.gst)) / (100 + Number(f.gst)) * 100) / 100 : 0

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-6xl px-4 pb-32 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="#/admin/products" className="text-sm font-bold text-slate-500 hover:text-slate-800">← Products</a>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{existing ? 'Edit product' : 'Add a new product'}</h1>
        </div>
        {existing && <a href={`#/p/${existing.id}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-navy-700 hover:underline">View in store ↗</a>}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Section title="1. Basic details">
            <Field label="Product name" required error={errors.name} className="sm:col-span-2" hint="What customers see, e.g. “Rechargeable Karaoke Speaker with RGB Light”">
              <input name="name" value={f.name} onChange={set('name')} maxLength={120} className={inputCls(errors.name)} />
            </Field>
            <Field label="URL slug" required error={errors.id} hint={`Product link: /p/${f.id || '…'}`}>
              <input name="id" value={f.id} onChange={(e) => { setSlugTouched(true); set('id')({ target: { value: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') } }) }} className={inputCls(errors.id)} />
            </Field>
            <Field label="Category" required error={errors.cat}>
              <select name="cat" value={f.cat} onChange={set('cat')} className={inputCls(errors.cat)}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Festival (optional)" hint="Shows the product in that festival’s collection">
              <select name="festival" value={f.festival} onChange={set('festival')} className={inputCls()}>
                <option value="">None</option>
                {Object.entries(FESTIVALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Brand" hint="Leave blank if unbranded">
              <input name="brand" value={f.brand} onChange={set('brand')} className={inputCls()} />
            </Field>
            <Field label="SKU / item code" error={errors.sku} hint="Your internal code, e.g. SKU-0119">
              <input name="sku" value={f.sku} onChange={set('sku')} className={inputCls(errors.sku)} />
            </Field>
            <Field label="Pack size / unit" hint="e.g. 1 kg, 500 ml, 1 pc, Set of 6">
              <input name="unit" value={f.unit} onChange={set('unit')} className={inputCls()} />
            </Field>
          </Section>

          <Section title="2. Price & tax">
            <Field label="Selling price (₹)" required error={errors.price} hint="Price customer pays, incl. GST">
              <input name="price" type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={set('price')} className={inputCls(errors.price)} />
            </Field>
            <Field label="MRP (₹)" required error={errors.mrp} hint={off > 0 ? `Shows as ${off}% OFF` : 'Same as price = no discount badge'}>
              <input name="mrp" type="number" inputMode="decimal" min="0" step="any" value={f.mrp} onChange={set('mrp')} className={inputCls(errors.mrp)} />
            </Field>
            <Field label="GST rate" hint={gstAmount ? `Includes ${inr(gstAmount)} GST` : 'For the GST invoice'}>
              <select name="gst" value={f.gst} onChange={set('gst')} className={inputCls()}>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <Field label="HSN code" error={errors.hsn} hint="Needed on GST invoices, e.g. 8518 for speakers">
              <input name="hsn" inputMode="numeric" value={f.hsn} onChange={set('hsn')} maxLength={8} className={inputCls(errors.hsn)} />
            </Field>
          </Section>

          <Section title="3. Inventory & visibility">
            <Field label="Stock quantity" required error={errors.stock} hint="0 shows “Sold out”; 1–3 shows “Only N left”">
              <input name="stock" type="number" inputMode="numeric" min="0" step="1" value={f.stock} onChange={set('stock')} className={inputCls(errors.stock)} />
            </Field>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <input name="active" type="checkbox" checked={f.active} onChange={set('active')} className="mt-0.5 h-5 w-5 accent-brand-500" />
              <span><span className="font-semibold text-slate-800">Visible in store</span><span className="block text-xs text-slate-500">Untick to hide without deleting</span></span>
            </label>
          </Section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-extrabold text-slate-900">4. Photos</h2>
            <p className="mt-1 text-xs text-slate-500">Square photos on a plain background look best. First photo is shown on product cards.</p>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-700">Main photo <span className="text-red-500">*</span></p>
                <ImagePicker label="main" value={f.image} onChange={(v) => { setF((o) => ({ ...o, image: v })); setErrors((o) => ({ ...o, image: undefined })) }} onRemove={() => setF((o) => ({ ...o, image: '' }))} />
                <input name="image" readOnly value={f.image ? 'set' : ''} className="sr-only" tabIndex={-1} aria-hidden="true" />
              </div>
              {[...f.images, ...(f.images.length < MAX_EXTRA_IMAGES ? [''] : [])].map((src, i) => (
                <div key={i}>
                  <p className="mb-1 text-xs font-semibold text-slate-700">Photo {i + 2}</p>
                  <ImagePicker label="more" value={src}
                    onChange={(v) => setF((o) => ({ ...o, images: [...o.images.slice(0, i), v, ...o.images.slice(i + 1)] }))}
                    onRemove={() => setF((o) => ({ ...o, images: o.images.filter((_, j) => j !== i) }))} />
                </div>
              ))}
            </div>
            {errors.image && <p className="mt-2 text-xs font-semibold text-red-600">{errors.image}</p>}
          </section>

          <Section title="5. Description & search">
            <Field label="Description" className="sm:col-span-2" hint="Material, size, colour, what’s in the box, use cases">
              <textarea name="description" rows={4} value={f.description} onChange={set('description')} maxLength={2000} className={inputCls()} />
            </Field>
            <Field label="Key highlights" className="sm:col-span-2" hint="One per line — shown as bullet points">
              <textarea name="highlights" rows={3} value={f.highlights} onChange={set('highlights')} placeholder={'Bluetooth 5.0\n6 hours battery\n1 year warranty'} className={inputCls()} />
            </Field>
            <Field label="Search keywords" className="sm:col-span-2" hint="Comma separated — extra words customers may search, e.g. gift, party, bluetooth">
              <input name="tags" value={f.tags} onChange={set('tags')} className={inputCls()} />
            </Field>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-[130px] lg:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Live preview</p>
          <div className="pointer-events-none w-[200px]"><ProductCard product={preview} /></div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          {existing && <button type="button" onClick={remove} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>}
          {(saveErr || Object.values(errors).some(Boolean)) && (
            <p role="alert" className="min-w-0 flex-1 truncate text-sm font-semibold text-red-600">{saveErr || 'Please fix the highlighted fields'}</p>
          )}
          <a href="#/admin/products" className="ml-auto rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</a>
          <button disabled={saving} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving…' : existing ? 'Save changes' : 'Add product'}</button>
        </div>
      </div>
    </form>
  )
}
