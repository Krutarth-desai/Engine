# AeroTwin Secure Development & Security Policy

## Executive Summary
This document establishes the official secure coding guidelines, dependency vulnerability management policy, secret protection requirements, code review standards, and vulnerability disclosure protocols for the **Engine (AeroTwin MALE UAV Digital Twin)** project.

---

## 1. Secure Coding Standards

### 1.1 Input Handling & Sanitization
- All REST and WebSocket request payloads **MUST** be validated using Pydantic schemas defined in `src/security/schemas.py`.
- Untrusted string inputs **MUST** be sanitized using `InputSanitizer` in `src/security/sanitizer.py` to prevent script injection (`<script>`), NoSQL query operators (`$ne`, `$gt`), and path traversal (`../`).
- Filenames and export identifiers **MUST** be sanitized using `InputSanitizer.sanitize_path()` before filesystem interactions.

### 1.2 Authentication & Authorization
- Protected API routes **MUST** require `Depends(get_current_user)` and `Depends(require_permission(Permission.XYZ))`.
- Operational roles (`gcs_operator`, `propulsion_engineer`, `maintenance_tech`, `viewer`) map strictly to canonical RBAC roles (`ADMIN`, `EDITOR`, `VIEWER`).
- All user requests accessing user-scoped resources (e.g. mission recordings) **MUST** perform server-side IDOR checks (`store.can_user_access(resource_id, user_id, user_role)`).

### 1.3 Data Protection & Export Security
- Sensitive attributes (e.g., security tokens, internal state metadata) **MUST NOT** be returned in public API payloads.
- Sensitive stored attributes requiring encryption at rest **MUST** use authenticated Fernet AES-128 encryption via `SensitiveDataEncryptor` (`src/security/encryption.py`).
- Exported CSV files **MUST** sanitize leading triggers (`=`, `+`, `-`, `@`) by prefixing single quotes (`'`) to neutralize CSV formula injection attacks.

---

## 2. Dependency Management & Vulnerability Policy

- **Lockfile Integrity**: All dependencies **MUST** be pinned in `requirements.txt` (Python) and `package-lock.json` (Node.js).
- **Automated Scanning**: Python dependencies **MUST** be scanned periodically using `pip audit` or `safety`. Node packages **MUST** be audited using `npm audit`.
- **Upgrade Strategy**: Security patches for dependencies **MUST** be evaluated and applied within 7 days. Major version upgrades require regression testing using the automated security test suite.

---

## 3. Secrets Management & Credential Policy

- **Zero-Secret Commit Rule**: Secrets, JWT keys, database passwords, and cloud API tokens **MUST NEVER** be committed to source code or git history.
- **Environment Variable Binding**: Credentials **MUST** be supplied via runtime environment variables (`.env`) loaded at application startup via `python-dotenv`.
- **Pre-Commit Secret Scanning**: All pull requests **MUST** pass `python scripts/secret_scanner.py` before merge approval.

---

## 4. Code Review & Pull Request Requirements

1. **Branch Protection**: Direct commits to `main` and `Multiple-dashboards` are restricted; code changes require a Pull Request (PR).
2. **Automated Status Checks**: PRs require clean execution of:
   - DevSecOps Secret Scanner (`scripts/secret_scanner.py`).
   - Pytest Security Suite (`pytest tests/test_security.py tests/test_phase3_security.py tests/security/`).
   - Frontend TypeScript & Production Build (`npm run build`).
3. **Peer Review**: Minimum 1 senior security engineer review required for modifications to `src/security/`, `live_telemetry_server.py`, or database schema files (`supabase_*.sql`).

---

## 5. Vulnerability Reporting & Disclosure

- Security vulnerabilities should be reported privately to `security@aerotwin.io`.
- Reports **MUST** include step-by-step reproduction instructions and impact assessment.
- Do not disclose unpatched security vulnerabilities publicly until an official patch has been published.
