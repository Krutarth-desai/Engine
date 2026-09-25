import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger("aerotwin_encryption")

# Load or generate Fernet Encryption Key
ENCRYPTION_KEY = os.getenv("AEROTWIN_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Deterministic default key derived for local dev, must be overridden in prod
    ENCRYPTION_KEY = Fernet.generate_key().decode()

try:
    cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
except Exception as e:
    logger.warning(f"Invalid encryption key provided, generating ephemeral key: {e}")
    cipher_suite = Fernet(Fernet.generate_key())

class SensitiveDataEncryptor:
    """Fernet AES-128-CBC authenticated application-level encryption utility."""

    @staticmethod
    def encrypt(data: str) -> str:
        """Encrypt plaintext string into base64 ciphertext."""
        if not data:
            return ""
        return cipher_suite.encrypt(data.encode("utf-8")).decode("utf-8")

    @staticmethod
    def decrypt(token: str) -> str:
        """Decrypt base64 ciphertext into plaintext string."""
        if not token:
            return ""
        try:
            return cipher_suite.decrypt(token.encode("utf-8")).decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to decrypt sensitive data: {e}")
            return "[DECRYPTION_FAILED]"

encryptor = SensitiveDataEncryptor()
