import uuid
from datetime import datetime, timedelta, timezone

NEW = {
    "name": "Test Party Speaker XL", "cat": "speakers-and-headphones", "price": 999, "mrp": 1999, "stock": 3,
    "image": "/img/p/x.webp", "images": ["/a.webp", "/a.webp", " "], "brand": "Boom", "sku": "sku-t1", "unit": "1 pc",
    "gst": 18, "hsn": "8518", "description": "Loud", "highlights": ["Bluetooth", "6h battery"], "tags": ["Karaoke", "party"],
}
CUSTOMER = {"name": "Asha", "phone": "+91 98765 43210", "flat": "12", "address": "Sector 103", "landmark": ""}


def slot(hours):
    t = datetime.now(timezone.utc) + timedelta(hours=hours)
    return {"from": t.isoformat(), "label": f"in {hours}h"}


def test_login(client):
    assert client.post("/api/admin/login", json={"email": "rketech9896@gmail.com", "password": "nope"}).status_code == 401


def test_seeded_list_and_categories(client):
    r = client.get("/api/products")
    assert r.status_code == 200 and r.json()["total"] == 89
    cats = {c["id"]: c["count"] for c in client.get("/api/categories").json()}
    assert cats["vegetables"] > 0


def test_admin_required(client):
    assert client.post("/api/products", json=NEW).status_code == 401
    assert client.get("/api/orders").status_code == 401
    assert client.delete("/api/products/veg-onion").status_code == 401


def test_onboard_validation(client, admin):
    r = client.post("/api/products", json={**NEW, "mrp": 10}, headers=admin)
    assert r.status_code == 422 and "MRP" in r.text
    r = client.post("/api/products", json={**NEW, "cat": "nope", "gst": 7, "hsn": "12"}, headers=admin)
    assert r.status_code == 422


def test_onboard_update_delete(client, admin):
    r = client.post("/api/products", json=NEW, headers=admin)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["id"] == "test-party-speaker-xl" and p["sku"] == "SKU-T1" and p["images"] == ["/a.webp"] and p["discount"] == 50
    assert p["tags"] == ["karaoke", "party"]
    assert client.get("/api/products").json()["items"][0]["id"] == p["id"]  # new first
    # same name → unique slug; same SKU → conflict
    assert client.post("/api/products", json={**NEW, "sku": None}, headers=admin).json()["id"] == "test-party-speaker-xl-2"
    assert client.post("/api/products", json=NEW, headers=admin).status_code == 409

    assert client.patch(f"/api/products/{p['id']}", json={"stock": 7, "active": False}, headers=admin).json()["stock"] == 7
    assert client.get(f"/api/products/{p['id']}").status_code == 404  # hidden from customers
    assert client.get(f"/api/products/{p['id']}", headers=admin).status_code == 200
    assert client.get("/api/products?status=hidden", headers=admin).json()["total"] == 1
    assert client.patch(f"/api/products/{p['id']}", json={"price": 5000}, headers=admin).status_code == 422

    r = client.put(f"/api/products/{p['id']}", json={**NEW, "id": "renamed-speaker", "active": True}, headers=admin)
    assert r.status_code == 200 and r.json()["id"] == "renamed-speaker"
    assert client.get(f"/api/products/{p['id']}").status_code == 404
    assert client.delete("/api/products/test-party-speaker-xl-2", headers=admin).status_code == 204
    assert client.delete("/api/products/test-party-speaker-xl-2", headers=admin).status_code == 404


def test_search(client):
    r = client.get("/api/search", params={"q": "karaoke"}).json()
    assert "renamed-speaker" in [p["id"] for p in r["items"]]  # via tag
    assert client.get("/api/search", params={"q": "boom speaker"}).json()["total"] >= 1  # brand + name
    assert client.get("/api/search", params={"q": "zzzz"}).json()["total"] == 0
    r = client.get("/api/products", params={"q": "onion"}).json()
    assert r["items"][0]["id"] == "veg-onion"


