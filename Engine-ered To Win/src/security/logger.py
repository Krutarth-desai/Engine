import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from src.security.audit import SecurityEvent, EventSeverity, audit_store

# Configure Security Logger
logger = logging.getLogger("aerotwin_security")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[SECURITY AUDIT] %(asctime)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class SecurityLogger:
    @staticmethod
    def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive credentials from log payloads."""
        SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "key", "access_token"}
        sanitized = {}
        for k, v in data.items():
            if k.lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = SecurityLogger.sanitize_dict(v)
            else:
                sanitized[k] = v
        return sanitized

    def log_event(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        result: str = "SUCCESS",
        details: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
        severity: EventSeverity = EventSeverity.LOW,
        event_type: Optional[str] = None,
        user_role: str = "viewer",
        ip_address: str = "127.0.0.1",
        request_id: str = "N/A"
    ):
        """Log a structured security audit event and persist to store."""
        sanitized_extra = self.sanitize_dict(extra) if extra else {}
        evt = SecurityEvent(
            event_type=event_type or action,
            action=action,
            severity=severity,
            user_id=user_id or "anonymous",
            user_role=user_role,
            resource_id=resource_id or "N/A",
            result=result,
            ip_address=ip_address,
            request_id=request_id,
            details=details or "",
            metadata=sanitized_extra
        )
        audit_store.record_event(evt)
        logger.info(json.dumps(evt.model_dump()))

security_logger = SecurityLogger()
