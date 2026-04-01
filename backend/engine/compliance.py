"""
Main Compliance Orchestrator — the core pipeline that ties everything together.
Transaction → Rules → ML → Decision → Explanation
"""

from rules.rule_engine import evaluate_transaction
from ml.predict import predict_risk
from engine.decision import determine_final_risk
from engine.explanation import generate_explanation


def run_compliance_check(txn: dict) -> dict:
    """
    Run the full compliance pipeline on a single transaction.

    Args:
        txn: Transaction data dictionary

    Returns:
        Full compliance result including risk score, triggered rules,
        ML insights, explanation, and final risk classification.
    """
    # Ensure boolean fields are actual booleans
    txn["is_sanctioned_entity"] = _to_bool(txn.get("is_sanctioned_entity", False))
    txn["is_pep"] = _to_bool(txn.get("is_pep", False))
    txn["is_round_amount"] = _to_bool(txn.get("is_round_amount", False))

    # Ensure numeric fields
    numeric_fields = [
        "amount",
        "sender_account_age_days",
        "txn_count_last_24h",
        "txn_count_last_7d",
        "txn_count_last_30d",
        "avg_txn_amount_30d",
        "same_beneficiary_count_7d",
        "days_since_last_txn",
    ]
    for field in numeric_fields:
        if field in txn:
            try:
                txn[field] = float(txn[field])
            except (ValueError, TypeError):
                txn[field] = 0.0

    # Step 1: Rule Engine
    rule_result = evaluate_transaction(txn)

    # Step 2: ML Risk Scoring
    ml_result = predict_risk(txn)

    # Step 3: Final Decision (now includes txn data for amount-based decisions)
    final_risk = determine_final_risk(rule_result, ml_result, txn)

    # Step 4: Generate Explanation
    explanation = generate_explanation(txn, rule_result, ml_result, final_risk)

    return {
        "transaction_id": txn.get("transaction_id", "unknown"),
        "amount": txn.get("amount"),
        "currency": txn.get("currency", "USD"),
        "risk_score": ml_result["risk_score"],
        "final_risk": final_risk,
        "rules_triggered": rule_result["rules_triggered"],
        "rules_count": rule_result["rules_count"],
        "ml_result": ml_result,
        "explanation": explanation,
    }


def _to_bool(val) -> bool:
    """Convert various representations to boolean."""
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("true", "1", "yes")
    return bool(val)
