import os
import json
import uuid
import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class EventSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class SecurityEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"EVT-{uuid.uuid4().hex[:10].upper()}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str
    action: str
    severity: EventSeverity
    user_id: str = "anonymous"
    user_role: str = "viewer"
    resource_type: str = "SYSTEM"
    resource_id: str = "N/A"
    result: str = "SUCCESS"
    ip_address: str = "127.0.0.1"
    request_id: Optional[str] = "N/A"
    details: str = ""
    status: IncidentStatus = IncidentStatus.OPEN
    status_updated_by: Optional[str] = None
    status_updated_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class LocalAuditStore:
    """Thread-safe persistent security audit log store."""

    def __init__(self, log_path: Optional[str] = None):
        if log_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.log_path = os.path.join(base_dir, "data", "security_audit.json")
        else:
            self.log_path = os.path.abspath(log_path)

        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        self._lock = threading.Lock()
        self._events: List[SecurityEvent] = []
        self._load_store()

    def _load_store(self):
        with self._lock:
            if os.path.exists(self.log_path):
                try:
                    with open(self.log_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self._events = [SecurityEvent(**item) for item in data]
                except Exception:
                    self._events = []

    def _flush_store(self):
        try:
            temp_file = f"{self.log_path}.tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump([evt.model_dump() for evt in self._events], f, indent=2, ensure_ascii=False)
            if os.path.exists(self.log_path):
                os.remove(self.log_path)
            os.rename(temp_file, self.log_path)
        except Exception:
            pass

    def record_event(self, event: SecurityEvent) -> SecurityEvent:
        """Add event to store and persist atomically."""
        with self._lock:
            self._events.append(event)
            # Keep rolling buffer of last 5000 events
            if len(self._events) > 5000:
                self._events = self._events[-5000:]
            self._flush_store()
        return event

    def query_events(
        self,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        user_id: Optional[str] = None,
        result: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Query and paginate security events."""
        with self._lock:
            filtered = self._events

            if severity:
                filtered = [e for e in filtered if e.severity.value == severity.upper()]
            if event_type:
                filtered = [e for e in filtered if e.event_type.upper() == event_type.upper()]
            if user_id:
                filtered = [e for e in filtered if e.user_id == user_id]
            if result:
                filtered = [e for e in filtered if e.result.upper() == result.upper()]
            if status:
                filtered = [e for e in filtered if e.status.value == status.upper()]

            total_count = len(filtered)
            paginated = sorted(filtered, key=lambda e: e.timestamp, reverse=True)[offset:offset + limit]

            return {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "events": [e.model_dump() for e in paginated]
            }

    def update_incident_status(
        self,
        event_id: str,
        new_status: IncidentStatus,
        updated_by: str
    ) -> Optional[SecurityEvent]:
        """Update incident status for security investigation trail."""
        with self._lock:
            for evt in self._events:
                if evt.event_id == event_id:
                    evt.status = new_status
                    evt.status_updated_by = updated_by
                    evt.status_updated_at = datetime.now(timezone.utc).isoformat()
                    self._flush_store()
                    return evt
            return None

    def get_overview_metrics(self) -> Dict[str, Any]:
        """Return security dashboard metric counters."""
        with self._lock:
            total = len(self._events)
            critical = sum(1 for e in self._events if e.severity == EventSeverity.CRITICAL)
            high = sum(1 for e in self._events if e.severity == EventSeverity.HIGH)
            medium = sum(1 for e in self._events if e.severity == EventSeverity.MEDIUM)
            low = sum(1 for e in self._events if e.severity == EventSeverity.LOW)
            failed_logins = sum(1 for e in self._events if e.event_type == "LOGIN_FAILED")
            access_denied = sum(1 for e in self._events if "DENIED" in e.event_type or e.result == "DENIED")
            recent_exports = sum(1 for e in self._events if e.event_type == "DATA_EXPORT")
            open_incidents = sum(1 for e in self._events if e.status == IncidentStatus.OPEN and e.severity in (EventSeverity.HIGH, EventSeverity.CRITICAL))

            return {
                "total_events": total,
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
                "failed_logins": failed_logins,
                "access_denied": access_denied,
                "recent_exports": recent_exports,
                "open_incidents": open_incidents
            }

audit_store = LocalAuditStore()
