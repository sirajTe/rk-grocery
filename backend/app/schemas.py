import re
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, PlainSerializer, field_validator, model_validator

from .catalog import CATEGORIES, FESTIVALS, GST_RATES


def _utc(d: datetime) -> datetime:
    # Everything is stored in UTC; treat naive datetimes as UTC
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)


UTCDateTime = Annotated[datetime, AfterValidator(_utc), PlainSerializer(lambda d: _utc(d).isoformat().replace("+00:00", "Z"))]
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")


def _clean_list(v: list[str]) -> list[str]:
    seen, out = set(), []
    for s in (x.strip() for x in v):
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


# ---------- Products ----------

class ProductFields(BaseModel):
    """Everything needed to onboard a product. Required: name, cat, price, mrp, stock, image."""

    name: str = Field(min_length=1, max_length=120)
    cat: str
    festival: str | None = None
    price: float = Field(gt=0, description="Selling price incl. GST")
    mrp: float = Field(gt=0)
    image: str = Field(min_length=1, description="Main photo URL")
    images: list[str] = Field(default_factory=list, max_length=4, description="Up to 4 more photos")
    stock: int = Field(ge=0)
    active: bool = True
    brand: str | None = Field(None, max_length=80)
    sku: str | None = Field(None, max_length=40)
    unit: str | None = Field(None, max_length=40, description="Pack size, e.g. 1 kg, Set of 6")
    gst: int = 18
    hsn: str | None = None
    description: str | None = Field(None, max_length=2000)
    highlights: list[str] = Field(default_factory=list, max_length=12)
    tags: list[str] = Field(default_factory=list, max_length=30)

    @field_validator("name", "brand", "unit", "description", "hsn", "festival", "sku")
    @classmethod
    def strip(cls, v):
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("sku")
    @classmethod
    def upper_sku(cls, v):
        return v.upper() if v else v

    @field_validator("cat")
    @classmethod
    def known_cat(cls, v):
        if v not in CATEGORIES:
            raise ValueError(f"Unknown category. Use one of: {', '.join(CATEGORIES)}")
        return v

    @field_validator("festival")
    @classmethod
    def known_festival(cls, v):
        if v and v not in FESTIVALS:
            raise ValueError(f"Unknown festival. Use one of: {', '.join(FESTIVALS)}")
        return v

    @field_validator("gst")
    @classmethod
    def gst_rate(cls, v):
        if v not in GST_RATES:
            raise ValueError(f"GST must be one of {GST_RATES}")
        return v

    @field_validator("hsn")
    @classmethod
    def hsn_code(cls, v):
        if v and not re.fullmatch(r"\d{4,8}", v):
            raise ValueError("HSN code is 4–8 digits")
        return v

    @field_validator("images", "highlights")
    @classmethod
    def clean(cls, v):
        return _clean_list(v)

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v):
        return _clean_list([t.lower() for t in v])

    @model_validator(mode="after")
    def mrp_not_below_price(self):
        if self.mrp < self.price:
            raise ValueError("MRP can't be lower than the selling price")
        return self


class ProductCreate(ProductFields):
    id: str | None = Field(None, max_length=80, description="URL slug; generated from the name if omitted")

    @field_validator("id")
    @classmethod
    def slug(cls, v):
        if v is not None and not SLUG_RE.match(v):
            raise ValueError("Use only lowercase letters, numbers and single dashes")
        return v


class ProductUpdate(ProductCreate):
    """Full replace (PUT). `id` may change the slug."""


class ProductPatch(BaseModel):
    """Partial update, e.g. {"stock": 10} or {"active": false}."""

    model_config = ConfigDict(extra="forbid")
    name: str | None = None
    cat: str | None = None
    festival: str | None = None
    price: float | None = None
    mrp: float | None = None
    image: str | None = None
    images: list[str] | None = None
    stock: int | None = None
    active: bool | None = None
    brand: str | None = None
    sku: str | None = None
    unit: str | None = None
    gst: int | None = None
    hsn: str | None = None
    description: str | None = None
    highlights: list[str] | None = None
    tags: list[str] | None = None


class ProductOut(ProductFields):
    model_config = ConfigDict(from_attributes=True)
    id: str
    discount: int
    created_at: UTCDateTime
    updated_at: UTCDateTime


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    limit: int
    offset: int


class CategoryOut(BaseModel):
    id: str
    name: str
    count: int


# ---------- Cart ----------

class CartItemIn(BaseModel):
    product_id: str
    qty: int = Field(1, ge=1, le=99)


class CartQty(BaseModel):
    qty: int = Field(ge=0, le=99, description="0 removes the item")


class CartLine(BaseModel):
    product_id: str
    name: str
    image: str
    price: float
    mrp: float
    qty: int
    stock: int
    line_total: float


class CartOut(BaseModel):
    id: str
    items: list[CartLine]
    count: int
    total: float
    mrp_total: float
    saved: float
    notices: list[str] = Field(default_factory=list, description="e.g. items removed because they went out of stock")


# ---------- Orders ----------

class Customer(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str
    flat: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=1, max_length=500)
    landmark: str | None = Field(None, max_length=120)

    @field_validator("name", "flat", "address", "landmark")
    @classmethod
    def strip(cls, v):
        return v.strip() if v else v

    @field_validator("phone")
    @classmethod
    def phone_ok(cls, v):
        v = re.sub(r"\D", "", v)
        if len(v) > 10 and v.startswith("91"):
            v = v[2:]
        elif len(v) > 10 and v.startswith("0"):
            v = v[1:]
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v


class Slot(BaseModel):
    from_: UTCDateTime = Field(alias="from", description="Slot start (ISO datetime)")
    label: str = Field(min_length=1, max_length=60, description='e.g. "Today, 5 PM – 6 PM"')
    model_config = ConfigDict(populate_by_name=True)


class OrderCreate(BaseModel):
    """Place an order from a server cart (`cart_id`) or an explicit `items` list. Prices are always taken from the DB."""

    cart_id: str | None = None
    items: list[CartItemIn] | None = None
    customer: Customer
    slot: Slot
    payment: Literal["cod", "whatsapp"] = "cod"

    @model_validator(mode="after")
    def need_items(self):
        if not self.cart_id and not self.items:
            raise ValueError("Send cart_id or items")
        return self


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: str
    name: str
    image: str
    price: float
    mrp: float
    qty: int


class OrderOut(BaseModel):
    id: str
    created_at: UTCDateTime
    status: Literal["pending", "completed"]
    completed_at: UTCDateTime | None
    payment: str
    customer: Customer
    slot: Slot
    items: list[OrderItemOut]
    count: int
    total: float
    saved: float

    @classmethod
    def of(cls, o: dict) -> "OrderOut":
        return cls(
            id=o["_id"], created_at=o["created_at"], status=o["status"], completed_at=o.get("completed_at"), payment=o["payment"],
            customer=Customer.model_construct(**o["customer"]),
            slot=Slot.model_construct(from_=_utc(o["slot"]["from"]), label=o["slot"]["label"]),
            items=[OrderItemOut.model_validate(i) for i in o["items"]], count=o["count"], total=o["total"], saved=o["saved"],
        )


class OrderPage(BaseModel):
    items: list[OrderOut]
    total: int
    pending: int
    completed: int
    revenue: float


class OrderStatusIn(BaseModel):
    status: Literal["pending", "completed"]


# ---------- Auth ----------

class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: UTCDateTime
    email: str
