import time
import threading
from typing import Dict, List, Tuple
from src.security.audit import SecurityEvent, EventSeverity, audit_store
from src.security.alerting import alert_manager

class ThreatDetector:
    """Automated threat detection engine for failed logins, access denial spikes, and export abuse."""

    def __init__(self):
        self._lock = threading.Lock()
        # In-memory sliding windows: key -> List[timestamp]
        self._failed_logins_ip: Dict[str, List[float]] = {}
        self._failed_logins_user: Dict[str, List[float]] = {}
        self._access_denied_ip: Dict[str, List[float]] = {}
        self._export_user: Dict[str, List[float]] = {}

    def _cleanup_window(self, timestamps: List[float], window_seconds: float = 300.0) -> List[float]:
        now = time.time()
        return [t for t in timestamps if now - t <= window_seconds]

    def record_login_attempt(self, is_success: bool, user_id: str, ip_address: str, request_id: str = "N/A"):
        """Record login outcome and detect brute-force attack patterns."""
        now = time.time()
        with self._lock:
            if is_success:
                # Clear failure tracker on successful login
                self._failed_logins_user.pop(user_id, None)
                audit_store.record_event(SecurityEvent(
                    event_type="LOGIN_SUCCESS",
                    action="USER_LOGIN",
                    severity=EventSeverity.LOW,
                    user_id=user_id,
                    result="SUCCESS",
                    ip_address=ip_address,
                    request_id=request_id,
                    details="User successfully authenticated."
                ))
            else:
                ip_history = self._cleanup_window(self._failed_logins_ip.get(ip_address, []))
                ip_history.append(now)
                self._failed_logins_ip[ip_address] = ip_history

                user_history = self._cleanup_window(self._failed_logins_user.get(user_id, []))
                user_history.append(now)
                self._failed_logins_user[user_id] = user_history

                severity = EventSeverity.MEDIUM
                if len(ip_history) >= 5 or len(user_history) >= 5:
                    severity = EventSeverity.HIGH
                    alert_manager.trigger_alert(
                        title="Brute-Force Authentication Attempt",
                        category="FAILED_LOGINS",
                        severity="HIGH",
                        description=f"Multiple failed login attempts ({len(ip_history)} from IP {ip_address}, {len(user_history)} for user {user_id}).",
                        source_ip=ip_address,
                        user_id=user_id,
                        event_count=len(ip_history)
                    )

                audit_store.record_event(SecurityEvent(
                    event_type="LOGIN_FAILED",
                    action="USER_LOGIN",
                    severity=severity,
                    user_id=user_id,
                    result="FAILURE",
                    ip_address=ip_address,
                    request_id=request_id,
                    details=f"Failed authentication attempt ({len(ip_history)} consecutive failures from IP)."
                ))

    def record_access_denied(self, user_id: str, user_role: str, resource_id: str, ip_address: str, request_id: str = "N/A", details: str = ""):
        """Record 403 access denial or IDOR attempt and detect authorization abuse patterns."""
        now = time.time()
        with self._lock:
            ip_history = self._cleanup_window(self._access_denied_ip.get(ip_address, []))
            ip_history.append(now)
            self._access_denied_ip[ip_address] = ip_history

            severity = EventSeverity.MEDIUM
            if len(ip_history) >= 3:
                severity = EventSeverity.HIGH
                alert_manager.trigger_alert(
                    title="Suspicious Access Denial Spike / IDOR Pattern",
                    category="SUSPICIOUS_ACCESS",
                    severity="HIGH",
                    description=f"Repeated unauthorized access attempts ({len(ip_history)} 403 errors from IP {ip_address}).",
                    source_ip=ip_address,
                    user_id=user_id,
                    event_count=len(ip_history)
                )

            audit_store.record_event(SecurityEvent(
                event_type="DASHBOARD_ACCESS_DENIED",
                action="AUTHORIZATION_CHECK",
                severity=severity,
                user_id=user_id,
                user_role=user_role,
                resource_id=resource_id,
                result="DENIED",
                ip_address=ip_address,
                request_id=request_id,
                details=details or f"Access denied for resource {resource_id}."
            ))

    def record_data_export(self, user_id: str, user_role: str, resource_id: str, ip_address: str, request_id: str = "N/A"):
        """Record sensitive data export event and detect bulk export abuse."""
        now = time.time()
        with self._lock:
            user_history = self._cleanup_window(self._export_user.get(user_id, []))
            user_history.append(now)
            self._export_user[user_id] = user_history

            severity = EventSeverity.LOW
            if len(user_history) >= 5:
                severity = EventSeverity.HIGH
                alert_manager.trigger_alert(
                    title="Excessive Bulk Data Export Detected",
                    category="EXPORT_ABUSE",
                    severity="HIGH",
                    description=f"User {user_id} performed {len(user_history)} sensitive data exports in a 5-minute window.",
                    source_ip=ip_address,
                    user_id=user_id,
                    event_count=len(user_history)
                )

            audit_store.record_event(SecurityEvent(
                event_type="DATA_EXPORT",
                action="MISSION_CSV_EXPORT",
                severity=severity,
                user_id=user_id,
                user_role=user_role,
                resource_id=resource_id,
                result="SUCCESS",
                ip_address=ip_address,
                request_id=request_id,
                details=f"Exported mission data CSV for resource {resource_id}."
            ))

threat_detector = ThreatDetector()
