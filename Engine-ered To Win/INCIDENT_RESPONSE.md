# AeroTwin Incident Response Standard Operating Procedure (SOP)

## Executive Summary
This document establishes the official 9-stage Incident Response Framework and standard operating procedures for handling security incidents, account compromises, credential leaks, and threat alert escalations in the **Engine (AeroTwin)** platform.

---

## 1. Nine-Stage Incident Response Framework

```
┌───────────┐    ┌────────────────┐    ┌─────────────┐
│ 1.Detect  │ ──►│ 2. Identify    │ ──►│ 3. Contain  │
└───────────┘    └────────────────┘    └──────┬──────┘
                                              │
┌───────────┐    ┌────────────────┐    ┌──────▼──────┐
│ 6.Eradicate│◄──│ 5. Investigate │◄───│ 4. Preserve │
└─────┬─────┘    └────────────────┘    └─────────────┘
      │
┌─────▼─────┐    ┌────────────────┐    ┌─────────────┐
│ 7. Recover│ ──►│ 8. Notify      │ ──►│ 9. Review   │
└───────────┘    └────────────────┘    └─────────────┘
```

1. **Detection**: Threat triggers via `AlertManager` (`src/security/alerting.py`) or log anomaly spikes.
2. **Identification**: Triage severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), check correlation ID `X-Request-ID`.
3. **Containment**: Revoke JWT session, block offending source IP, or isolate affected endpoint.
4. **Evidence Preservation**: Freeze `data/security_audit.json` log state and snapshot process memory.
5. **Investigation**: Analyze correlation logs, query event history via `/api/security/events`.
6. **Eradication**: Remove malicious payloads, patch code vulnerabilities, rotate compromised secrets.
7. **Recovery**: Restore verified state from backup, redeploy sanitized build.
8. **Notification**: Notify impacted stakeholders and compliance officers if required.
9. **Post-Incident Review**: Document root cause, lessons learned, and update regression test suite.

---

## 2. Specific Response Scenarios (Scenarios A – I)

### SCENARIO A: Compromised Administrator Account (`gcs_operator`)
- **Detection**: Unusual login IP or multiple failed logins followed by successful admin session.
- **Immediate Action**: Revoke user JWT tokens, set account status to suspended in Supabase profile.
- **Containment**: Audit `/api/security/events` for unauthorized admin operations during session window.
- **Recovery**: Reset password/MFA keys, verify role assignments, restore modified configuration.

### SCENARIO B: Database Credential Leak
- **Detection**: Secret scanner finding or alert of DB credential exposure.
- **Immediate Action**: Rotate `SUPABASE_SERVICE_ROLE_KEY` and DB password in Supabase Dashboard.
- **Containment**: Update backend `.env` file and restart server daemon immediately.
- **Recovery**: Audit DB query logs for unauthorized data access or schema tampering.

### SCENARIO C: API Key / JWT Secret Leak
- **Detection**: Exposure of `SUPABASE_JWT_SECRET` in public repo or logs.
- **Immediate Action**: Regenerate JWT secret in auth provider dashboard.
- **Containment**: All existing user JWT tokens are automatically invalidated due to signature mismatch.
- **Recovery**: Force re-authentication for all active operators and engineers.

### SCENARIO D: Unauthorized Dashboard Access / IDOR Attempt
- **Detection**: `ACCESS_DENIAL_SPIKE` alert triggered by 403 errors or IDOR check blocks.
- **Immediate Action**: Temporarily rate-limit offending IP address.
- **Containment**: Verify server-side IDOR checks in `LocalMissionStore.can_user_access`.
- **Recovery**: Log incident event and verify RBAC role mappings.

### SCENARIO E: Malicious Script / Payload Injection Attempt
- **Detection**: `InputSanitizer` catching NoSQL/Script patterns or malformed payload rejections.
- **Immediate Action**: Block request payload and log `SECURITY_EVENT`.
- **Containment**: Confirm Pydantic schema validation is active on target endpoint.
- **Recovery**: Add payload pattern to `tests/security/test_injection_security.py`.

### SCENARIO F: Large-Scale Bulk Data Export Abuse
- **Detection**: `EXPORT_ABUSE_DETECTED` alert (exceeding 5 exports per minute).
- **Immediate Action**: Enforce export rate limiter on user account.
- **Containment**: Verify CSV formula injection escaping (`='` cell prefix) is active.
- **Recovery**: Review audit trail for exported resource IDs.

### SCENARIO G: Database Compromise / Data Tampering
- **Detection**: Integrity check failure or unexpected modifications to mission metadata.
- **Immediate Action**: Isolate DB connection and switch backend to read-only mode.
- **Containment**: Initiate Point-In-Time Recovery (PITR) to pre-compromise timestamp.
- **Recovery**: Verify DB restore using `BACKUP_RECOVERY.md` protocols.

### SCENARIO H: Application Zero-Day Vulnerability Discovered
- **Detection**: Internal security audit finding or external disclosure report.
- **Immediate Action**: Assign `CRITICAL` incident priority in `SECURITY_RISK_REGISTER.md`.
- **Containment**: Deploy virtual patch or endpoint rate limiter if hotfix is pending.
- **Recovery**: Develop hotfix, add automated Pytest regression test, deploy patched build.

### SCENARIO I: Destructive Event / Ransomware Simulation
- **Detection**: Widespread file deletion or corrupted storage files.
- **Immediate Action**: Stop application daemon (`python run.py`).
- **Containment**: Isolate server environment from network.
- **Recovery**: Execute full disaster recovery restoration following `BACKUP_RECOVERY.md`.

---

## 3. Account & Secret Compromise Procedures

1. **Identify Secret/Account**: Pinpoint compromised JWT, API key, or user ID.
2. **Revoke & Rotate**: Revoke secret in auth provider dashboard and update `.env`.
3. **Redeploy & Verify**: Restart application services (`python run.py`).
4. **Audit Review**: Search `data/security_audit.json` for activity under compromised context.
5. **Document**: Record findings in `SECURITY_RISK_REGISTER.md`.

---

## 4. Safe Incident Response Simulation Plan (Drills)

- **Drill 1 (Failed Login Spike)**: Trigger 5 invalid login attempts to verify `BRUTE_FORCE_FAILED_LOGINS` alert generation.
- **Drill 2 (Export Rate Limit)**: Execute 6 rapid export requests to verify rate limiter and alert manager deduplication.
- **Drill 3 (Secret Scan)**: Run `python scripts/secret_scanner.py` to verify zero secret leaks in source tree.
