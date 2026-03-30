"""
Feature engineering for the ML risk model.
Transforms raw transaction data into model-ready features.
"""

import pandas as pd
import numpy as np
from config import CURRENCY_TO_USD, HIGH_RISK_COUNTRIES


def to_usd(amount: float, currency: str) -> float:
    """Convert amount to USD equivalent."""
    return amount * CURRENCY_TO_USD.get(currency, 1.0)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw transaction DataFrame into ML features.
    Returns a DataFrame with only the feature columns needed for the model.
    """
    features = pd.DataFrame()

    # Amount in USD
    features["amount_usd"] = df.apply(
        lambda row: to_usd(row["amount"], row["currency"]), axis=1
    )

    # Log-transformed amount (reduces skewness)
    features["log_amount_usd"] = np.log1p(features["amount_usd"])

    # Account age
    features["sender_account_age_days"] = df["sender_account_age_days"].astype(float)

    # Is new account (< 30 days)
    features["is_new_account"] = (features["sender_account_age_days"] < 30).astype(int)

    # Country risk flags
    features["sender_high_risk_country"] = df["sender_country"].isin(HIGH_RISK_COUNTRIES).astype(int)
    features["receiver_high_risk_country"] = df["receiver_country"].isin(HIGH_RISK_COUNTRIES).astype(int)
    features["cross_border"] = (df["sender_country"] != df["receiver_country"]).astype(int)

    # KYC encoding
    kyc_map = {"verified": 0, "pending": 1, "incomplete": 2, "expired": 3}
    features["kyc_risk_score"] = df["kyc_status"].map(kyc_map).fillna(2).astype(float)

    # Boolean flags
    features["is_sanctioned"] = df["is_sanctioned_entity"].astype(int)
    features["is_pep"] = df["is_pep"].astype(int)

    # Transaction frequency features
    features["txn_count_last_24h"] = df["txn_count_last_24h"].astype(float)
    features["txn_count_last_7d"] = df["txn_count_last_7d"].astype(float)
    features["txn_count_last_30d"] = df["txn_count_last_30d"].astype(float)

    # Behavioral anomaly: amount vs average
    features["avg_txn_amount_30d"] = df["avg_txn_amount_30d"].astype(float)
    features["amount_to_avg_ratio"] = np.where(
        features["avg_txn_amount_30d"] > 0,
        features["amount_usd"] / features["avg_txn_amount_30d"],
        1.0,
    )

    # Beneficiary patterns
    features["same_beneficiary_count_7d"] = df["same_beneficiary_count_7d"].astype(float)

    # Dormancy
    features["days_since_last_txn"] = df["days_since_last_txn"].astype(float)
    features["is_dormant_reactivation"] = (features["days_since_last_txn"] > 90).astype(int)

    # Round amount flag
    features["is_round_amount"] = df["is_round_amount"].astype(int)

    # Transaction type encoding
    txn_type_dummies = pd.get_dummies(df["transaction_type"], prefix="txn_type")
    features = pd.concat([features, txn_type_dummies], axis=1)

    # Currency encoding
    currency_dummies = pd.get_dummies(df["currency"], prefix="curr")
    features = pd.concat([features, currency_dummies], axis=1)

    return features


# Feature column list (for consistent ordering during inference)
FEATURE_COLUMNS = [
    "amount_usd", "log_amount_usd", "sender_account_age_days", "is_new_account",
    "sender_high_risk_country", "receiver_high_risk_country", "cross_border",
    "kyc_risk_score", "is_sanctioned", "is_pep",
    "txn_count_last_24h", "txn_count_last_7d", "txn_count_last_30d",
    "avg_txn_amount_30d", "amount_to_avg_ratio",
    "same_beneficiary_count_7d", "days_since_last_txn", "is_dormant_reactivation",
    "is_round_amount",
]
