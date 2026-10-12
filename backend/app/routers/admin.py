import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from ..auth import check_credentials, make_token, require_admin
from ..config import Settings, get_settings
from ..schemas import LoginIn, TokenOut

router = APIRouter(prefix="/admin", tags=["admin"])

IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif"}


@router.post("/login", response_model=TokenOut, summary="Admin login (email + password → bearer token)")
def login(body: LoginIn, s: Settings = Depends(get_settings)):
    if not check_credentials(body.email, body.password, s):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    token, exp = make_token(s.admin_email.strip().lower(), s)
    return TokenOut(access_token=token, expires_at=exp, email=s.admin_email.strip().lower())


@router.get("/me", summary="Check the admin token")
def me(email: str = Depends(require_admin)):
    return {"email": email}


@router.post("/uploads", status_code=status.HTTP_201_CREATED, summary="Upload a product photo")
async def upload(file: UploadFile, s: Settings = Depends(get_settings), _: str = Depends(require_admin)):
    ext = IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPG, PNG, WebP, GIF or AVIF image")
    data = await file.read(s.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Image must be under {s.max_upload_mb} MB")
    name = f"{secrets.token_hex(12)}{ext}"
    (Path(s.upload_dir) / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}  # relative to the API host
