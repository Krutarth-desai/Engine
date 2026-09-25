# AeroTwin Security Risk Register

## Executive Summary
This document logs all identified residual risks, architectural trade-offs, severities, impact assessments, and recommended mitigation strategies for the **Engine (AeroTwin)** platform.

---

## Risk Register Table

| Risk ID | Vulnerability / Risk Description | Severity | Likelihood | Impact | Current Mitigation | Recommended Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-001** | Local storage of security audit logs (`data/security_audit.json`) on single server node. | LOW | LOW | MEDIUM | Atomic file writes & rolling buffer (5,000 events max). | LOW | ACCEPTED / MONITORED |
| **RISK-002** | Local mission file persistence (`data/missions/`) without disk encryption at OS layer. | LOW | LOW | LOW | IDOR owner verification & path sanitization active. | LOW | ACCEPTED |
| **RISK-003** | In-memory sliding window for threat detection reset on backend server process restart. | INFORMATIONAL | LOW | LOW | Persistent audit log store maintains event record. | INFORMATIONAL | INFORMATIONAL |
| **RISK-004** | Anonymous fallback context enabled in development environment when no bearer token is present. | INFORMATIONAL | MEDIUM | LOW | Restricted to read-only guest context; blocked from sensitive endpoints. | MEDIUM | MITIGATED |

---

## Risk Evaluation Criteria

- **CRITICAL**: Threat allows unauthenticated remote code execution or complete DB takeover. (Count: 0)
- **HIGH**: Threat allows unauthorized admin access or sensitive data exfiltration. (Count: 0)
- **MEDIUM**: Threat allows limited privilege escalation or denial of service. (Count: 0)
- **LOW / INFORMATIONAL**: Architectural trade-off or local development setting. (Count: 4 - Mitigated / Accepted)
