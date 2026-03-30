"""
Rule Engine — orchestrates running all compliance rules against a transaction.
"""

from rules.rule_definitions import ALL_RULES


def evaluate_transaction(txn: dict) -> dict:
    """
    Run all compliance rules against a transaction.

    Returns:
        {
            "rules_triggered": [
                {"id": "R001", "name": "...", "source": "...", "details": "..."},
                ...
            ],
            "rules_count": int,
            "rule_ids": ["R001", "R003", ...],
            "has_sanctions_match": bool,
        }
    """
    triggered = []

    for rule in ALL_RULES:
        is_triggered, details = rule["fn"](txn)
        if is_triggered:
            triggered.append({
                "id": rule["id"],
                "name": rule["name"],
                "source": rule["source"],
                "details": details,
            })

    return {
        "rules_triggered": triggered,
        "rules_count": len(triggered),
        "rule_ids": [r["id"] for r in triggered],
        "has_sanctions_match": any(r["id"] == "R004" for r in triggered),
    }
