"""
Train the ML risk scoring model.
Uses Gradient Boosting Classifier on the synthetic dataset.
Generates independent risk labels from data-driven composite scoring
(NOT from the rule engine) so the ML model adds genuine predictive value.
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib

# Add parent to path so we can import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml.features import engineer_features
from config import ML_MODEL_PATH, CURRENCY_TO_USD, HIGH_RISK_COUNTRIES


def generate_training_labels(df: pd.DataFrame) -> pd.Series:
    """
    Generate risk labels using data-driven composite scoring.

    This creates INDEPENDENT training targets that do NOT depend on the
    rule engine.  The ML model learns from raw transaction characteristics
    so it can surface non-obvious risk patterns that rules miss.

    Scoring dimensions (each 0-1, weighted):
      1. Amount anomaly          — how far the USD amount deviates from median
      2. Cross-border risk       — high-risk country involvement
      3. Behavioral velocity     — sudden spikes in txn frequency
      4. Account maturity risk   — new accounts with large transfers
      5. Sanctions / PEP flag    — direct entity-level flags
      6. KYC deficiency          — incomplete or expired verification
      7. Beneficiary repetition  — repeated transfers to same receiver
      8. Dormancy reactivation   — long-idle accounts suddenly active
    """
    scores = np.zeros(len(df), dtype=float)

    # --- 1. Amount anomaly (0.20 weight) ---
    usd_amounts = df.apply(
        lambda r: r["amount"] * CURRENCY_TO_USD.get(r["currency"], 1.0),
        axis=1,
    )
    median_amt = usd_amounts.median()
    std_amt = usd_amounts.std()
    if std_amt > 0:
        z_scores = (usd_amounts - median_amt) / std_amt
        amount_score = z_scores.clip(0, 4) / 4  # normalise to 0-1
    else:
        amount_score = pd.Series(0.0, index=df.index)
    scores += 0.20 * amount_score.values

    # --- 2. Cross-border + high-risk country (0.18 weight) ---
    sender_hr = df["sender_country"].isin(HIGH_RISK_COUNTRIES).astype(float)
    receiver_hr = df["receiver_country"].isin(HIGH_RISK_COUNTRIES).astype(float)
    cross_border = (df["sender_country"] != df["receiver_country"]).astype(float)
    country_score = (sender_hr * 0.4 + receiver_hr * 0.4 + cross_border * 0.2)
    scores += 0.18 * country_score.values

    # --- 3. Behavioral velocity (0.12 weight) ---
    txn_24h = df["txn_count_last_24h"].astype(float)
    txn_30d = df["txn_count_last_30d"].astype(float)
    avg_daily = txn_30d / 30.0
    # Spike ratio: how much today exceeds the daily average
    velocity_raw = np.where(avg_daily > 0, txn_24h / avg_daily, txn_24h)
    velocity_score = np.clip(velocity_raw / 5.0, 0, 1)  # 5x = max score
    scores += 0.12 * velocity_score

    # --- 4. Account maturity risk (0.12 weight) ---
    age_days = df["sender_account_age_days"].astype(float)
    # younger = riskier; scale: 0 days → 1.0, 365+ days → 0.0
    age_score = np.clip(1.0 - (age_days / 365.0), 0, 1)
    # Amplify if amount is also high
    high_amount_flag = (usd_amounts > 5000).astype(float)
    maturity_score = age_score * (0.6 + 0.4 * high_amount_flag)
    scores += 0.12 * maturity_score.values

    # --- 5. Sanctions / PEP (0.15 weight) ---
    is_sanctioned = df["is_sanctioned_entity"].apply(
        lambda v: str(v).lower() == "true" if isinstance(v, (str, bool)) else bool(v)
    ).astype(float)
    is_pep = df["is_pep"].apply(
        lambda v: str(v).lower() == "true" if isinstance(v, (str, bool)) else bool(v)
    ).astype(float)
    entity_score = np.clip(is_sanctioned + is_pep * 0.6, 0, 1)
    scores += 0.15 * entity_score.values

    # --- 6. KYC deficiency (0.08 weight) ---
    kyc_risk_map = {"verified": 0.0, "pending": 0.4, "incomplete": 0.8, "expired": 1.0}
    kyc_score = df["kyc_status"].map(kyc_risk_map).fillna(0.5).astype(float)
    scores += 0.08 * kyc_score.values

    # --- 7. Beneficiary repetition (0.08 weight) ---
    same_ben = df["same_beneficiary_count_7d"].astype(float)
    ben_score = np.clip(same_ben / 5.0, 0, 1)
    scores += 0.08 * ben_score

    # --- 8. Dormancy reactivation (0.07 weight) ---
    days_since = df["days_since_last_txn"].astype(float)
    dormancy_score = np.where(days_since > 0, np.clip(days_since / 180.0, 0, 1), 0)
    scores += 0.07 * dormancy_score

    # --- Convert composite score to ordinal labels ---
    labels = pd.Series(0, index=df.index)  # default LOW
    labels[scores >= 0.20] = 1              # MEDIUM
    labels[scores >= 0.45] = 2              # HIGH

    return labels


def train_model():
    """Train and save the risk scoring model."""
    # Load dataset
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "transactions.csv")
    print(f"Loading dataset from {data_path}")
    df = pd.read_csv(data_path)
    print(f"   Loaded {len(df)} transactions")

    # Generate features
    print("Engineering features...")
    X = engineer_features(df)

    # Generate labels — data-driven, NOT rule-based
    print("Generating data-driven training labels...")
    y = generate_training_labels(df)

    label_dist = y.value_counts().sort_index()
    print(f"   Label distribution: LOW={label_dist.get(0, 0)}, MEDIUM={label_dist.get(1, 0)}, HIGH={label_dist.get(2, 0)}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train Gradient Boosting model
    print("Training Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        min_samples_split=10,
        min_samples_leaf=5,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    print("\nClassification Report:")
    target_names = ["LOW", "MEDIUM", "HIGH"]
    print(classification_report(y_test, y_pred, target_names=target_names, zero_division=0))

    # AUC (one-vs-rest)
    try:
        auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
        print(f"   Weighted AUC-ROC: {auc:.4f}")
    except ValueError:
        print("   AUC-ROC: could not compute (single class in test set)")

    # Feature importances
    importances = model.feature_importances_
    feature_importance_pairs = sorted(
        zip(X_train.columns, importances),
        key=lambda x: x[1],
        reverse=True,
    )
    print("\nTop 10 Features:")
    for name, imp in feature_importance_pairs[:10]:
        print(f"   {name}: {imp:.4f}")

    # Save model
    os.makedirs(os.path.dirname(ML_MODEL_PATH), exist_ok=True)

    # Save model + feature columns for consistent inference
    artifact = {
        "model": model,
        "feature_columns": list(X_train.columns),
    }
    joblib.dump(artifact, ML_MODEL_PATH)
    print(f"\nModel saved to {ML_MODEL_PATH}")
    print(f"   Feature count: {len(X_train.columns)}")

    return model


if __name__ == "__main__":
    train_model()
