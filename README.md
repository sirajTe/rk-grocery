# RKeTECH — website redesign

A modern, mobile-first storefront redesign for [rketech.store](https://www.rketech.store) (Sector 103, Gurgaon).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/ (Vercel-ready, see vercel.json)
```

## What's inside
- **Real catalogue**: the 79 products (names, MRP, sale price, stock, photos) pulled from the live store in Oct 2026 → `src/data/products.js`
- **Store details** (phone, email, address, GSTIN, delivery radius) → `src/config.js`
- Sections: hero, trust bar, 12 categories, searchable/filterable/sortable shop, quick view, festive store (Diwali / Navratri / Karva Chauth / Ganesh Chaturthi), custom & corporate gifting enquiry, about + how-to-order, contact with map
- **Cart → checkout**: the cart syncs to the API; orders are saved on the server (cash on delivery), and the WhatsApp option also sends the itemised order, total, name and address to +91 85100 14341
- Product images load from the existing store CDN. Policy links currently point to the live site's policy pages.

## Backend (FastAPI + MongoDB): `backend/`
Needs a MongoDB server: local (`brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (put its `mongodb+srv://…` URL in `MONGODB_URL`).
```bash
cd backend
python3.11 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env          # set MONGODB_URL, ADMIN_PASSWORD and SECRET_KEY
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/pytest              # API tests (in-memory mongomock; TEST_MONGODB_URL=… to use a real server)
```
Run `npm run dev` alongside it. Vite proxies `/api` and `/uploads` to port 8000. Interactive API docs: http://localhost:8000/docs.
On first start the indexes are created and an empty `products` collection is seeded with the products from `src/data/products.js`. Collections: `products` (`_id` = URL slug), `carts` (`_id` = browser UUID, items embedded), `orders` (`_id` = order number, customer/slot/items embedded).
In production set `VITE_API_URL` (frontend) to the deployed API and add the site to `CORS_ORIGINS` (backend).

| Method & path | Who | What |
|---|---|---|
| `POST /api/admin/login` | public | Email + password → bearer token |
| `GET /api/products` | public | Product list (`q`, `cat`, `festival`, `in_stock`, `sort`, `limit`, `offset`; admins also `status=all/hidden/low/out`) |
| `GET /api/products/{id}` | public | Product details |
| `GET /api/categories` | public | Categories with product counts |
| `GET /api/search?q=` | public | Search name, brand, SKU, keywords, category |
| `POST /api/products` | admin | Onboard a product |
| `PUT` / `PATCH /api/products/{id}` | admin | Update all fields / some fields (e.g. `{"stock": 10}`) |
| `DELETE /api/products/{id}` | admin | Delete a product |
| `POST /api/admin/uploads` | admin | Upload a product photo |
| `POST /api/cart` | public | Create a cart |
| `GET /api/cart/{cart_id}` | public | Cart details (totals, savings; drops sold-out items) |
| `POST /api/cart/{cart_id}/items` | public | Add to cart |
| `PUT` / `DELETE /api/cart/{cart_id}/items/{product_id}` | public | Set quantity / remove item |
| `DELETE /api/cart/{cart_id}` | public | Empty cart |
| `POST /api/orders` | public | Place order (prices from DB, stock checked and reduced) |
| `GET /api/orders` | admin | Orders: pending by nearest delivery slot (overdue on top), then completed. Filters `q`, `status`, `payment`, `sort=newest` |
| `GET /api/orders/{id}` | admin | Order details |
| `POST /api/orders/{id}/complete`, `PATCH /api/orders/{id}/status` | admin | Mark complete / set `pending` or `completed` |

## Admin (`/admin`)
Business-owner area. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`. The admin header shows only the logo.

| Route | What it does |
|---|---|
| `/admin`, `/admin/all-orders` | Orders: To deliver / Completed / All tabs, search, payment filter, print, **Mark complete** (with undo) |
| `/admin/products` | Catalogue: search, filter by category / visible / hidden / low stock / out of stock; hide, edit, delete |
| `/admin/products/new` | Add a product |
| `/admin/products/<slug>` | Edit a product |

**Product fields**: name\*, URL slug\*, category\*, festival, brand, SKU, pack size/unit, selling price\*, MRP\*, GST rate, HSN code, stock\*, visible in store, main photo\* + up to 4 more (upload or URL), description, key highlights, search keywords.
