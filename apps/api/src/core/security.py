import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from src.core.config import get_settings

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_MINUTES = 30
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(*, user_id: str, user_type: str, rol: str, empresa_id: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "user_type": user_type,
        "rol": rol,
        "empresa_id": empresa_id,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=[JWT_ALGORITHM])


def generate_opaque_token() -> str:
    """Token opaco (no JWT) para refresh/reset. Se guarda hasheado, nunca en claro."""
    return secrets.token_urlsafe(48)


def generate_api_key() -> tuple[str, str, str]:
    """Genera una API key para integraciones externas. Devuelve
    (key_en_claro, prefijo, hash) -- el prefijo queda visible siempre en
    listados para identificar la key sin poder reconstruirla; el hash
    (mismo sha256 de hash_opaque_token) es lo unico que se persiste."""
    key_en_claro = f"ingf_{secrets.token_urlsafe(32)}"
    prefijo = key_en_claro[:12]
    return key_en_claro, prefijo, hash_opaque_token(key_en_claro)


def hash_opaque_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)


def reset_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)


_TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"


def generate_temp_password(length: int = 12) -> str:
    """Password temporal tipeable a mano (sin 0/O/1/l/I, que se confunden al
    copiarla de un correo) -- a diferencia de generate_opaque_token, que es
    para links, no para que una persona la escriba."""
    return "".join(secrets.choice(_TEMP_PASSWORD_ALPHABET) for _ in range(length))
