import pytest
import jwt
from fastapi.testclient import TestClient
from live_telemetry_server import app
from src.security.auth import SUPABASE_JWT_SECRET, ALGORITHM

client = TestClient(app)

def create_token(user_id: str = "test_operator", role: str = "gcs_operator") -> str:
    payload = {"sub": user_id, "email": f"{user_id}@aerotwin.io", "role": role, "aud": "authenticated"}
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)

def test_payload_size_limit_rejection():
    """Verify request body over 1MB is rejected with HTTP 413 Payload Too Large."""
    large_data = "A" * (1024 * 1024 + 100)
    token = create_token()
    resp = client.post(
        "/api/endurance",
        content=large_data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 413
    assert "exceeds maximum allowed size limit" in resp.json().get("message", "")

def test_invalid_pydantic_numeric_bounds_rejected():
    """Verify out-of-bounds parameter payload returns HTTP 422 Unprocessable Entity."""
    token = create_token()
    resp = client.post(
        "/api/endurance",
        json={"speed": 99999.0},  # Speed exceeds gt/lt constraints
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 422

def test_malformed_json_rejected():
    """Verify malformed JSON body returns HTTP 422 Unprocessable Entity."""
    token = create_token()
    resp = client.post(
        "/api/scenario",
        content="{malformed_json: ",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 422

def test_request_correlation_id_propagation():
    """Verify X-Request-ID header is propagated in response headers."""
    resp = client.get("/")
    assert "x-request-id" in resp.headers

    custom_id = "req-corr-uuid-12345"
    resp_custom = client.get("/", headers={"X-Request-ID": custom_id})
    assert resp_custom.headers.get("x-request-id") == custom_id
