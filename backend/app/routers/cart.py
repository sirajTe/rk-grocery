import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from pymongo.database import Database

from ..db import get_db
from ..models import now
from ..schemas import CartItemIn, CartLine, CartOut, CartQty

router = APIRouter(prefix="/cart", tags=["cart"])

# Carts are anonymous: the browser keeps a UUID and the cart is created on first add.
CartId = Path(..., pattern=r"^[0-9a-fA-F-]{36}$", description="Cart UUID kept by the browser")


def _items(db: Database, cart_id: str) -> list[dict] | None:
    cart = db.carts.find_one({"_id": cart_id}, {"items": 1})
    return cart["items"] if cart else None


def _save(db: Database, cart_id: str, items: list[dict]) -> None:
    t = now()
    db.carts.update_one({"_id": cart_id}, {"$set": {"items": items, "updated_at": t}, "$setOnInsert": {"created_at": t}}, upsert=True)


def cart_out(db: Database, items: list[dict] | None, cart_id: str) -> CartOut:
    """Cart details. Drops hidden/deleted items and caps quantities at current stock."""
    items = items or []
    products = {p["_id"]: p for p in db.products.find({"_id": {"$in": [i["product_id"] for i in items]}})}
    keep, lines, notices = [], [], []
    for it in items:
        p = products.get(it["product_id"])
        if not p or not p["active"] or p["stock"] <= 0:
            notices.append(f"{p['name'] if p else 'An item'} is no longer available and was removed")
            continue
        if it["qty"] > p["stock"]:
            notices.append(f"Only {p['stock']} of {p['name']} left — quantity updated")
            it = {**it, "qty": p["stock"]}
        keep.append(it)
        lines.append(CartLine(product_id=p["_id"], name=p["name"], image=p["image"], price=p["price"], mrp=p["mrp"],
                              qty=it["qty"], stock=p["stock"], line_total=p["price"] * it["qty"]))
    if notices:
        _save(db, cart_id, keep)
    total = sum(l.line_total for l in lines)
    mrp_total = sum(l.mrp * l.qty for l in lines)
    return CartOut(id=cart_id, items=lines, count=sum(l.qty for l in lines), total=total,
                   mrp_total=mrp_total, saved=mrp_total - total, notices=notices)


def _product(db: Database, product_id: str) -> dict:
    p = db.products.find_one({"_id": product_id})
    if not p or not p["active"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    if p["stock"] <= 0:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{p['name']} is out of stock")
    return p


def _set_qty(items: list[dict], p: dict, qty: int) -> None:
    item = next((i for i in items if i["product_id"] == p["_id"]), None)
    if item:
        item["qty"] = qty
    else:
        items.append({"product_id": p["_id"], "qty": qty, "added_at": now()})


@router.post("", response_model=CartOut, status_code=status.HTTP_201_CREATED, summary="Create an empty cart")
def create_cart(db: Database = Depends(get_db)):
    cart_id = str(uuid.uuid4())
    _save(db, cart_id, [])
    return cart_out(db, [], cart_id)


@router.get("/{cart_id}", response_model=CartOut, summary="Cart details")
def get_cart(cart_id: str = CartId, db: Database = Depends(get_db)):
    return cart_out(db, _items(db, cart_id), cart_id)


@router.post("/{cart_id}/items", response_model=CartOut, summary="Add to cart (adds to existing quantity)")
def add_item(body: CartItemIn, cart_id: str = CartId, db: Database = Depends(get_db)):
    p = _product(db, body.product_id)
    items = _items(db, cart_id) or []
    have = next((i["qty"] for i in items if i["product_id"] == p["_id"]), 0)
    _set_qty(items, p, min(have + body.qty, p["stock"]))
    _save(db, cart_id, items)
    return cart_out(db, items, cart_id)


@router.put("/{cart_id}/items/{product_id}", response_model=CartOut, summary="Set quantity (0 removes)")
def set_item(product_id: str, body: CartQty, cart_id: str = CartId, db: Database = Depends(get_db)):
    items = _items(db, cart_id) or []
    if body.qty == 0:
        items = [i for i in items if i["product_id"] != product_id]
    else:
        p = _product(db, product_id)
        _set_qty(items, p, min(body.qty, p["stock"]))
    _save(db, cart_id, items)
    return cart_out(db, items, cart_id)


@router.delete("/{cart_id}/items/{product_id}", response_model=CartOut, summary="Remove an item")
def remove_item(product_id: str, cart_id: str = CartId, db: Database = Depends(get_db)):
    items = _items(db, cart_id)
    if items is not None:
        items = [i for i in items if i["product_id"] != product_id]
        _save(db, cart_id, items)
    return cart_out(db, items, cart_id)


@router.delete("/{cart_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Empty the cart")
def clear_cart(cart_id: str = CartId, db: Database = Depends(get_db)):
    db.carts.update_one({"_id": cart_id}, {"$set": {"items": [], "updated_at": now()}})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
