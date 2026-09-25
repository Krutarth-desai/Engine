# AeroTwin Data Classification & Protection Policy

## Executive Overview
This document defines data sensitivity tiers, handling requirements, storage boundaries, and encryption rules for data processed by the **Engine (AeroTwin)** system.

---

## Data Sensitivity Tiers

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔴 HIGHLY SENSITIVE : JWT Secrets, Service Keys, DB Connection Strings │
├────────────────────────────────────────────────────────────────────────┤
│ 🟠 CONFIDENTIAL     : User Profiles, Security Audit Logs, Alert Trails │
├────────────────────────────────────────────────────────────────────────┤
│ 🟡 INTERNAL         : Live Telemetry, Mission Recordings, Anomaly Logs │
├────────────────────────────────────────────────────────────────────────┤
│ 🟢 PUBLIC           : Swagger Docs, Root Status, Static Assets         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Inventory Matrix

| Data Asset | Classification | Storage Location | Encryption at Rest | Access Controls | Retention Period |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Supabase Service Keys & JWT Secrets** | 🔴 HIGHLY SENSITIVE | Environment (`.env`) | OS File Security | Admin / Backend Only | Indefinite (rotated quarterly) |
| **User Authentication Tokens** | 🔴 HIGHLY SENSITIVE | Memory / Bearer Headers | TLS 1.3 in Transit | Authenticated User | Token expiry (1 hour) |
| **Security Audit Logs** | 🟠 CONFIDENTIAL | `data/security_audit.json` | Fernet AES-128 (Optional) | ADMIN (`gcs_operator`) | Rolling 5,000 events / 90 days |
| **Security Threat Alerts** | 🟠 CONFIDENTIAL | `data/security_alerts.json` | Disk File Security | ADMIN (`gcs_operator`) | 30 days post-dismissal |
| **User Profiles & Operational Roles** | 🟠 CONFIDENTIAL | Supabase DB (`profiles`) | Database Disk Encryption | Supabase RLS Policies | Account lifecycle |
| **Mission Telemetry Samples** | 🟡 INTERNAL | `data/missions/*.json` | Local Disk Security | Owner / RBAC Roles | 180 days (archived) |
| **ML Models & Scalers** | 🟡 INTERNAL | `models/*.pkl`, `*.keras` | File System Security | Backend Runtime | Application Lifecycle |
| **API Root Status & OpenAPI Schema** | 🟢 PUBLIC | Memory | None | Public | N/A |

---

## 2. Encryption Requirements

- **In Transit**: All HTTP API endpoints and WebSocket streams **MUST** use TLS 1.3 / HTTPS in production.
- **At Rest**: Sensitive telemetry attributes and sensitive DB log fields requiring application-level protection **MUST** use `SensitiveDataEncryptor` (`src/security/encryption.py`) implementing **Fernet AES-128-CBC** authenticated encryption.
- **Key Isolation**: Master encryption keys **MUST** be supplied via `ENCRYPTION_KEY` environment variables and never stored alongside encrypted payloads.

---

## 3. Data Minimization & Retention Rules

1. **Telemetry Trimming**: Telemetry buffers retain rolling windows of recent samples required for regression and ML inference.
2. **Audit Log Rolling Buffer**: Security audit logs retain up to 5,000 events atomically in `data/security_audit.json`.
3. **Session Expiration**: JWT sessions expire automatically after 1 hour, requiring re-authentication.
