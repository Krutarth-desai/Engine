# Phase 4 — Security Test Audit & Attack Surface Analysis

## Executive Overview
This document presents the Phase 4 Security Audit for the **Engine (AeroTwin MALE UAV Digital Twin)** project on the `Multiple-dashboards` branch.

---

## 1. System Architecture & Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
│        Next.js 16 React Frontend (Port 3000) / RoleContext              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / WSS (JWT Auth)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Server (Port 8000)                   │
│  - Middleware: CORS, SecurityHeaders, MaxRequestBodySize, RequestCorr  │
│  - Auth Dependency: Supabase JWT Verification & Role Mapper             │
│  - Security Modules: RBAC, InputSanitizer, ThreatDetector, AuditStore   │
└──────────────────┬──────────────────────────────────────┬───────────────┘
                   │ SQL / RLS                            │ File Persistence
                   ▼                                      ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────┐
│      Supabase PostgreSQL Database    │ │ Local Data Stores              │
│  - profiles, mission_logs, anomalies │ │ - data/security_audit.json     │
│  - RLS Policies per user/role        │ │ - data/security_alerts.json    │
└──────────────────────────────────────┘ └────────────────────────────────┘
```

---

## 2. Attack Surfaces & Exposed Endpoints

### 2.1 Public & Unauthenticated Endpoints
- `GET /` — API Status & Root Metadata.
- `GET /docs`, `GET /openapi.json` — Swagger API Documentation.

### 2.2 Authenticated User Endpoints (`VIEWER`, `EDITOR`, `ADMIN`)
- `GET /api/simulation/status` — Live telemetry simulation state.
- `GET /api/missions` — List user accessible recorded missions.
- `GET /api/missions/{id}` — Retrieve specific mission dataset (IDOR checked).
- `GET /api/missions/{id}/export` — Stream CSV telemetry export (Formula injection escaped, IDOR checked).
- `GET /api/regression_plot` — Generate matplotlib dynamic regression plots.
- `WS /ws/telemetry` — Live WebSocket telemetry stream (JWT authenticated).
- `WS /ws/rul` — Live RUL prediction stream (JWT authenticated).

### 2.3 Privileged Operational Endpoints (`EDITOR`, `ADMIN`)
- `POST /api/scenario` — Change mission operating scenario (`Normal`, `High Altitude Cruise`, `Desert Thermal`).
- `POST /api/fault/inject` — Inject simulated subsystem fault (`oil_leak`, `egt_sensor_drift`, `cht_sensor_bias`).
- `POST /api/environment` — Modify ambient altitude, temperature, and throttle parameters.
- `POST /api/endurance` — Adjust endurance simulation velocity and endurance profile.
- `POST /api/missions/start`, `stop` — Control flight recorder.

### 2.4 Administrative Security Endpoints (`ADMIN` / `gcs_operator`)
- `GET /api/security/overview` — Security metrics overview & active threat count.
- `GET /api/security/events` — Paginated security audit event logs.
- `GET /api/security/alerts` — Active threat alerts list.
- `POST /api/security/alerts/{id}/dismiss` — Dismiss threat alert.
- `POST /api/security/incidents/{id}/status` — Incident status lifecycle management.

---

## 3. Trust Boundaries & Data Flow Isolation

1. **Browser <-> FastAPI Server**: Un-trusted client input boundary. Enforced by JWT validation, CORS, rate limiting, 1MB body size cap, and Pydantic schema validation.
2. **FastAPI <-> Supabase DB**: Application data persistence boundary. Enforced by service role key backend calls and Row Level Security (RLS) policies.
3. **Local Store Persistence**: Security audit and alert storage (`data/*.json`). Thread-safe atomic file writes preventing race conditions and log tampering.

---

## 4. Key Security Controls Verified

- **Authentication**: JWT signature verification (`HS256`/`RS256`) via `SUPABASE_JWT_SECRET`.
- **Authorization**: Granular RBAC (`ADMIN`, `EDITOR`, `VIEWER`) and IDOR owner checks.
- **Input Validation**: Pydantic bounds enforcement, NoSQL/Script pattern sanitization, path traversal defense.
- **Export Defense**: CSV cell prefixing (`='`) guarding against command execution in spreadsheet applications.
- **Monitoring**: Real-time threat detection for brute force logins, 403 spikes, and export abuse.
