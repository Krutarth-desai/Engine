from enum import Enum
from typing import Set, Dict, Callable
from fastapi import HTTPException, status, Depends
from src.security.auth import UserContext, get_current_user
from src.security.logger import security_logger

class Role(str, Enum):
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"

class Permission(str, Enum):
    VIEW = "VIEW"
    CREATE = "CREATE"
    EDIT = "EDIT"
    DELETE = "DELETE"
    SHARE = "SHARE"
    MANAGE_USERS = "MANAGE_USERS"

# Role permissions matrix
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.ADMIN: {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT,
        Permission.DELETE,
        Permission.SHARE,
        Permission.MANAGE_USERS
    },
    Role.EDITOR: {
        Permission.VIEW,
        Permission.CREATE,
        Permission.EDIT
    },
    Role.VIEWER: {
        Permission.VIEW
    }
}

# Operational role to canonical RBAC role mapping
OPERATIONAL_ROLE_MAP: Dict[str, Role] = {
    "gcs_operator": Role.ADMIN,
    "propulsion_engineer": Role.EDITOR,
    "maintenance_tech": Role.EDITOR,
    "admin": Role.ADMIN,
    "editor": Role.EDITOR,
    "viewer": Role.VIEWER,
    "unset": Role.VIEWER
}

def get_canonical_role(raw_role: str) -> Role:
    """Map operational role string to canonical Role enum."""
    normalized = raw_role.lower().strip()
    return OPERATIONAL_ROLE_MAP.get(normalized, Role.VIEWER)

def has_permission(user_role: str, permission: Permission) -> bool:
    """Check if user's role grants permission."""
    canonical_role = get_canonical_role(user_role)
    user_perms = ROLE_PERMISSIONS.get(canonical_role, set())
    return permission in user_perms

def require_permission(required_permission: Permission) -> Callable:
    """FastAPI Dependency generator enforcing required permission."""
    async def permission_checker(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if not has_permission(current_user.role, required_permission):
            security_logger.log_event(
                action="DASHBOARD_VIEW_DENIED",
                user_id=current_user.user_id,
                result="DENIED",
                details=f"Role '{current_user.role}' lacks permission '{required_permission.value}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation forbidden: insufficient privileges (requires {required_permission.value})."
            )
        return current_user
    return permission_checker
