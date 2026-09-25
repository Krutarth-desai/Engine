#!/usr/bin/env python3
"""
AeroTwin DevSecOps - Automated Repository Secret Scanner
=========================================================
Scans repository source files, configuration templates, and codebase for
potential hardcoded API keys, private keys, database credentials, or secret tokens.
Exits with code 0 if clean, or code 1 if potential hardcoded secrets are detected.
"""

import os
import re
import sys
from typing import List, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SECRET_PATTERNS = [
    (r"BEGIN PRIVATE KEY", "RSA/PKCS Private Key"),
    (r"AWS_SECRET_ACCESS_KEY\s*=\s*['\"][A-Za-z0-9/\+=]{20,}['\"]", "AWS Secret Key"),
    (r"SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"]ey[A-Za-z0-9_-]{30,}['\"]", "Live Supabase Service Key"),
    (r"SUPABASE_JWT_SECRET\s*=\s*['\"][A-Za-z0-9_-]{20,}['\"]", "Hardcoded Production JWT Secret"),
    (r"postgres://[a-zA-Z0-9]+:[a-zA-Z0-9]+@", "Database Connection String with Credentials"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
]

EXCLUDE_DIRS = {".git", ".pytest_cache", "node_modules", "venv", "__pycache__", ".next", "dist"}
EXCLUDE_FILES = {"secret_scanner.py", "test_security.py", "test_auth_security.py", "auth.py", ".env.example"}

def scan_file(file_path: str) -> List[Tuple[int, str, str]]:
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for idx, line in enumerate(f, 1):
                # Ignore comment lines explaining placeholders or default dev credentials
                if line.strip().startswith("#") or "your-" in line or "placeholder" in line.lower():
                    continue
                for pattern, name in SECRET_PATTERNS:
                    if re.search(pattern, line):
                        findings.append((idx, name, line.strip()[:60]))
    except Exception:
        pass
    return findings

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("==================================================")
    print("AeroTwin DevSecOps -- Secret Scanner")
    print("==================================================")
    
    total_scanned = 0
    total_issues = 0

    for current_root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file in EXCLUDE_FILES:
                continue
            if file.endswith((".py", ".ts", ".tsx", ".json", ".md", ".env", ".yml", ".yaml")):
                file_path = os.path.join(current_root, file)
                total_scanned += 1
                findings = scan_file(file_path)
                if findings:
                    rel_path = os.path.relpath(file_path, root_dir)
                    print(f"\n[ALERT] Secrets detected in {rel_path}:")
                    for line_num, secret_type, snippet in findings:
                        print(f"  Line {line_num}: {secret_type} -> {snippet}...")
                        total_issues += 1

    print("\n" + "=" * 50)
    if total_issues == 0:
        print(f"[PASS] Scanned {total_scanned} files. Zero hardcoded secrets detected.")
        sys.exit(0)
    else:
        print(f"[FAIL] Scanned {total_scanned} files. Found {total_issues} potential secret leaks!")
        sys.exit(1)

if __name__ == "__main__":
    main()
