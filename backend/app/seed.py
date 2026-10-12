import json
from pathlib import Path

from pymongo.database import Database

from .models import now

SEED = Path(__file__).with_name("seed_products.json")


def seed_products(db: Database) -> int:
    """Load the original catalogue into an empty database."""
    if db.products.estimated_document_count():
        return 0
    rows = json.loads(SEED.read_text())
    t = now()
    db.products.insert_many([{
        "_id": p["id"], "name": p["name"], "cat": p["cat"], "festival": p.get("festival"),
        "price": p["price"], "mrp": max(p["mrp"], p["price"]), "image": p["image"],
        "images": [x for x in [p.get("image2")] if x and x != p["image"]],
        "stock": p.get("stock", 0), "active": True, "brand": None, "sku": None, "unit": None, "gst": 18, "hsn": None,
        "description": None, "highlights": [], "tags": [], "position": i, "created_at": t, "updated_at": t,
    } for i, p in enumerate(rows)])
    return len(rows)
