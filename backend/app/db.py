from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database

from .config import get_settings

_s = get_settings()
# tz_aware: datetimes come back as UTC-aware instead of naive
client: MongoClient = MongoClient(_s.mongodb_url, tz_aware=True)
db: Database = client[_s.mongodb_db]


def get_db() -> Database:
    return db


def ensure_indexes(d: Database) -> None:
    # SKU is optional, so uniqueness only applies to products that have one
    d.products.create_index("sku", unique=True, partialFilterExpression={"sku": {"$type": "string"}})
    d.products.create_index([("active", ASCENDING), ("cat", ASCENDING), ("position", ASCENDING)])
    d.products.create_index([("position", ASCENDING), ("created_at", ASCENDING)])
    d.carts.create_index("items.product_id")
    d.orders.create_index([("status", ASCENDING), ("slot.from", ASCENDING)])
    d.orders.create_index([("created_at", DESCENDING)])
    d.orders.create_index("customer.phone")
