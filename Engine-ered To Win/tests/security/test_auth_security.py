import pytest
import jwt
import time
from fastapi.testclient import TestClient
from live_telemetry_server import app
from src.security.auth import SUPABASE_JWT_SECRET, ALGORITHM

client = TestClient(app)

def create_token(user_id: str = "test_u1", role: str = "viewer", exp_seconds: int = 3600) -> str:
    payload = {
        "sub": user_id,
        "email": f"{user_id}@aerotwin.io",
        "role": role,
        "aud": "authenticated",
        "exp": int(time.time()) + exp_seconds
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)

def test_missing_auth_header_fallback_or_rejection():
    """Verify endpoint behavior with missing auth headers."""
    resp = client.get("/api/simulation/status")
    # Anonymous mode returns 200 with viewer context or 401 if strict auth enforced
    assert resp.status_code in (200, 401)

def test_malformed_jwt_token_rejected():
    """Verify invalid JWT token returns 401 Unauthorized."""
    resp = client.get("/api/simulation/status", headers={"Authorization": "Bearer malformed.token.here"})
    assert resp.status_code == 401
    assert "Invalid or unverified" in resp.json().get("detail", "")

def test_forged_jwt_secret_rejected():
    """Verify JWT signed with wrong secret is rejected."""
    fake_payload = {"sub": "attacker", "role": "admin", "aud": "authenticated"}
    forged_token = jwt.encode(fake_payload, "wrong_secret_key_123", algorithm="HS256")
    resp = client.get("/api/simulation/status", headers={"Authorization": f"Bearer {forged_token}"})
    assert resp.status_code == 401

def test_expired_jwt_token_rejected():
    """Verify expired JWT token returns 401 Unauthorized."""
    expired_token = create_token(user_id="user_exp", role="gcs_operator", exp_seconds=-10)
    resp = client.get("/api/simulation/status", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401

def test_valid_jwt_token_authenticated():
    """Verify valid signed JWT grants access."""
    token = create_token(user_id="valid_user", role="gcs_operator")
    resp = client.get("/api/simulation/status", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"
