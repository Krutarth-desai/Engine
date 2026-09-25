# SECURITY AUDIT & ARCHITECTURE SPECIFICATION: ENGINE (AEROTWIN)

## 1. Executive Summary & Current Architecture

The **Engine (AeroTwin)** repository is a High-Fidelity Digital Twin Ground Control Station (GCS) and Prognostics Health Management (PHM) system for MALE UAV aero-piston engines.

- **Frontend Framework**: Next.js 16.3.4 (React 19, TypeScript, Turbopack, App Router).
- **Backend Framework**: Python FastAPI 0.141+ (Uvicorn, WebSockets, Python 3.14).
- **Database / Auth Provider**: Supabase (PostgreSQL with Row-Level Security and Supabase Auth JWT).
- **Architecture**: Decoupled Client-Server architecture. The Next.js frontend communicates with the FastAPI backend via REST HTTP APIs (port 8000) and WebSockets (`/ws/telemetry`, `/ws/rul`), while communicating with Supabase for user authentication and user profile storage.

---

## 2. Comprehensive Component Audit

### 2.1 Authentication & User Flow
- **Current Flow**: Users register and log in on the frontend (`AuthScreen.tsx`) using `@supabase/supabase-js`. Supabase issues a JWT session token stored in browser memory/session storage.
- **Flaws**:
  1. The FastAPI backend does **NOT** verify Supabase JWT tokens. Every endpoint on `http://localhost:8000` is currently completely unauthenticated and accessible to any anonymous request.
  2. Frontend falls back to `localStorage.getItem("aerotwin_user_role")` if database fetch fails, enabling client-side authentication and authorization bypass.

### 2.2 Authorization & Role-Based Access Control (RBAC)
- **Current Flow**: Authorization is implemented purely client-side via `frontend/src/config/roleConfig.ts` (`isViewAllowed`, `isPanelAllowed`) and `RoleContext.tsx`.
- **Flaws**:
  1. No server-side authorization middleware or guards exist in FastAPI.
  2. Hiding UI elements in React is the *only* existing access control mechanism. An attacker can send direct HTTP/WebSocket requests to read sensitive telemetry, inject faults, or delete recorded missions.

### 2.3 Dashboard Data Flow & IDOR Protection
- **Current Flow**: Frontend requests mission lists (`/api/missions`), deletes missions (`DELETE /api/missions/{id}`), injects faults (`/api/faults/inject`), and triggers engine overhauls (`/api/faults/overhaul`).
- **Flaws**:
  1. Zero IDOR protection. Any user can pass any `mission_id` to read, replay, or permanently delete another user's recorded flight telemetry.
  2. Mission creation and replay endpoints do not check user ownership or explicit access rights.

### 2.4 Database & Secrets Management
- **Current Flow**:
  1. Supabase schema includes `public.profiles`, `public.telemetry_anomalies`, `public.nasa_cmapss_telemetry`.
  2. Database credentials and Supabase service role keys are loaded from `.env`.
- **Flaws**:
  1. No `.env.example` placeholder file exists in the repository.
  2. Hardcoded fallback values or unvalidated environment secrets.

### 2.5 Security Headers, CORS & Rate Limiting
- **Flaws**:
  1. FastAPI `CORSMiddleware` is configured with `allow_origins=["*"]` and `allow_credentials=True`. This is a severe CORS misconfiguration.
  2. No security headers (Content Security Policy, X-Content-Type-Options, Frame Options, HSTS) are attached to backend responses.
  3. No rate limiting is configured for REST endpoints or WebSockets.

### 2.6 Security Logging & Error Handling
- **Flaws**:
  1. No structured security audit logging for authentication events, role changes, mission deletions, or unauthorized access attempts.
  2. Raw exceptions or unhandled tracebacks can be exposed during server errors.

---

## 3. Files Requiring Modification & Addition

### Dependencies to Add
- Python: `PyJWT` (or `python-jose` for JWT validation), `slowapi` (for FastAPI rate-limiting).
- Frontend: Ensure secure token handling and standard headers.

### Files to Modify / Create
1. **[NEW] `SECURITY_AUDIT.md`**: Current document.
2. **[NEW] `SECURITY.md`**: Security policy and reporting guidance.
3. **[NEW] `.env.example`**: Environment variable template.
4. **[NEW] `src/security/__init__.py`**: Security module package.
5. **[NEW] `src/security/auth.py`**: JWT validation, password hashing, and user context.
6. **[NEW] `src/security/rbac.py`**: Server-side RBAC permission matrix (ADMIN, EDITOR, VIEWER).
7. **[NEW] `src/security/logger.py`**: Security event logging system.
8. **[NEW] `src/security/schemas.py`**: Input validation schemas (Pydantic models).
9. **[MODIFY] `live_telemetry_server.py`**: Add security headers, rate limiting, CORS restrictions, JWT auth dependencies, RBAC guards, and IDOR protection.
10. **[MODIFY] `src/mission/mission_store.py`**: Add owner/user ID metadata and access authorization checks.
11. **[MODIFY] `frontend/src/lib/supabase.ts`** & API calls: Pass Authorization Bearer header for backend requests.
12. **[NEW] `tests/test_security.py`**: Automated security test suite covering auth, RBAC, IDOR, input validation, and rate limiting.

---

## 4. Phase 1 Security Implementation Plan Summary

1. **Authentication & JWT Verification**:
   - Implement Supabase JWT token verification dependency in FastAPI using `SUPABASE_JWT_SECRET` / JWT verification.
   - Support `Authorization: Bearer <token>` for REST APIs and query param `?token=<token>` for WebSockets.
2. **Server-Side RBAC & Permissions**:
   - Define canonical roles (`ADMIN`, `EDITOR`, `VIEWER`) mapped to operational roles.
   - Enforce permission guards (`require_permission`) on all FastAPI endpoints.
3. **IDOR & Dashboard Resource Authorization**:
   - Attach user ownership (`user_id`) to recorded missions and dashboard operations.
   - Enforce server-side ownership/permission checks before viewing, editing, or deleting any mission or telemetry configuration.
4. **Input Validation & Injection Prevention**:
   - Replace raw `dict` request parameters with strict Pydantic models.
   - Enforce enum checks, string length limits, numeric range bounds, and ID validation.
5. **CORS, Security Headers & Rate Limiting**:
   - Restrict CORS to `FRONTEND_URL` (default `http://localhost:3000`).
   - Add secure response headers (CSP, X-Content-Type-Options, Frame Guard, Referrer-Policy).
   - Add `SlowAPI` rate limiters on auth, sensitive endpoints, and public APIs.
6. **Security Audit Logging**:
   - Log security events (`LOGIN_SUCCESS`, `DASHBOARD_VIEW_DENIED`, `DASHBOARD_DELETED`, `PERMISSION_CHANGED`, etc.) without exposing passwords or tokens.
7. **Automated Security Verification Suite**:
   - Write comprehensive Pytest security suite to verify unauthenticated rejection, RBAC enforcement, IDOR protection, and rate limiting.
