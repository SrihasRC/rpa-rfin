"""
Rule definitions for the compliance rule engine.
12 regulatory rules derived from BSA, FATF, OFAC, KYC, and AML guidelines.
All monetary thresholds are normalized to USD-equivalent using currency exchange rates.
"""

from config import (
    CURRENCY_TO_USD,
    HIGH_VALUE_THRESHOLD_USD,
    STRUCTURING_THRESHOLD_USD,
    HIGH_RISK_COUNTRIES,
    SANCTIONED_ENTITIES,
    NEW_ACCOUNT_LARGE_TRANSFER_USD,
    NEW_ACCOUNT_AGE_DAYS,
    DORMANT_DAYS_THRESHOLD,
    RAPID_SUCCESSION_COUNT,
    REPEATED_BENEFICIARY_COUNT,
    ROUND_AMOUNT_THRESHOLD_USD,
)


def _to_usd(amount: float, currency: str) -> float:
    """Convert an amount to USD equivalent."""
    rate = CURRENCY_TO_USD.get(currency, 1.0)
    return amount * rate


# --- Individual Rule Functions ---
# Each returns (triggered: bool, details: str)


def rule_high_value_transaction(txn: dict) -> tuple[bool, str]:
    """BSA/CTR: Flag transactions exceeding $10,000 USD equivalent."""
    usd_amount = _to_usd(txn["amount"], txn["currency"])
    if usd_amount > HIGH_VALUE_THRESHOLD_USD:
        return True, (
            f"Transaction amount {txn['currency']} {txn['amount']:,.2f} "
            f"(≈ USD {usd_amount:,.2f}) exceeds CTR threshold of USD {HIGH_VALUE_THRESHOLD_USD:,}"
        )
    return False, ""


def rule_structuring_detection(txn: dict) -> tuple[bool, str]:
    """BSA: Detect potential structuring — multiple transactions just below threshold in 24h."""
    usd_amount = _to_usd(txn["amount"], txn["currency"])
    is_just_below = STRUCTURING_THRESHOLD_USD * 0.8 <= usd_amount <= HIGH_VALUE_THRESHOLD_USD
    high_frequency = txn.get("txn_count_last_24h", 0) >= 3

    if is_just_below and high_frequency:
        return True, (
            f"Potential structuring: amount {txn['currency']} {txn['amount']:,.2f} "
            f"(≈ USD {usd_amount:,.2f}) is just below CTR threshold with "
            f"{txn['txn_count_last_24h']} transactions in the last 24 hours"
        )
    return False, ""


def rule_high_risk_country(txn: dict) -> tuple[bool, str]:
    """FATF: Flag transfers involving FATF grey/black list countries."""
    sender = txn.get("sender_country", "")
    receiver = txn.get("receiver_country", "")
    flagged = []

    if sender in HIGH_RISK_COUNTRIES:
        flagged.append(f"sender country ({sender})")
    if receiver in HIGH_RISK_COUNTRIES:
        flagged.append(f"receiver country ({receiver})")

    if flagged:
        return True, f"High-risk jurisdiction involved: {', '.join(flagged)} — FATF grey/black list"
    return False, ""


def rule_sanctions_match(txn: dict) -> tuple[bool, str]:
    """OFAC: Check if sender or receiver matches sanctioned entities list."""
    sender_id = txn.get("sender_id", "")
    receiver_id = txn.get("receiver_id", "")

    if txn.get("is_sanctioned_entity", False):
        return True, (
            f"OFAC sanctions match: entity involved in transaction "
            f"(sender: {sender_id}, receiver: {receiver_id}) appears on sanctions list"
        )
    return False, ""


def rule_incomplete_kyc(txn: dict) -> tuple[bool, str]:
    """KYC: Flag transactions where KYC verification is incomplete or expired."""
    kyc = txn.get("kyc_status", "verified")
    if kyc in ("incomplete", "expired", "pending"):
        return True, f"KYC verification status is '{kyc}' — transaction requires enhanced due diligence"
    return False, ""


def rule_pep_transaction(txn: dict) -> tuple[bool, str]:
    """FATF/AML: Flag transactions involving politically exposed persons."""
    if txn.get("is_pep", False):
        return True, "Transaction involves a Politically Exposed Person (PEP) — enhanced monitoring required"
    return False, ""