def test_cart_and_order(client, admin):
    cid = str(uuid.uuid4())
    assert client.get(f"/api/cart/{cid}").json()["count"] == 0
    r = client.post(f"/api/cart/{cid}/items", json={"product_id": "renamed-speaker", "qty": 2}).json()
    assert r["count"] == 2 and r["total"] == 1998 and r["saved"] == 2000
    r = client.post(f"/api/cart/{cid}/items", json={"product_id": "renamed-speaker", "qty": 5}).json()
    assert r["count"] == 3  # capped at stock
    r = client.put(f"/api/cart/{cid}/items/veg-onion", json={"qty": 2}).json()
    assert r["count"] == 5
    r = client.delete(f"/api/cart/{cid}/items/veg-onion").json()
    assert r["count"] == 3
    assert client.post(f"/api/cart/{cid}/items", json={"product_id": "nope"}).status_code == 404
    assert client.get("/api/cart/not-a-uuid").status_code == 422

    bad = client.post("/api/orders", json={"cart_id": cid, "customer": {**CUSTOMER, "phone": "12345"}, "slot": slot(2)})
    assert bad.status_code == 422
    r = client.post("/api/orders", json={"cart_id": cid, "customer": CUSTOMER, "slot": slot(5), "payment": "cod"})
    assert r.status_code == 201, r.text
    o = r.json()
    assert o["total"] == 2997 and o["status"] == "pending" and o["customer"]["phone"] == "9876543210"
    assert client.get(f"/api/cart/{cid}").json()["count"] == 0  # cart cleared
    assert client.get("/api/products/renamed-speaker").json()["stock"] == 0  # stock decremented

    # oversell → 409, nothing changes
    r = client.post("/api/orders", json={"items": [{"product_id": "renamed-speaker", "qty": 1}], "customer": CUSTOMER, "slot": slot(1)})
    assert r.status_code == 409
    assert client.post("/api/orders", json={"items": [], "customer": CUSTOMER, "slot": slot(1)}).status_code == 422


def test_order_list_sorting_search_complete(client, admin):
    ids = {}
    for h, name in [(8, "Late Ravi"), (1, "Soon Meena"), (-1, "Overdue Kabir")]:
        r = client.post("/api/orders", json={"items": [{"product_id": "veg-tomato", "qty": 1}], "customer": {**CUSTOMER, "name": name}, "slot": slot(h), "payment": "whatsapp"})
        ids[name] = r.json()["id"]
    names = [o["customer"]["name"] for o in client.get("/api/orders", headers=admin).json()["items"]]
    assert names[:4] == ["Overdue Kabir", "Soon Meena", "Asha", "Late Ravi"]  # nearest slot first

    r = client.post(f"/api/orders/{ids['Soon Meena']}/complete", headers=admin).json()
    assert r["status"] == "completed" and r["completed_at"]
    page = client.get("/api/orders", headers=admin).json()
    assert page["items"][-1]["customer"]["name"] == "Soon Meena" and page["completed"] == 1 and page["pending"] == 3
    assert client.patch(f"/api/orders/{ids['Soon Meena']}/status", json={"status": "pending"}, headers=admin).json()["completed_at"] is None

    assert client.get("/api/orders", params={"q": "kabir"}, headers=admin).json()["total"] == 1
    assert client.get("/api/orders", params={"q": "tamatar"}, headers=admin).json()["total"] == 3  # product name
    assert client.get("/api/orders", params={"q": ids["Late Ravi"].lower()}, headers=admin).json()["total"] == 1
    assert client.get("/api/orders", params={"payment": "cod"}, headers=admin).json()["total"] == 1
    assert client.get(f"/api/orders/{ids['Late Ravi']}", headers=admin).json()["customer"]["name"] == "Late Ravi"


def test_upload(client, admin):
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000100e221bc330000000049454e44ae426082")
    r = client.post("/api/admin/uploads", files={"file": ("a.png", png, "image/png")}, headers=admin)
    assert r.status_code == 201 and r.json()["url"].endswith(".png")
    assert client.get(r.json()["url"]).status_code == 200
    assert client.post("/api/admin/uploads", files={"file": ("a.txt", b"hi", "text/plain")}, headers=admin).status_code == 415
