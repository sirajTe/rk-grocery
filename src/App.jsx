import { useEffect } from 'react'
import Admin from './admin/Admin'
import CartBar from './components/CartBar'
import CartPanel from './components/CartPanel'
import Footer from './components/Footer'
import Header from './components/Header'
import Home from './components/Home'
import { CategoryPage, SearchPage } from './components/Listing'
import ProductPage from './components/ProductPage'
import { CartContext, go, useCartState, useHashRoute } from './store'

export default function App() {
  const route = useHashRoute()
  const cart = useCartState()

  useEffect(() => { if (route === '/cart') cart.setOpen(true) }, [route])
  // The old public order list now lives behind the admin login
  useEffect(() => { if (route === '/all-orders') go('/admin/all-orders') }, [route])

  const [path, qs] = route.split('?')
  const [, kind, id] = path.split('/')
  const admin = kind === 'admin' || kind === 'all-orders'

  if (admin) return (
    <CartContext.Provider value={cart}>
      <Header admin />
      <main className="min-h-[70vh]"><Admin route={kind === 'admin' ? path : '/admin/all-orders'} /></main>
    </CartContext.Provider>
  )

  const page =
    kind === 'c' ? <CategoryPage id={id} /> :
    kind === 'p' ? <ProductPage id={id} /> :
    kind === 'search' ? <SearchPage q={decodeURIComponent(new URLSearchParams(qs).get('q') ?? '')} /> :
    <Home />

  return (
    <CartContext.Provider value={cart}>
      <Header route={route} />
      <main className="min-h-[70vh]">{page}</main>
      {kind !== 'c' && <Footer />}
      <CartBar />
      <CartPanel />
    </CartContext.Provider>
  )
}
