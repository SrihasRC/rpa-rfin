"""
Final Decision Logic — combines rule engine results and ML risk score
to produce a definitive risk classification.
"""

from config import (
    ML_RISK_HIGH_THRESHOLD,
    ML_RISK_MEDIUM_THRESHOLD,
    HIGH_RISK_RULE_COUNT,
    HIGH_RISK_COMBINED_ML,
    MEDIUM_RISK_RULE_COUNT,
)


def determine_final_risk(rule_result: dict, ml_result: dict) -> str:
    """
    Combine rule engine and ML model outputs to determine final risk level.

    Decision matrix:
    - HIGH: sanctions match OR ML score > 0.8 OR (3+ rules AND ML > 0.5)
    - MEDIUM: 2+ rules OR ML score 0.4-0.8
    - LOW: everything else

    Returns: "HIGH", "MEDIUM", or "LOW"
    """
    rules_count = rule_result.get("rules_count", 0)
    has_sanctions = rule_result.get("has_sanctions_match", False)
    ml_score = ml_result.get("risk_score", 0.0)

    # --- HIGH RISK ---
    if has_sanctions:
        return "HIGH"

    if ml_score > ML_RISK_HIGH_THRESHOLD:
        return "HIGH"

    if rules_count >= HIGH_RISK_RULE_COUNT and ml_score > HIGH_RISK_COMBINED_ML:
        return "HIGH"

    # --- MEDIUM RISK ---
    if rules_count >= MEDIUM_RISK_RULE_COUNT:
        return "MEDIUM"

    if ml_score > ML_RISK_MEDIUM_THRESHOLD:
        return "MEDIUM"

    # Combined: even 1 rule with moderate ML score
    if rules_count >= 1 and ml_score > 0.3:
        return "MEDIUM"

    # --- LOW RISK ---
    return "LOW"
