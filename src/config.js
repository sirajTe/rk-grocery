export const STORE = {
  name: 'RKeTECH',
  tagline: 'Best Quality, Better Prices',
  promise: 'Smart Solutions. Creative Gifting. Trusted Quality.',
  phone: '+91 85100 14341',
  phoneRaw: '918510014341',
  whatsapp: '+91 85100 69004',
  whatsappRaw: '918510069004',
  email: 'rketech9896@gmail.com',
  address: '83, Daultabad, Sector 103, Near Ravinder General Store, Gurgaon, Haryana 122006',
  mapQuery: 'Daultabad, Sector 103, Gurgaon, Haryana 122006',
  gstin: '06AYQPJ4051N1ZZ',
  hours: 'Open 24 × 7',
  deliveryRadius: '5 km',
  legacySite: 'https://www.rketech.store',
}

export const whatsappLink = (text = '') =>
  `https://wa.me/${STORE.whatsappRaw}${text ? `?text=${encodeURIComponent(text)}` : ''}`

// Category images live in public/img/c (downloaded from the old store CDN)
const cdn = (path) => `/img/c/${path.split('/').pop().replace(/\.[^.]+$/, '')}.webp`

export const CATEGORIES = [
  { id: 'vegetables', name: 'Vegetables', image: '/vegetables.svg' },
  { id: 'smart-lifestyle-gadgets', name: 'Smart Lifestyle Gadgets', image: cdn('7a2cb04a-e786-4d87-8e0c-db54c8f985f9-1785864979076.png') },
  { id: 'speakers-and-headphones', name: 'Speakers & Headphones', image: cdn('cat/530577_cat-1791293243883.png') },
  { id: 'keychains-526056', name: 'Keychains', image: cdn('871b529c-c8fc-42fc-9c51-37ae43808b4d-1785863687182.png') },
  { id: 'return-gift-items', name: 'Return Gifts', image: cdn('66c48919-c2cf-4f8b-ba74-9ac2de93ff01-1785864738065.png') },
  { id: 'festivals-items', name: 'Festival Items', image: cdn('cat/530577_cat-1791282372880.png') },
  { id: 'home-and-kitchen', name: 'Home & Kitchen', image: cdn('cat/530577_cat-1791239372450.jpg') },
  { id: 'bottlesglasscups', name: 'Bottles, Glasses & Sippers', image: cdn('cat/530577_cat-1791272041591.jpg') },
  { id: 'gift-and-bags', name: 'Bags & Clutches', image: cdn('cat/530577_cat-1791261027792.jpg') },
  { id: 'car-accessories', name: 'Car Accessories', image: cdn('cat/530577_cat-1791282324066.png') },
  { id: 'bathroom-items', name: 'Personal Care & Hygiene', image: cdn('cat/530577_cat-1791285917751.jpg') },
  { id: 'stationary', name: 'Stationery', image: cdn('cat/530577_cat-1791292633347.jpg') },
  { id: 'recent-updated-new-items', name: 'New Arrivals', image: cdn('cat/530577_cat-1791290898269.png') },
]

export const FESTIVALS = {
  'diwali-decor-items': 'Diwali',
  navratri: 'Navratri',
  karvachauth: 'Karva Chauth',
  'ganesh-chaturthi': 'Ganesh Chaturthi',
}

export const POLICIES = [
  ['Payment Policy', '/payment-policy'],
  ['Privacy Policy', '/privacy-policy'],
  ['Return & Refund', '/refund-policy'],
  ['Shipping Policy', '/shipping-policy'],
  ['Terms & Conditions', '/tos'],
].map(([label, path]) => ({ label, href: STORE.legacySite + path }))
