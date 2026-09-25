import pytest
from src.security.sanitizer import InputSanitizer, sanitizer

def test_nosql_injection_pattern_detection():
    """Verify sanitizer catches NoSQL query operators."""
    assert InputSanitizer.contains_injection_patterns('{"$gt": ""}') is True
    assert InputSanitizer.contains_injection_patterns('{"$ne": null}') is True
    assert InputSanitizer.contains_injection_patterns('{"$where": "this.a == this.b"}') is True
    assert InputSanitizer.contains_injection_patterns("normal_username_123") is False

def test_xss_script_pattern_detection():
    """Verify sanitizer catches script tags and event handlers."""
    assert InputSanitizer.contains_injection_patterns("<script>alert(1)</script>") is True
    assert InputSanitizer.contains_injection_patterns("<img src=x onerror=alert(1)>") is True
    assert InputSanitizer.contains_injection_patterns("javascript:alert(1)") is True
    assert InputSanitizer.contains_injection_patterns("Plain Text Note") is False

def test_path_traversal_sanitizer():
    """Verify path traversal characters are sanitized out."""
    assert InputSanitizer.sanitize_path("../../etc/passwd") == "____etc_passwd"
    assert InputSanitizer.sanitize_path("..\\..\\windows\\system32") == "____windows_system32"
    assert InputSanitizer.sanitize_path("mission_2026_09_25") == "mission_2026_09_25"

def test_csv_cell_formula_escaping():
    """Verify formula injection triggers (=, +, -, @) are escaped."""
    assert InputSanitizer.sanitize_csv_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert InputSanitizer.sanitize_csv_cell("+100") == "'+100"
    assert InputSanitizer.sanitize_csv_cell("-50") == "'-50"
    assert InputSanitizer.sanitize_csv_cell("@EXEC('cmd')") == "'@EXEC('cmd')"
    assert InputSanitizer.sanitize_csv_cell("SafeData123") == "SafeData123"
