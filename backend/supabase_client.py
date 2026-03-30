"""
Supabase client initialization.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY


def get_supabase_client() -> Client:
    """Get a Supabase client using the anon key."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_supabase_admin_client() -> Client:
    """Get a Supabase client using the service role key (admin ops)."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
