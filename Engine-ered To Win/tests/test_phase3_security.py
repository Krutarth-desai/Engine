import pytest
import jwt
from fastapi.testclient import TestClient
from live_telemetry_server import app
from src.security.auth import SUPABASE_JWT_SECRET, ALGORITHM
from src.security.audit import audit_store, SecurityEvent, EventSeverity, IncidentStatus
from src.security.alerting import alert_manager, SecurityAlert
from src.security.detector import threat_detector

client = TestClient(app)

def create_test_token(user_id: str = "test_admin_01", role: str = "gcs_operator") -> str:
    """Generate a signed test JWT token."""
    payload = {
        "sub": user_id,
        "email": "admin@aerotwin.io",
        "role": role,
        "aud": "authenticated"
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm=ALGORITHM)

def reset_alert_manager():
    """Helper to clear alert manager internal storage for tests."""
    with alert_manager._lock:
        alert_manager._alerts.clear()

def test_audit_event_logging():
    """Verify security audit events are structured and persisted."""
    event = SecurityEvent(
        event_type="TEST_EVENT",
        action="TEST_ACTION",
        severity=EventSeverity.HIGH,
        user_id="user_test_01",
        user_role="gcs_operator",
        result="SUCCESS",
        details="Unit testing audit event persistence."
    )
    saved = audit_store.record_event(event)
    assert saved.event_id.startswith("EVT-")
    assert saved.severity == EventSeverity.HIGH
    assert saved.status == IncidentStatus.OPEN

    query = audit_store.query_events(event_type="TEST_EVENT", limit=10)
    assert query["total"] >= 1
    assert query["events"][0]["user_id"] == "user_test_01"

def test_request_correlation_id_middleware():
    """Verify X-Request-ID header is generated and returned on HTTP responses."""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-request-id" in response.headers

    # Passing custom correlation ID
    custom_id = "test-corr-id-9999"
    response_custom = client.get("/", headers={"X-Request-ID": custom_id})
    assert response_custom.headers.get("x-request-id") == custom_id

def test_threat_detection_failed_logins():
    """Verify 5 failed login attempts trigger a BRUTE_FORCE_FAILED_LOGINS threat alert."""
    test_ip = "192.168.1.100"
    reset_alert_manager()

    for _ in range(5):
        threat_detector.record_login_attempt(is_success=False, user_id="target_user", ip_address=test_ip)

    alerts = alert_manager.get_active_alerts()
    assert len(alerts) >= 1
    assert alerts[0]["category"] == "FAILED_LOGINS"
    assert alerts[0]["severity"] == "HIGH"

def test_threat_detection_access_denials():
    """Verify repeated access denials trigger ACCESS_DENIAL_SPIKE alert."""
    test_ip = "192.168.1.101"
    reset_alert_manager()

    for _ in range(3):
        threat_detector.record_access_denied(user_id="unauthorized_user", user_role="viewer", resource_id="mission_secret", ip_address=test_ip)

    alerts = alert_manager.get_active_alerts()
    assert len(alerts) >= 1
    assert alerts[0]["category"] == "SUSPICIOUS_ACCESS"

def test_threat_detection_export_abuse():
    """Verify excessive export operations trigger EXPORT_ABUSE_DETECTED alert."""
    test_user = "export_abuser_01"
    reset_alert_manager()

    for _ in range(5):
        threat_detector.record_data_export(user_id=test_user, user_role="viewer", resource_id="mission_export_bulk", ip_address="127.0.0.1")

    alerts = alert_manager.get_active_alerts()
    assert len(alerts) >= 1
    assert alerts[0]["category"] == "EXPORT_ABUSE"
    assert alerts[0]["severity"] == "HIGH"

def test_alert_manager_deduplication():
    """Verify duplicate alerts within suppression window are aggregated rather than duplicated."""
    reset_alert_manager()
    a1 = alert_manager.trigger_alert(
        title="Dup Test", category="SUSPICIOUS_ACCESS", severity="HIGH",
        description="Testing deduplication", source_ip="127.0.0.1", user_id="user1"
    )
    a2 = alert_manager.trigger_alert(
        title="Dup Test", category="SUSPICIOUS_ACCESS", severity="HIGH",
        description="Testing deduplication", source_ip="127.0.0.1", user_id="user1"
    )

    # Should return the same alert object with incremented event_count
    assert a1.alert_id == a2.alert_id
    assert a2.event_count == 2
    assert len(alert_manager.get_active_alerts()) == 1

def test_incident_status_transition():
    """Verify incident status updates work and update metadata."""
    event = SecurityEvent(
        event_type="INCIDENT_TEST",
        action="TEST",
        severity=EventSeverity.CRITICAL,
        user_id="victim_user",
        result="DENIED"
    )
    saved = audit_store.record_event(event)

    updated = audit_store.update_incident_status(saved.event_id, IncidentStatus.INVESTIGATING, "analyst_bob")
    assert updated is not None
    assert updated.status == IncidentStatus.INVESTIGATING
    assert updated.status_updated_by == "analyst_bob"
    assert updated.status_updated_at is not None

def test_admin_security_endpoints_rbac():
    """Verify security admin endpoints enforce RBAC restrictions."""
    viewer_token = create_test_token(user_id="viewer_01", role="viewer")
    admin_token = create_test_token(user_id="admin_01", role="gcs_operator")

    # Viewer should be denied (403)
    resp_viewer = client.get("/api/security/overview", headers={"Authorization": f"Bearer {viewer_token}"})
    assert resp_viewer.status_code == 403

    # Admin should succeed (200)
    resp_admin = client.get("/api/security/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_admin.status_code == 200
    assert resp_admin.json()["status"] == "ok"
    assert "metrics" in resp_admin.json()

def test_dismiss_alert_api():
    """Verify dismissal of active security alerts via admin API."""
    admin_token = create_test_token(user_id="admin_01", role="gcs_operator")
    reset_alert_manager()

    pushed = alert_manager.trigger_alert(
        title="Dismiss Test", category="FAILED_LOGINS", severity="MEDIUM",
        description="Testing API dismissal", source_ip="127.0.0.1", user_id="test_user"
    )

    # Dismiss alert
    resp = client.post(
        f"/api/security/alerts/{pushed.alert_id}/dismiss",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    assert "dismissed" in resp.json()["message"]

    # Verify no longer active
    active = alert_manager.get_active_alerts()
    assert all(a["alert_id"] != pushed.alert_id for a in active)
