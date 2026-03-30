"""
Explanation Engine — generates human-readable explanations for compliance decisions.
Template-based approach that combines rule results and ML insights.
"""

from config import CURRENCY_TO_USD


def _to_usd(amount: float, currency: str) -> float:
    return amount * CURRENCY_TO_USD.get(currency, 1.0)


def generate_explanation(
    txn: dict,
    rule_result: dict,
    ml_result: dict,
    final_risk: str,
) -> dict:
    """
    Generate a structured, human-readable explanation for the compliance decision.

    Returns:
        {
            "summary": str,           # One-line summary
            "risk_level": str,        # LOW / MEDIUM / HIGH
            "reasons": [str, ...],    # List of reason strings
            "rule_details": [...],    # Triggered rules with details
            "ml_insights": {...},     # ML model interpretation
            "recommendation": str,    # Suggested action
        }
    """
    reasons = []
    recommendation = ""

    # --- Rule-based reasons ---
    for rule in rule_result.get("rules_triggered", []):
        reasons.append(f"[{rule['source']}] {rule['name']}: {rule['details']}")

    # --- ML-based reasons ---
    ml_score = ml_result.get("risk_score", 0)
    ml_label = ml_result.get("risk_label", "low")
    top_features = ml_result.get("top_features", [])

    if ml_score > 0.6:
        # Identify top contributing factors
        significant_features = [f for f in top_features[:5] if f["importance"] > 0.05]
        if significant_features:
            feature_names = [_format_feature_name(f["feature"]) for f in significant_features]
            reasons.append(
                f"[ML Model] Behavioral risk score: {ml_score:.2f} — "
                f"key contributing factors: {', '.join(feature_names)}"
            )
        else:
            reasons.append(
                f"[ML Model] Behavioral risk score: {ml_score:.2f} — "
                f"overall transaction pattern flagged as {ml_label} risk"
            )

    # --- Amount context ---
    amount = txn.get("amount", 0)
    currency = txn.get("currency", "USD")
    usd_equiv = _to_usd(amount, currency)
    avg_30d = txn.get("avg_txn_amount_30d", 0)

    if avg_30d > 0 and usd_equiv > avg_30d * 3:
        reasons.append(
            f"[Behavioral] Transaction amount ({currency} {amount:,.2f}) is "
            f"{usd_equiv / avg_30d:.1f}x the 30-day average"
        )

    # --- Summary ---
    rules_count = rule_result.get("rules_count", 0)
    summary_parts = []

    if final_risk == "HIGH":
        summary_parts.append("HIGH RISK transaction detected")
        if rule_result.get("has_sanctions_match"):
            summary_parts.append("— sanctions match identified")
        elif rules_count >= 3:
            summary_parts.append(f"— {rules_count} compliance rules triggered")
        recommendation = (
            "IMMEDIATE REVIEW REQUIRED. Escalate to compliance officer. "
            "Consider filing a Suspicious Activity Report (SAR)."
        )
    elif final_risk == "MEDIUM":
        summary_parts.append("MEDIUM RISK — enhanced monitoring recommended")
        summary_parts.append(f"({rules_count} rule(s) triggered, ML score: {ml_score:.2f})")
        recommendation = (
            "Enhanced due diligence recommended. Monitor account for further activity. "
            "Document findings for audit trail."
        )
    else:
        summary_parts.append("LOW RISK — transaction within normal parameters")
        recommendation = "No action required. Transaction processed normally."

    summary = " ".join(summary_parts)

    # --- ML insights block ---
    ml_insights = {
        "risk_score": ml_score,
        "risk_label": ml_label,
        "probabilities": ml_result.get("risk_probabilities", {}),
        "top_contributing_features": [
            {"feature": _format_feature_name(f["feature"]), "importance": f["importance"]}
            for f in top_features[:5]
        ],
    }

    return {
        "summary": summary,
        "risk_level": final_risk,
        "reasons": reasons if reasons else ["No significant risk indicators detected."],
        "rule_details": rule_result.get("rules_triggered", []),
        "ml_insights": ml_insights,
        "recommendation": recommendation,
    }


def _format_feature_name(feature: str) -> str:
    """Convert ML feature name to human-readable format."""
    name_map = {
        "amount_usd": "transaction amount (USD)",
        "log_amount_usd": "transaction amount scale",
        "sender_account_age_days": "account age",
        "is_new_account": "new account flag",
        "sender_high_risk_country": "sender country risk",
        "receiver_high_risk_country": "receiver country risk",
        "cross_border": "cross-border transfer",
        "kyc_risk_score": "KYC verification status",
        "is_sanctioned": "sanctions screening",
        "is_pep": "PEP status",
        "txn_count_last_24h": "24-hour transaction frequency",
        "txn_count_last_7d": "7-day transaction frequency",
        "txn_count_last_30d": "30-day transaction frequency",
        "avg_txn_amount_30d": "30-day average transaction amount",
        "amount_to_avg_ratio": "amount deviation from average",
        "same_beneficiary_count_7d": "repeated beneficiary pattern",
        "days_since_last_txn": "account dormancy period",
        "is_dormant_reactivation": "dormant account reactivation",
        "is_round_amount": "round amount pattern",
    }
    return name_map.get(feature, feature.replace("_", " "))
