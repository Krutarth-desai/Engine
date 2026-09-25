# Security Policy & Reporting Guidelines

## Supported Versions

Only the latest active release branch (`main` / `Multiple-dashboards`) is currently supported for security updates.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| 2.0.x            | :white_check_mark: |
| < 2.0.0          | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within the AeroTwin MALE UAV Digital Twin codebase:

1. **Do NOT open a public GitHub issue.**
2. Send a detailed report to the security maintainers describing:
   - Type of vulnerability (e.g., Auth bypass, IDOR, Injection, CORS).
   - Step-by-step reproduction instructions.
   - Affected API endpoints or files.
3. We will acknowledge receipt within 48 hours and work on a resolution.

## Core Security Requirements

- **Authentication**: JWT Bearer token authentication enforced on all API endpoints.
- **Authorization**: Server-side Role-Based Access Control (RBAC) with `ADMIN`, `EDITOR`, `VIEWER` roles.
- **IDOR Protection**: Explicit owner verification on resource endpoints.
- **Secrets Management**: Credentials must NEVER be committed to Git. Load secrets strictly via environment variables.
