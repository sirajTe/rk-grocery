"""MongoDB document shapes.

products  {_id: slug, name, cat, festival, price, mrp, image, images[], stock, active, brand, sku, unit,
           gst, hsn, description, highlights[], tags[], position, created_at, updated_at}
carts     {_id: uuid, items: [{product_id, qty, added_at}], created_at, updated_at}
orders    {_id: "RK…", created_at, status, completed_at, payment,
           customer: {name, phone, flat, address, landmark}, slot: {from, label},
           items: [{product_id, name, image, price, mrp, qty}], count, total, saved}
Order items are a snapshot of the product at order time, so later edits/deletes don't change past orders.
"""
from datetime import datetime, timezone


def now() -> datetime:
    return datetime.now(timezone.utc)


def discount(p: dict) -> int:
    return round((p["mrp"] - p["price"]) / p["mrp"] * 100) if p["mrp"] > p["price"] else 0


def product_out(p: dict) -> dict:
    """Product document → ProductOut fields."""
    return {**p, "id": p["_id"], "discount": discount(p)}
