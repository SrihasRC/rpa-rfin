"""
Authentication module — JWT-based user authentication.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt

from supabase_client import get_supabase_client

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "regtech-cfms-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer(auto_error=False)


class UserResponse(BaseModel):
    """User data returned after authentication."""

    account_id: str
    email: str
    first_name: str
    last_name: str
    country: str
    role: str
    kyc_status: str
    account_age_days: int
    balance: float


class LoginRequest(BaseModel):
    """Login request payload."""

    email: str
    password: str


class SignupRequest(BaseModel):
    """Signup request payload."""

    email: str
    password: str
    first_name: str
    last_name: str
    country: str = "US"


class TokenResponse(BaseModel):
    """Token response after login/signup."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[dict]:
    """
    Get the current authenticated user from the JWT token.
    Returns None if no valid token is provided.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        return None

    account_id = payload.get("account_id")
    if not account_id:
        return None

    # Fetch fresh user data from database
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("users")
            .select("*")
            .eq("account_id", account_id)
            .single()
            .execute()
        )
        if response.data:
            return response.data
    except Exception:
        pass

    return None


async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Require a valid authenticated user (non-admin).
    Raises 401 if not authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_current_user(credentials)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Require an authenticated admin user.
    Raises 401 if not authenticated or 403 if not admin.
    """
    user = await require_user(credentials)

    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


def generate_account_id() -> str:
    """Generate a unique account ID."""
    import uuid

    return f"ACC_{uuid.uuid4().hex[:8].upper()}"


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by email and password.
    Returns user data if valid, None otherwise.
    """
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("users")
            .select("*")
            .eq("email", email.lower())
            .eq("password_hash", password)  # In production, use proper password hashing
            .single()
            .execute()
        )
        if response.data and response.data.get("is_active", True):
            return response.data
    except Exception:
        pass
    return None


async def create_user(signup_data: SignupRequest) -> Optional[dict]:
    """
    Create a new user account.
    Returns user data if successful, None if email already exists.
    """
    try:
        supabase = get_supabase_client()

        # Check if email already exists
        existing = (
            supabase.table("users")
            .select("id")
            .eq("email", signup_data.email.lower())
            .execute()
        )
        if existing.data:
            return None

        # Create new user
        account_id = generate_account_id()
        user_data = {
            "account_id": account_id,
            "email": signup_data.email.lower(),
            "password_hash": signup_data.password,  # In production, use proper password hashing
            "first_name": signup_data.first_name,
            "last_name": signup_data.last_name,
            "country": signup_data.country.upper(),
            "role": "user",
            "kyc_status": "verified",  # Auto-verify for demo
            "account_age_days": 0,
            "balance": 10000.00,  # Starting balance for demo
            "is_active": True,
        }

        response = supabase.table("users").insert(user_data).execute()
        if response.data:
            return response.data[0]
    except Exception as e:
        print(f"Error creating user: {e}")
    return None
