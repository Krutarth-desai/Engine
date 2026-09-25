# PHASE 3 — SECURITY MONITORING & THREAT DETECTION AUDIT

## 1. Executive Summary & Verification of Phase 1 & Phase 2

A full repository audit confirms that foundational Phase 1 (Authentication, RBAC, IDOR protection, Rate Limiting, Security Headers) and Phase 2 (Input Validation, Sanitization, Fernet AES Encryption, CSV Formula Defense, Payload Limits) controls are fully in place and operational.

- **Authentication & RBAC**: JWT Bearer verification (`src/security/auth.py`), RBAC permissions matrix (`src/security/rbac.py`).
- **Data Protection**: Input sanitization (`src/security/sanitizer.py`), Fernet AES Encryption (`src/security/encryption.py`), CSV Formula protection.
- **Middleware**: Security Headers, CORS allowlist, max request body size (1MB limit), slowapi rate limiting.
- **Verification**: 13/13 security tests passing in `tests/test_security.py`.

---

## 2. Component Audit for Phase 3

### 2.1 Existing Logging & Monitoring
- Basic console logging in `src/security/logger.py`.
- Lacks structured event persistence, query/pagination capabilities, event severity mapping, correlation IDs, threat detection rules, and incident lifecycle management.

### 2.2 Existing Admin Dashboard & UI
- `frontend/src/config/roleConfig.ts` defines operational roles (`gcs_operator`, `propulsion_engineer`, `maintenance_tech`). `gcs_operator` mapped to canonical `ADMIN` role.
- No dedicated Admin Security Overview UI currently exists for displaying security audit trails, failed login spikes, access denial attempts, or active security alerts.

### 2.3 Identified Phase 3 Gaps & Security Risks
1. **Correlation Tracking**: Lacks unique Request IDs (`X-Request-ID`) attached across HTTP headers, logs, and security events.
2. **Threat & Abuse Detection**: Lacks automated pattern detection for brute-force logins, repeated 403 access denials/IDOR attempts, and excessive data export behavior.
3. **Audit Event Persistence & Search**: Logs are written to stdout without structured JSON file persistence, filtering, or admin API retrieval endpoints.
4. **Alerting & Incident Response**: Lacks deduplicated alert aggregation and incident status tracking (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`).

---

## 3. Planned Architecture for Phase 3

### 3.1 Components to Create
1. **`src/security/audit.py`**: Centralized audit event model & thread-safe file/memory store (`LocalAuditStore`).
2. **`src/security/detector.py`**: Pattern detection engine for failed logins, repeated 403 access denials, and excessive export abuse.
3. **`src/security/alerting.py`**: Alert abstraction manager with configurable thresholds and deduplication/aggregation.
4. **`frontend/src/components/SecurityDashboardView.tsx`**: Admin Security Monitoring Dashboard UI.
5. **`INCIDENT_RESPONSE.md`**: Standard operating procedures for security incident handling.
6. **`tests/test_phase3_security.py`**: Pytest security suite testing audit logging, threat detection, alerting, and correlation IDs.

### 3.2 Files to Modify
1. **`src/security/logger.py`**: Integrate structured event payload and audit store persistence.
2. **`live_telemetry_server.py`**: Add Request Correlation ID middleware (`X-Request-ID`), attach security event emitters, and add `/api/security/*` admin endpoints.
3. **`frontend/src/config/roleConfig.ts`**: Add `security` view to `gcs_operator` allowed views.
4. **`frontend/src/components/Sidebar.tsx`**: Add "Security Audit & Monitoring" tab for GCS Operators / Admins.
5. **`frontend/src/app/page.tsx`**: Render `SecurityDashboardView` when current view is `"security"`.
6. **`SECURITY.md`**: Document Phase 3 monitoring architecture and incident response process.
