"""
Configuration constants for the RegTech compliance system.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# --- Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# --- Currency Exchange Rates to USD ---
# Approximate rates for threshold normalization
CURRENCY_TO_USD: dict[str, float] = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.27,
    "INR": 0.012,
    "JPY": 0.0067,
    "AUD": 0.65,
    "CAD": 0.74,
    "SGD": 0.74,
    "AED": 0.27,
    "CHF": 1.13,
}

SUPPORTED_CURRENCIES = list(CURRENCY_TO_USD.keys())

# --- Rule Thresholds (in USD equivalent) ---
HIGH_VALUE_THRESHOLD_USD = 10_000
STRUCTURING_THRESHOLD_USD = 9_500  # Just below CTR threshold
NEW_ACCOUNT_LARGE_TRANSFER_USD = 5_000
NEW_ACCOUNT_AGE_DAYS = 30
DORMANT_DAYS_THRESHOLD = 90
RAPID_SUCCESSION_COUNT = 5  # In 24 hours
REPEATED_BENEFICIARY_COUNT = 3  # In 7 days
ROUND_AMOUNT_THRESHOLD_USD = 5_000

# --- FATF High-Risk Countries (grey/black list - simplified) ---
HIGH_RISK_COUNTRIES = [
    "IR",  # Iran
    "KP",  # North Korea
    "MM",  # Myanmar
    "SY",  # Syria
    "YE",  # Yemen
    "AF",  # Afghanistan
    "PK",  # Pakistan (grey list)
    "NG",  # Nigeria (grey list)
    "TZ",  # Tanzania (grey list)
]

# --- Sanctioned Entities (simplified OFAC-style list) ---
SANCTIONED_ENTITIES = [
    "SANCTIONED_ENTITY_001",
    "SANCTIONED_ENTITY_002",
    "SANCTIONED_ENTITY_003",
    "BLOCKED_ORG_ALPHA",
    "BLOCKED_ORG_BETA",
]

# --- ML Model ---
ML_MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "model.pkl")
ML_RISK_HIGH_THRESHOLD = 0.75  # Lowered from 0.8 to catch more high-risk
ML_RISK_MEDIUM_THRESHOLD = 0.4

# --- Decision Thresholds ---
HIGH_RISK_RULE_COUNT = 3
HIGH_RISK_COMBINED_ML = 0.5
MEDIUM_RISK_RULE_COUNT = 2

# --- Amount-based escalation (in USD) ---
VERY_HIGH_VALUE_THRESHOLD_USD = 50_000  # Amounts above this get extra scrutiny
