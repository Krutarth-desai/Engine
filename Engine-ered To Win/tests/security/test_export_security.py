import pytest
import jwt
from fastapi.testclient import TestClient
from live_telemetry_server import app
from src.security.auth import SUPABASE_JWT_SECRET, ALGORITHM
from src.mission.mission_store import LocalMissionStore
from src.mission.mission_models import Mission, MissionMetadata, MissionSample

client = TestClient(app)

def create_token(user_id: str = "test_user_01", role: str = "viewer") -> str:
    payload = {"sub": user_id, "email": f"{user_id}@aerotwin.io", "role": role, "aud": "authenticated"}
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)

def test_export_idor_unauthorized_access_denied():
    """Verify unauthorized mission export returns HTTP 403 Forbidden."""
    store = LocalMissionStore()
    mission_id = "private_mission_test_99"
    meta = MissionMetadata(
        mission_id=mission_id,
        name="Private Test Flight",
        created_at="2026-09-25T00:00:00Z",
        started_at="2026-09-25T00:00:00Z",
        owner_id="user_owner_777"
    )
    sample = MissionSample(
        timestamp="2026-09-25T00:00:00Z",
        mission_time_sec=1.0,
        tick=1,
        telemetry={"rpm": 2450.0, "cht_c": 142.0},
        environment={},
        digital_twin={},
        health={"health_index": 98.0},
        degradation={},
        diagnosis={}
    )
    mission = Mission(metadata=meta, samples=[sample])
    store.save_mission(mission)

    # Attacker viewer attempts to export private mission owned by user_owner_777
    token = create_token("user_attacker_99", "viewer")
    resp = client.get(f"/api/missions/{mission_id}/export", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert "IDOR protection prevented exporting" in resp.json().get("detail", "")

def test_export_formula_injection_sanitization():
    """Verify CSV cells in mission exports do not contain raw formula triggers."""
    from src.security.sanitizer import InputSanitizer
    cell_raw = "=CMD|' /C calc'!A0"
    cell_clean = InputSanitizer.sanitize_csv_cell(cell_raw)
    assert cell_clean.startswith("'=")
