import re
import unicodedata
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import ValidationError
from pymongo import ASCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from ..auth import optional_admin, require_admin
from ..catalog import CATEGORIES
from ..db import get_db
from ..models import now, product_out
from ..schemas import CategoryOut, ProductCreate, ProductFields, ProductOut, ProductPage, ProductPatch, ProductUpdate

router = APIRouter(tags=["products"])

Sort = Literal["relevance", "price_asc", "price_desc", "discount", "newest"]
AdminStatus = Literal["all", "active", "hidden", "low", "out"]
FIELDS = list(ProductFields.model_fields)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80] or "product"


def _haystack(p: dict) -> str:
    return " ".join(filter(None, [p["name"], p.get("brand"), p.get("sku"), p["_id"], CATEGORIES.get(p["cat"]), *(p.get("tags") or [])])).lower()


STATUS_FILTERS = {
    "all": {},
    "active": {"active": True},
    "hidden": {"active": False},
    "low": {"stock": {"$gte": 1, "$lte": 3}},
    "out": {"stock": {"$lte": 0}},
}


def _query(db: Database, *, q: str, cat: str | None, festival: str | None, in_stock: bool, sort: Sort,
           admin_status: AdminStatus, limit: int, offset: int) -> ProductPage:
    conds = [STATUS_FILTERS[admin_status]]
    if cat:
        conds.append({"cat": cat})
    if festival:
        conds.append({"festival": festival})
    if in_stock:
        conds.append({"stock": {"$gt": 0}})
    cursor = db.products.find({"$and": conds}).sort([("position", ASCENDING), ("created_at", ASCENDING)])
    rows = [product_out(p) for p in cursor]

    # Catalogue is small (hundreds), so word matching across name/brand/SKU/tags/category is done here
    words = q.lower().split()
    if words:
        rows = [p for p in rows if all(w in _haystack(p) for w in words)]
        if sort == "relevance":  # name starts with the query → first
            rows.sort(key=lambda p: (not p["name"].lower().startswith(words[0]), not all(w in p["name"].lower() for w in words)))
    key = {
        "price_asc": lambda p: p["price"],
        "price_desc": lambda p: -p["price"],
        "discount": lambda p: -p["discount"],
        "newest": lambda p: -p["created_at"].timestamp(),
    }.get(sort)
    if key:
        rows.sort(key=key)
    return ProductPage(items=rows[offset:offset + limit], total=len(rows), limit=limit, offset=offset)


def _get(db: Database, product_id: str) -> dict:
    p = db.products.find_one({"_id": product_id})
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return p


def _check_unique(db: Database, *, slug: str | None = None, sku: str | None = None, exclude: str | None = None):
    if slug and slug != exclude and db.products.find_one({"_id": slug}, {"_id": 1}):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Another product already uses the slug '{slug}'")
    if sku and db.products.find_one({"sku": sku, "_id": {"$ne": exclude or ""}}, {"_id": 1}):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Another product already uses SKU '{sku}'")


def _conflict(e: DuplicateKeyError) -> HTTPException:
    field = "SKU" if "sku" in str(e) else "slug"
    return HTTPException(status.HTTP_409_CONFLICT, f"Another product already uses this {field}")


@router.get("/products", response_model=ProductPage, summary="Product list")
def list_products(
    q: str = "",
    cat: str | None = None,
    festival: str | None = None,
    in_stock: bool = False,
    sort: Sort = "relevance",
    status_: AdminStatus = Query("active", alias="status", description="Admin only; customers always get active products"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Database = Depends(get_db),
    is_admin: bool = Depends(optional_admin),
):
    return _query(db, q=q, cat=cat, festival=festival, in_stock=in_stock, sort=sort,
                  admin_status=status_ if is_admin else "active", limit=limit, offset=offset)


@router.get("/search", response_model=ProductPage, summary="Search products")
def search(
    q: str = Query(..., min_length=1, description="Words to match in name, brand, SKU, keywords or category"),
    cat: str | None = None,
    sort: Sort = "relevance",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Database = Depends(get_db),
):
    return _query(db, q=q, cat=cat, festival=None, in_stock=False, sort=sort, admin_status="active", limit=limit, offset=offset)


@router.get("/categories", response_model=list[CategoryOut], summary="Categories with visible product counts")
def categories(db: Database = Depends(get_db)):
    counts = {r["_id"]: r["n"] for r in db.products.aggregate([
        {"$match": {"active": True}}, {"$group": {"_id": "$cat", "n": {"$sum": 1}}},
    ])}
    return [CategoryOut(id=k, name=v, count=counts.get(k, 0)) for k, v in CATEGORIES.items()]


@router.get("/products/{product_id}", response_model=ProductOut, summary="Product details")
def get_product(product_id: str, db: Database = Depends(get_db), is_admin: bool = Depends(optional_admin)):
    p = _get(db, product_id)
    if not p["active"] and not is_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product_out(p)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED, summary="Onboard a product")
def create_product(body: ProductCreate, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    slug = body.id or slugify(body.name)
    if not body.id:  # auto slug: add -2, -3… on clash
        base, n = slug, 2
        while db.products.find_one({"_id": slug}, {"_id": 1}):
            slug, n = f"{base[:76]}-{n}", n + 1
    _check_unique(db, slug=slug, sku=body.sku)
    top = next(db.products.find({}, {"position": 1}).sort("position", ASCENDING).limit(1), {}).get("position", 0)
    t = now()
    p = {"_id": slug, **body.model_dump(exclude={"id"}), "position": top - 1, "created_at": t, "updated_at": t}  # new products show first
    try:
        db.products.insert_one(p)
    except DuplicateKeyError as e:
        raise _conflict(e)
    return product_out(p)


def _apply(db: Database, p: dict, data: dict, new_id: str | None) -> dict:
    _check_unique(db, slug=new_id, sku=data.get("sku"), exclude=p["_id"])
    data = {**data, "updated_at": now()}
    if new_id and new_id != p["_id"]:
        # _id can't change in place: insert under the new slug, drop the old one, repoint cart items
        clone = {**p, **data, "_id": new_id}
        db.products.delete_one({"_id": p["_id"]})  # first, so the unique SKU is free
        try:
            db.products.insert_one(clone)
        except DuplicateKeyError as e:
            db.products.insert_one(p)
            raise _conflict(e)
        db.carts.update_many({"items.product_id": p["_id"]}, {"$set": {"items.$.product_id": new_id}})
        return product_out(clone)
    try:
        db.products.update_one({"_id": p["_id"]}, {"$set": data})
    except DuplicateKeyError as e:
        raise _conflict(e)
    return product_out({**p, **data})


@router.put("/products/{product_id}", response_model=ProductOut, summary="Update a product (full)")
def update_product(product_id: str, body: ProductUpdate, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    p = _get(db, product_id)
    return _apply(db, p, body.model_dump(exclude={"id"}), body.id)


@router.patch("/products/{product_id}", response_model=ProductOut, summary="Update some fields (e.g. stock, active)")
def patch_product(product_id: str, body: ProductPatch, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    p = _get(db, product_id)
    merged = {f: p.get(f) for f in FIELDS} | body.model_dump(exclude_unset=True)
    try:
        data = ProductFields(**merged).model_dump()  # re-run full validation on the merged product
    except ValidationError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, e.errors(include_url=False, include_context=False))
    return _apply(db, p, data, None)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a product")
def delete_product(product_id: str, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    if not db.products.delete_one({"_id": product_id}).deleted_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    db.carts.update_many({"items.product_id": product_id}, {"$pull": {"items": {"product_id": product_id}}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
