import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import warnings

# Security Configuration
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET") or "aerotwin-default-jwt-secret-key-change-in-prod"
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

class UserContext(BaseModel):
    user_id: str
    email: str
    role: str
    token_claims: Dict[str, Any] = {}

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify JWT token signature and expiry."""
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unverified authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    token: Optional[str] = Query(None)
) -> UserContext:
    """FastAPI Dependency for extract & verify authenticated user context."""
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        # Local development guest fallback if strict auth disabled
        allow_guest = os.getenv("ALLOW_ANONYMOUS_GUEST", "true").lower() == "true"
        if allow_guest:
            return UserContext(
                user_id="usr_guest_operator",
                email="operator@aerotwin.local",
                role="gcs_operator",
                token_claims={"role": "gcs_operator", "sub": "usr_guest_operator"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header or token query parameter.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_token(raw_token)
    user_id = claims.get("sub") or claims.get("user_id") or claims.get("id")
    email = claims.get("email") or "user@aerotwin.io"
    role = claims.get("role") or claims.get("user_metadata", {}).get("role") or "viewer"

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing sub/user_id.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserContext(
        user_id=str(user_id),
        email=str(email),
        role=str(role),
        token_claims=claims
    )
