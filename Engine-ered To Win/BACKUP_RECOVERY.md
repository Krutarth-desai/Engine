# AeroTwin Backup, Recovery & Disaster Recovery Plan

## Executive Summary
This document details the automated backup procedures, database recovery processes, secret restoration workflows, and Recovery Point/Time Objectives (RPO/RTO) for the **Engine (AeroTwin)** system.

---

## 1. Disaster Recovery Objectives

- **Recovery Point Objective (RPO)**: **15 Minutes** (Maximum acceptable telemetry / audit log loss).
- **Recovery Time Objective (RTO)**: **1 Hour** (Maximum acceptable application downtime).

---

## 2. Backup Inventory & Schedule

| Data Target | Backup Mechanism | Frequency | Storage Location | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase PostgreSQL Database** | Automated Supabase Point-In-Time (PITR) Snapshots | Daily / Continuous WAL | Isolated Supabase Vault | 30 Days |
| **Local Mission Recordings** | Automated JSON Snapshot Sync (`data/missions/`) | Hourly | Remote Encrypted Object Storage (S3) | 90 Days |
| **Security Audit Logs** | Atomic File Persistence (`data/security_audit.json`) | Real-time | Local Disk + Hourly Offsite Sync | 90 Days |
| **Pre-trained ML Models** | Version-Controlled Repository / Asset Storage | On Model Update | `models/` Artifact Vault | Permanent |

---

## 3. Database Restoration Procedure

1. **Access Point-In-Time Recovery**: Log in to Supabase Management Console or DB Admin Tool.
2. **Select Recovery Snapshot**: Choose target restore timestamp preceding the incident window.
3. **Execute Pitr Restore**: Trigger DB restore to target staging instance.
4. **Verify Schema & RLS**: Confirm database schema (`supabase_complete_setup.sql`) and Row-Level Security policies are active.
5. **Update Backend Connection**: Update `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in environment config if instance URL changed.
6. **Verify API Integrity**: Run `python -m pytest tests/test_security.py` to confirm authorization and data integrity.

---

## 4. Application Redeployment & Secret Restoration

1. **Codebase Pull**: Fetch verified Git commit hash from protected branch (`Multiple-dashboards` / `main`).
2. **Environment Variable Injection**: Restore `.env` file from secure password manager / secrets vault.
3. **Dependency Installation**: Run `pip install -r requirements.txt` and `npm ci` in `frontend/`.
4. **Service Launch**: Run `python run.py` (or systemd / Docker daemon).
5. **Health Verification**: Check `http://localhost:8000/` root status and verify WebSocket connection on `http://localhost:3000`.

---

## 5. Rollback Procedure

If a deployed update introduces critical security vulnerabilities or severe operational regressions:
1. Immediately stop running application daemon (`python run.py`).
2. Revert codebase to last known stable commit hash using `git checkout <stable_commit_hash>`.
3. Verify test suite: `python -m pytest tests/test_security.py tests/test_phase3_security.py tests/security/`.
4. Relaunch services: `python run.py`.
