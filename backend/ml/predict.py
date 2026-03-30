"""
ML model inference and SHAP-based explanations.
"""

import os
import numpy as np
import pandas as pd
import joblib
from ml.features import engineer_features
from config import ML_MODEL_PATH


# Load model on import (singleton)
_model_artifact = None


def _load_model():
    global _model_artifact
    if _model_artifact is None:
        if not os.path.exists(ML_MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {ML_MODEL_PATH}. "
                "Run 'python ml/train_model.py' first."
            )
        _model_artifact = joblib.load(ML_MODEL_PATH)
    return _model_artifact


def predict_risk(txn: dict) -> dict:
    """
    Predict risk score for a single transaction.

    Returns:
        {
            "risk_score": float (0-1),
            "risk_label": "low" | "medium" | "high",
            "risk_probabilities": {"low": float, "medium": float, "high": float},
            "top_features": [{"feature": str, "importance": float}, ...]
        }
    """
    artifact = _load_model()
    model = artifact["model"]
    trained_columns = artifact["feature_columns"]

    # Create DataFrame for single transaction
    df = pd.DataFrame([txn])

    # Engineer features
    features = engineer_features(df)

    # Align columns with training data
    for col in trained_columns:
        if col not in features.columns:
            features[col] = 0
    features = features[trained_columns]

    # Predict
    probabilities = model.predict_proba(features)[0]
    predicted_class = model.predict(features)[0]

    # Risk score: weighted combination favoring high risk
    # Score = P(medium)*0.5 + P(high)*1.0
    risk_score = float(probabilities[1] * 0.5 + probabilities[2] * 1.0) if len(probabilities) == 3 else float(probabilities[-1])
    risk_score = min(max(risk_score, 0.0), 1.0)  # Clamp to [0, 1]

    labels = ["low", "medium", "high"]
    risk_label = labels[predicted_class] if predicted_class < len(labels) else "low"

    # Feature importances (from the model, not SHAP — faster)
    importances = model.feature_importances_
    feature_importance_pairs = sorted(
        zip(trained_columns, importances),
        key=lambda x: x[1],
        reverse=True,
    )
    top_features = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in feature_importance_pairs[:10]
    ]

    risk_probabilities = {}
    for i, label in enumerate(labels):
        if i < len(probabilities):
            risk_probabilities[label] = round(float(probabilities[i]), 4)
        else:
            risk_probabilities[label] = 0.0

    return {
        "risk_score": round(risk_score, 4),
        "risk_label": risk_label,
        "risk_probabilities": risk_probabilities,
        "top_features": top_features,
    }