def rule_new_account_large_transfer(txn: dict) -> tuple[bool, str]:
    """AML: Flag large transfers from newly created accounts."""
    account_age = txn.get("sender_account_age_days", 999)
    usd_amount = _to_usd(txn["amount"], txn["currency"])

    if account_age < NEW_ACCOUNT_AGE_DAYS and usd_amount > NEW_ACCOUNT_LARGE_TRANSFER_USD:
        return True, (
            f"New account (age: {account_age} days) making large transfer of "
            f"{txn['currency']} {txn['amount']:,.2f} (≈ USD {usd_amount:,.2f})"
        )
    return False, ""


def rule_dormant_account_activity(txn: dict) -> tuple[bool, str]:
    """AML: Flag sudden activity on dormant accounts."""
    days_since_last = txn.get("days_since_last_txn", 0)
    if days_since_last > DORMANT_DAYS_THRESHOLD:
        return True, (
            f"Dormant account reactivated: no transactions for {days_since_last} days "
            f"(threshold: {DORMANT_DAYS_THRESHOLD} days)"
        )
    return False, ""


def rule_rapid_succession(txn: dict) -> tuple[bool, str]:
    """AML: Flag accounts with excessive transaction frequency."""
    count_24h = txn.get("txn_count_last_24h", 0)
    if count_24h >= RAPID_SUCCESSION_COUNT:
        return True, (
            f"Rapid succession: {count_24h} transactions in the last 24 hours "
            f"(threshold: {RAPID_SUCCESSION_COUNT})"
        )
    return False, ""


def rule_repeated_beneficiary(txn: dict) -> tuple[bool, str]:
    """AML: Flag repeated transfers to the same beneficiary in a short period."""
    same_ben_count = txn.get("same_beneficiary_count_7d", 0)
    if same_ben_count >= REPEATED_BENEFICIARY_COUNT:
        return True, (
            f"Repeated beneficiary: {same_ben_count} transfers to the same receiver "
            f"in 7 days (threshold: {REPEATED_BENEFICIARY_COUNT})"
        )
    return False, ""


def rule_round_amount_pattern(txn: dict) -> tuple[bool, str]:
    """AML: Flag suspicious round-amount transactions (common in money laundering)."""
    usd_amount = _to_usd(txn["amount"], txn["currency"])
    is_round = txn.get("is_round_amount", False)
    if is_round and usd_amount >= ROUND_AMOUNT_THRESHOLD_USD:
        return True, (
            f"Suspicious round amount: {txn['currency']} {txn['amount']:,.2f} "
            f"(≈ USD {usd_amount:,.2f}) — round amounts above USD {ROUND_AMOUNT_THRESHOLD_USD:,} "
            f"are a common laundering pattern"
        )
    return False, ""


def rule_velocity_anomaly(txn: dict) -> tuple[bool, str]:
    """Behavioral: Flag when current transaction frequency far exceeds historical average."""
    count_24h = txn.get("txn_count_last_24h", 0)
    count_30d = txn.get("txn_count_last_30d", 0)
    avg_daily_30d = count_30d / 30.0 if count_30d > 0 else 0

    if avg_daily_30d > 0 and count_24h > avg_daily_30d * 3 and count_24h >= 3:
        return True, (
            f"Velocity anomaly: {count_24h} transactions today vs. "
            f"average of {avg_daily_30d:.1f}/day over 30 days (3x+ deviation)"
        )
    return False, ""


# --- All Rules Registry ---
ALL_RULES = [
    {"id": "R001", "name": "High-Value Transaction", "source": "BSA/CTR", "fn": rule_high_value_transaction},
    {"id": "R002", "name": "Structuring Detection", "source": "BSA", "fn": rule_structuring_detection},
    {"id": "R003", "name": "High-Risk Country", "source": "FATF", "fn": rule_high_risk_country},
    {"id": "R004", "name": "Sanctions Match", "source": "OFAC", "fn": rule_sanctions_match},
    {"id": "R005", "name": "Incomplete KYC", "source": "KYC Regs", "fn": rule_incomplete_kyc},
    {"id": "R006", "name": "PEP Transaction", "source": "FATF/AML", "fn": rule_pep_transaction},
    {"id": "R007", "name": "New Account Large Transfer", "source": "AML", "fn": rule_new_account_large_transfer},
    {"id": "R008", "name": "Dormant Account Activity", "source": "AML", "fn": rule_dormant_account_activity},
    {"id": "R009", "name": "Rapid Succession", "source": "AML", "fn": rule_rapid_succession},
    {"id": "R010", "name": "Repeated Beneficiary", "source": "AML", "fn": rule_repeated_beneficiary},
    {"id": "R011", "name": "Round Amount Pattern", "source": "AML", "fn": rule_round_amount_pattern},
    {"id": "R012", "name": "Velocity Anomaly", "source": "Behavioral", "fn": rule_velocity_anomaly},
]
