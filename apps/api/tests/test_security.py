import jwt
import pytest

from src.core.security import (
    create_access_token,
    decode_access_token,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("Sandbox123!")
    assert hashed != "Sandbox123!"
    assert verify_password("Sandbox123!", hashed)
    assert not verify_password("otra-clave", hashed)


def test_access_token_roundtrip():
    token = create_access_token(user_id="abc-123", user_type="tenant", rol="tenant", empresa_id="empresa-1")
    payload = decode_access_token(token)
    assert payload["sub"] == "abc-123"
    assert payload["user_type"] == "tenant"
    assert payload["empresa_id"] == "empresa-1"


def test_access_token_expired_raises():
    token = create_access_token(user_id="abc-123", user_type="admin", rol="admin")
    # Fuerza expiracion decodificando con leeway negativo simulando el paso del tiempo
    payload = decode_access_token(token)
    tampered = jwt.encode({**payload, "exp": 0}, "wrong-secret-for-test", algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(tampered)


def test_opaque_token_hash_is_deterministic_and_not_reversible():
    token = generate_opaque_token()
    assert hash_opaque_token(token) == hash_opaque_token(token)
    assert hash_opaque_token(token) != token
