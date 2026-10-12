import re
import secrets
import string
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from ..auth import require_admin
from ..db import get_db
from ..models import now
from ..schemas import OrderCreate, OrderOut, OrderPage, OrderStatusIn

router = APIRouter(prefix="/orders", tags=["orders"])

B36 = string.digits + string.ascii_uppercase


def _order_id() -> str:
    n, s = int(time.time() * 1000), ""
    while n:
        n, r = divmod(n, 36)
        s = B36[r] + s
    return f"RK{s}{secrets.choice(B36)}{secrets.choice(B36)}"


def _get(db: Database, order_id: str) -> dict:
    o = db.orders.find_one({"_id": order_id.lstrip("#").upper()})
    if not o:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return o


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED, summary="Place order")
def place_order(body: OrderCreate, db: Database = Depends(get_db)):
    cart = db.carts.find_one({"_id": body.cart_id}) if body.cart_id else None
    pairs = [(i.product_id, i.qty) for i in body.items] if body.items else [(i["product_id"], i["qty"]) for i in (cart or {}).get("items", [])]
    wanted: dict[str, int] = {}
    for pid, qty in pairs:
        wanted[pid] = wanted.get(pid, 0) + qty
    if not wanted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your cart is empty")

    products = {p["_id"]: p for p in db.products.find({"_id": {"$in": list(wanted)}})}
    problems = []
    for pid, qty in wanted.items():
        p = products.get(pid)
        if not p or not p["active"]:
            problems.append({"product_id": pid, "error": "not available"})
        elif p["stock"] < qty:
            problems.append({"product_id": pid, "name": p["name"], "error": "not enough stock", "available": p["stock"]})
    if problems:
        raise HTTPException(status.HTTP_409_CONFLICT, {"message": "Some items are unavailable", "items": problems})

    # Conditional decrement, so two simultaneous orders can't oversell the last unit.
    # No multi-document transaction (needs a replica set), so undo earlier decrements on failure.
    taken: list[tuple[str, int]] = []

    def give_back():
        for pid, qty in taken:
            db.products.update_one({"_id": pid}, {"$inc": {"stock": qty}})

    for pid, qty in wanted.items():
        res = db.products.update_one({"_id": pid, "stock": {"$gte": qty}}, {"$inc": {"stock": -qty}, "$set": {"updated_at": now()}})
        if res.modified_count != 1:
            give_back()
            raise HTTPException(status.HTTP_409_CONFLICT, {"message": "Some items just sold out", "items": [{"product_id": pid, "error": "not enough stock"}]})
        taken.append((pid, qty))

    lines = [{"product_id": pid, "name": products[pid]["name"], "image": products[pid]["image"],
              "price": products[pid]["price"], "mrp": products[pid]["mrp"], "qty": qty} for pid, qty in wanted.items()]
    total = sum(l["price"] * l["qty"] for l in lines)
    c = body.customer
    order = {
        "created_at": now(), "status": "pending", "completed_at": None, "payment": body.payment,
        "customer": {"name": c.name, "phone": c.phone, "flat": c.flat, "address": c.address, "landmark": c.landmark or None},
        "slot": {"from": body.slot.from_, "label": body.slot.label},
        "items": lines, "count": sum(l["qty"] for l in lines), "total": total,
        "saved": sum(l["mrp"] * l["qty"] for l in lines) - total,
    }
    try:
        for attempt in range(5):
            order["_id"] = _order_id()
            try:
                db.orders.insert_one(order)
                break
            except DuplicateKeyError:
                if attempt == 4:
                    raise
    except Exception:
        give_back()
        raise
    if cart:
        db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": [], "updated_at": now()}})
    return OrderOut.of(order)


PENDING = {"$eq": ["$status", "pending"]}


@router.get("", response_model=OrderPage, summary="Order list (admin) — nearest delivery slot first")
def list_orders(
    q: str = Query("", description="Order ID, customer name, phone, address or product name"),
    status_: Literal["all", "pending", "completed"] = Query("all", alias="status"),
    payment: Literal["all", "cod", "whatsapp"] = "all",
    sort: Literal["slot", "newest"] = Query("slot", description="slot: pending orders by delivery time (overdue first), then completed; newest: by order time"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Database = Depends(get_db),
    _: str = Depends(require_admin),
):
    conds = []
    if status_ != "all":
        conds.append({"status": status_})
    if payment != "all":
        conds.append({"payment": payment})
    for w in q.lower().lstrip("#").split():
        rx = {"$regex": re.escape(w), "$options": "i"}
        conds.append({"$or": [{f: rx} for f in (
            "_id", "customer.name", "customer.phone", "customer.flat", "customer.address", "customer.landmark", "items.name",
        )]})
    match = {"$and": conds} if conds else {}

    if sort == "slot":
        # pending first, by slot (overdue → soonest); then completed, most recently completed first
        order_by = [
            {"$addFields": {"_rank": {"$cond": [PENDING, 0, 1]}, "_slot": {"$cond": [PENDING, "$slot.from", None]}}},
            {"$sort": {"_rank": 1, "_slot": 1, "completed_at": -1, "created_at": -1}},
        ]
    else:
        order_by = [{"$sort": {"created_at": -1}}]
    rows = db.orders.aggregate([{"$match": match}, *order_by, {"$skip": offset}, {"$limit": limit}])
    stats = next(db.orders.aggregate([{"$match": match}, {"$group": {
        "_id": None, "total": {"$sum": 1}, "pending": {"$sum": {"$cond": [PENDING, 1, 0]}}, "revenue": {"$sum": "$total"},
    }}]), {"total": 0, "pending": 0, "revenue": 0})
    return OrderPage(items=[OrderOut.of(o) for o in rows], total=stats["total"], pending=stats["pending"],
                     completed=stats["total"] - stats["pending"], revenue=stats["revenue"])


@router.get("/{order_id}", response_model=OrderOut, summary="Order details (admin)")
def get_order(order_id: str, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    return OrderOut.of(_get(db, order_id))


@router.patch("/{order_id}/status", response_model=OrderOut, summary="Set order status (admin)")
def set_status(order_id: str, body: OrderStatusIn, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    o = db.orders.find_one_and_update(
        {"_id": order_id.lstrip("#").upper()},
        {"$set": {"status": body.status, "completed_at": now() if body.status == "completed" else None}},
        return_document=ReturnDocument.AFTER,
    )
    if not o:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return OrderOut.of(o)


@router.post("/{order_id}/complete", response_model=OrderOut, summary="Mark order complete (admin)")
def complete(order_id: str, db: Database = Depends(get_db), _: str = Depends(require_admin)):
    return set_status(order_id, OrderStatusIn(status="completed"), db, _)
