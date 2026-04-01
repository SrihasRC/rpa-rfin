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
    VERY_HIGH_VALUE_THRESHOLD_USD,
)


def determine_final_risk(
    rule_result: dict, ml_result: dict, txn_data: dict = None
) -> str:
    """
    Combine rule engine and ML model outputs to determine final risk level.

    Decision matrix:
    - HIGH: sanctions match OR ML score > 0.75 OR (3+ rules AND ML > 0.5)
            OR (very high amount > $50k AND limited history AND ML > 0.5)
    - MEDIUM: 2+ rules OR ML score 0.4-0.75
    - LOW: everything else

    Returns: "HIGH", "MEDIUM", or "LOW"
    """
    rules_count = rule_result.get("rules_count", 0)
    has_sanctions = rule_result.get("has_sanctions_match", False)
    ml_score = ml_result.get("risk_score", 0.0)

    # Extract transaction details for amount-based decisions
    amount_usd = 0
    txn_count_30d = 0
    avg_txn_30d = 0

    if txn_data:
        # Get amount in USD
        from config import CURRENCY_TO_USD

        currency = txn_data.get("currency", "USD")
        amount = float(txn_data.get("amount", 0))
        amount_usd = amount * CURRENCY_TO_USD.get(currency, 1.0)
        txn_count_30d = int(txn_data.get("txn_count_last_30d", 0))
        avg_txn_30d = float(txn_data.get("avg_txn_amount_30d", 0))

    # --- HIGH RISK ---
    if has_sanctions:
        return "HIGH"

    if ml_score > ML_RISK_HIGH_THRESHOLD:
        return "HIGH"

    if rules_count >= HIGH_RISK_RULE_COUNT and ml_score > HIGH_RISK_COMBINED_ML:
        return "HIGH"

    # NEW: Very high amounts with limited transaction history
    # If amount > $50k AND (no history OR amount is 3x+ their average) AND ML suggests risk
    if amount_usd > VERY_HIGH_VALUE_THRESHOLD_USD:
        is_anomalous = (txn_count_30d < 3) or (
            avg_txn_30d > 0 and amount_usd > avg_txn_30d * 3
        )
        if is_anomalous and ml_score > 0.5:
            return "HIGH"
        # Even with moderate ML, 2+ rules on very high amount should escalate
        if rules_count >= 2 and ml_score > 0.4:
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
