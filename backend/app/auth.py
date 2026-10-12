import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)
ALGO = "HS256"


def check_credentials(email: str, password: str, s: Settings) -> bool:
    email_ok = hmac.compare_digest(email.strip().lower().encode(), s.admin_email.strip().lower().encode())
    pass_ok = hmac.compare_digest(password.encode(), s.admin_password.encode())
    return email_ok and pass_ok


def make_token(email: str, s: Settings) -> tuple[str, datetime]:
    exp = datetime.now(timezone.utc) + timedelta(hours=s.token_hours)
    return jwt.encode({"sub": email, "role": "admin", "exp": exp}, s.secret_key, algorithm=ALGO), exp


def _decode(creds: HTTPAuthorizationCredentials | None, s: Settings) -> dict | None:
    if not creds:
        return None
    try:
        claims = jwt.decode(creds.credentials, s.secret_key, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None
    return claims if claims.get("role") == "admin" else None


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(bearer), s: Settings = Depends(get_settings)) -> str:
    claims = _decode(creds, s)
    if not claims:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Admin login required", headers={"WWW-Authenticate": "Bearer"})
    return claims["sub"]


def optional_admin(creds: HTTPAuthorizationCredentials | None = Depends(bearer), s: Settings = Depends(get_settings)) -> bool:
    return _decode(creds, s) is not None
