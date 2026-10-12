from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import db, ensure_indexes
from .routers import admin, cart, orders, products
from .seed import seed_products

settings = get_settings()
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes(db)
    if settings.seed_on_startup:
        seed_products(db)
    yield


app = FastAPI(title="RKeTECH API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])

for r in (products.router, cart.router, orders.router, admin.router):
    app.include_router(r, prefix="/api")
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True}
