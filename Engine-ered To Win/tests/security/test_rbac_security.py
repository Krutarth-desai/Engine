import pytest
import jwt
from fastapi.testclient import TestClient
from live_telemetry_server import app
from src.security.auth import SUPABASE_JWT_SECRET, ALGORITHM
from src.security.rbac import Role, Permission, has_permission

client = TestClient(app)

def create_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "email": f"{user_id}@aerotwin.io", "role": role, "aud": "authenticated"}
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)

def test_rbac_matrix_mapping():
    """Verify role permissions matrix."""
    assert has_permission("gcs_operator", Permission.MANAGE_USERS) is True
    assert has_permission("propulsion_engineer", Permission.EDIT) is True
    assert has_permission("propulsion_engineer", Permission.MANAGE_USERS) is False
    assert has_permission("maintenance_tech", Permission.DELETE) is False
    assert has_permission("viewer", Permission.VIEW) is True
    assert has_permission("viewer", Permission.EDIT) is False

def test_viewer_role_blocked_from_editor_actions():
    """Verify viewer cannot execute scenario injections."""
    token = create_token("viewer_user", "viewer")
    resp = client.post("/api/scenario", json={"scenario": "Desert Thermal"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403

def test_editor_role_blocked_from_admin_security_endpoints():
    """Verify editor cannot access admin security endpoints."""
    token = create_token("engineer_user", "propulsion_engineer")
    resp = client.get("/api/security/overview", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403

def test_admin_role_allowed_security_endpoints():
    """Verify gcs_operator (admin) can access admin security overview."""
    token = create_token("admin_user", "gcs_operator")
    resp = client.get("/api/security/overview", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
