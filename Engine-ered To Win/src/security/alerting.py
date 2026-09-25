import os
import json
import uuid
import threading
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SecurityAlert(BaseModel):
    alert_id: str = Field(default_factory=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    title: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    category: str  # FAILED_LOGINS, SUSPICIOUS_ACCESS, EXPORT_ABUSE, INJECTION, PRIVILEGE_ESCALATION
    description: str
    source_ip: str = "127.0.0.1"
    user_id: str = "anonymous"
    event_count: int = 1
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AlertManager:
    """Manages active security alerts with deduplication and aggregation."""

    def __init__(self, storage_path: Optional[str] = None):
        if storage_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.storage_path = os.path.join(base_dir, "data", "security_alerts.json")
        else:
            self.storage_path = os.path.abspath(storage_path)

        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        self._lock = threading.Lock()
        self._alerts: List[SecurityAlert] = []
        self._load_alerts()

    def _load_alerts(self):
        with self._lock:
            if os.path.exists(self.storage_path):
                try:
                    with open(self.storage_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self._alerts = [SecurityAlert(**item) for item in data]
                except Exception:
                    self._alerts = []

    def _flush_alerts(self):
        try:
            temp_file = f"{self.storage_path}.tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump([alt.model_dump() for alt in self._alerts], f, indent=2, ensure_ascii=False)
            if os.path.exists(self.storage_path):
                os.remove(self.storage_path)
            os.rename(temp_file, self.storage_path)
        except Exception:
            pass

    def trigger_alert(
        self,
        title: str,
        category: str,
        severity: str,
        description: str,
        source_ip: str = "127.0.0.1",
        user_id: str = "anonymous",
        event_count: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SecurityAlert:
        """Trigger or aggregate alert to prevent alert flooding."""
        with self._lock:
            # Check for existing active alert for same category, user, and IP within last 10 mins
            for alt in reversed(self._alerts):
                if (
                    alt.is_active
                    and alt.category == category
                    and alt.source_ip == source_ip
                    and alt.user_id == user_id
                ):
                    alt.event_count += event_count
                    alt.timestamp = datetime.now(timezone.utc).isoformat()
                    alt.description = f"{description} (Aggregated {alt.event_count} events)."
                    self._flush_alerts()
                    return alt

            alert = SecurityAlert(
                title=title,
                category=category,
                severity=severity.upper(),
                description=description,
                source_ip=source_ip,
                user_id=user_id,
                event_count=event_count,
                metadata=metadata or {}
            )
            self._alerts.append(alert)
            if len(self._alerts) > 500:
                self._alerts = self._alerts[-500:]
            self._flush_alerts()
            return alert

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Return list of active security alerts."""
        with self._lock:
            active = [a.model_dump() for a in self._alerts if a.is_active]
            return sorted(active, key=lambda x: x["timestamp"], reverse=True)

    def dismiss_alert(self, alert_id: str) -> bool:
        """Dismiss/deactivate an active alert."""
        with self._lock:
            for a in self._alerts:
                if a.alert_id == alert_id:
                    a.is_active = False
                    self._flush_alerts()
                    return True
            return False

alert_manager = AlertManager()
