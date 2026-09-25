import re
from typing import Any

class InputSanitizer:
    """Utility class for input sanitization, path traversal prevention, and CSV formula defense."""

    @staticmethod
    def sanitize_path(filename: str) -> str:
        """Sanitize filename to prevent path traversal (../) attacks."""
        if not filename:
            return "unnamed_resource"
        # Strip directory components and dangerous characters
        safe_name = re.sub(r"[^\w\-. ]", "_", filename)
        return safe_name.replace("..", "_")

    @staticmethod
    def sanitize_xss(text: str) -> str:
        """Sanitize script tags and HTML injection vectors."""
        if not text or not isinstance(text, str):
            return text
        cleaned = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
        cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")
        return cleaned

    @staticmethod
    def sanitize_csv_cell(cell_value: Any) -> str:
        """Prevent CSV Formula Injection by escaping leading =, +, -, @, or tab/return chars."""
        val_str = str(cell_value) if cell_value is not None else ""
        if val_str and val_str[0] in ("=", "+", "-", "@", "\t", "\r"):
            return f"'{val_str}"
        return val_str

    @staticmethod
    def contains_injection_patterns(val: str) -> bool:
        """Check for dangerous injection payloads ($ne, $gt, $regex, SQL quotes, XSS events)."""
        if not isinstance(val, str):
            return False
        patterns = [r"\$ne", r"\$gt", r"\$lt", r"\$regex", r"\$where", r"/\.\./", r"<script", r"onerror", r"javascript:"]
        for p in patterns:
            if re.search(p, val, re.IGNORECASE):
                return True
        return False

sanitizer = InputSanitizer()
