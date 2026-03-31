"""
Synthetic transaction dataset generator.
Generates 1000 realistic financial transactions with multi-currency support.
"""

import random
import csv
import os
import uuid
from datetime import datetime, timedelta

# Seed for reproducibility
random.seed(42)

# --- Configuration ---
NUM_TRANSACTIONS = 1000

CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF"]
CURRENCY_WEIGHTS = [0.25, 0.25, 0.15, 0.10, 0.05, 0.05, 0.05, 0.03, 0.04, 0.03]

# Amount ranges per currency (in local currency units)
AMOUNT_RANGES: dict[str, tuple[float, float]] = {
    "USD": (10, 50_000),
    "INR": (500, 40_00_000),
    "EUR": (10, 45_000),
    "GBP": (10, 40_000),
    "JPY": (1000, 7_000_000),
    "AUD": (15, 75_000),
    "CAD": (15, 65_000),
    "SGD": (15, 65_000),
    "AED": (50, 180_000),
    "CHF": (10, 45_000),
}

COUNTRIES = [
    "US", "IN", "GB", "DE", "FR", "JP", "AU", "CA", "SG", "AE",
    "BR", "ZA", "KR", "MX", "IT", "ES", "NL", "SE", "CH", "HK",
    # High-risk
    "IR", "KP", "MM", "SY", "YE", "AF", "PK", "NG", "TZ",
]

COUNTRY_WEIGHTS = [
    0.12, 0.12, 0.08, 0.06, 0.05, 0.05, 0.04, 0.04, 0.03, 0.03,
    0.03, 0.02, 0.03, 0.02, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02,
    # High-risk (lower probability)
    0.01, 0.005, 0.005, 0.005, 0.005, 0.01, 0.02, 0.02, 0.01,
]

TRANSACTION_TYPES = ["wire_transfer", "ach", "card_payment", "cash_deposit", "internal_transfer"]
KYC_STATUSES = ["verified", "pending", "incomplete", "expired"]

FIRST_NAMES = [
    "James", "Priya", "Mohammed", "Yuki", "Carlos", "Fatima", "Wei",
    "Anna", "Raj", "Sarah", "Ahmed", "Maria", "Kenji", "Elena", "Amit",
    "Olga", "Chen", "Lisa", "David", "Aisha", "Hans", "Mei", "João",
    "Sven", "Deepika", "Igor", "Yoko", "Pierre", "Ravi", "Sophie"
]
LAST_NAMES = [
    "Smith", "Patel", "Al-Rashid", "Tanaka", "García", "Khan", "Wang",
    "Müller", "Sharma", "Johnson", "Hassan", "Santos", "Yamamoto", "Petrov",
    "Gupta", "Ivanova", "Liu", "Anderson", "Park", "Abdullah", "Fischer",
    "Zhang", "Silva", "Johansson", "Kapoor", "Popov", "Sato", "Dubois",
    "Verma", "Laurent"
]


def generate_sender_receiver_ids(n: int) -> list[str]:
    """Generate a pool of account IDs to create realistic repeat patterns."""
    return [f"ACC_{uuid.uuid4().hex[:8].upper()}" for _ in range(n)]


def generate_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def generate_transactions() -> list[dict]:
    # Pool of accounts for realistic repeat patterns
    account_pool = generate_sender_receiver_ids(200)
    sanctioned_accounts = random.sample(account_pool, 5)

    # Track per-account transaction history for behavioral features
    account_history: dict[str, list[dict]] = {}

    base_time = datetime(2025, 10, 1, 8, 0, 0)
    transactions = []

    for i in range(NUM_TRANSACTIONS):
        txn_id = f"TXN_{uuid.uuid4().hex[:12].upper()}"

        # Pick currency
        currency = random.choices(CURRENCIES, weights=CURRENCY_WEIGHTS, k=1)[0]
        min_amt, max_amt = AMOUNT_RANGES[currency]

        # Amount: mostly normal, some high-value
        if random.random() < 0.08:
            # High-value transaction
            amount = round(random.uniform(max_amt * 0.5, max_amt), 2)
        elif random.random() < 0.05:
            # Round amount (suspicious pattern)
            amount = round(random.choice([1000, 5000, 10000, 25000, 50000]) *
                          (min_amt / 10), 2)
        else:
            amount = round(random.uniform(min_amt, max_amt * 0.3), 2)

        # Timestamp: spread across 6 months with some clustering
        time_offset = timedelta(
            days=random.randint(0, 180),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )
        timestamp = base_time + time_offset

        # Sender / Receiver
        sender_id = random.choice(account_pool)
        receiver_id = random.choice([a for a in account_pool if a != sender_id])

        sender_country = random.choices(COUNTRIES, weights=COUNTRY_WEIGHTS, k=1)[0]
        receiver_country = random.choices(COUNTRIES, weights=COUNTRY_WEIGHTS, k=1)[0]

        # Account age
        account_age_days = random.choices(
            [random.randint(1, 30), random.randint(31, 365), random.randint(366, 3650)],
            weights=[0.1, 0.4, 0.5],
            k=1
        )[0]

        # KYC status
        kyc_status = random.choices(
            KYC_STATUSES,
            weights=[0.70, 0.15, 0.10, 0.05],
            k=1
        )[0]

        # Sanctions
        is_sanctioned = sender_id in sanctioned_accounts or receiver_id in sanctioned_accounts
        # PEP
        is_pep = random.random() < 0.03

        # Transaction type
        txn_type = random.choice(TRANSACTION_TYPES)

        # Build behavioral features from history
        sender_txns = account_history.get(sender_id, [])
        recent_24h = [t for t in sender_txns if (timestamp - t["timestamp"]).total_seconds() < 86400]
        recent_7d = [t for t in sender_txns if (timestamp - t["timestamp"]).days < 7]
        recent_30d = [t for t in sender_txns if (timestamp - t["timestamp"]).days < 30]

        txn_count_last_24h = len(recent_24h)
        txn_count_last_7d = len(recent_7d)
        txn_count_last_30d = len(recent_30d)

        avg_txn_amount_30d = (
            sum(t["amount"] for t in recent_30d) / len(recent_30d)
            if recent_30d else 0
        )

        # Same beneficiary count
        same_beneficiary_count_7d = len([t for t in recent_7d if t.get("receiver_id") == receiver_id])

        # Days since last transaction
        if sender_txns:
            last_txn_time = max(t["timestamp"] for t in sender_txns)
            days_since_last_txn = (timestamp - last_txn_time).days
        else:
            days_since_last_txn = -1  # First transaction

        # Is round amount
        is_round_amount = (amount % 1000 == 0) and amount >= 1000

        txn = {
            "transaction_id": txn_id,
            "amount": amount,
            "currency": currency,
            "timestamp": timestamp.isoformat(),
            "sender_id": sender_id,
            "sender_name": generate_name(),
            "sender_country": sender_country,
            "sender_account_age_days": account_age_days,
            "receiver_id": receiver_id,
            "receiver_name": generate_name(),
            "receiver_country": receiver_country,
            "transaction_type": txn_type,
            "kyc_status": kyc_status,
            "is_sanctioned_entity": is_sanctioned,
            "is_pep": is_pep,
            "txn_count_last_24h": txn_count_last_24h,
            "txn_count_last_7d": txn_count_last_7d,
            "txn_count_last_30d": txn_count_last_30d,
            "avg_txn_amount_30d": round(avg_txn_amount_30d, 2),
            "same_beneficiary_count_7d": same_beneficiary_count_7d,
            "days_since_last_txn": days_since_last_txn,
            "is_round_amount": is_round_amount,
        }

        # Update account history
        if sender_id not in account_history:
            account_history[sender_id] = []
        account_history[sender_id].append({
            "timestamp": timestamp,
            "amount": amount,
            "receiver_id": receiver_id,
        })

        transactions.append(txn)

    return transactions


def save_to_csv(transactions: list[dict], filepath: str):
    """Save transactions to CSV."""
    if not transactions:
        return
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=transactions[0].keys())
        writer.writeheader()
        writer.writerows(transactions)
    print(f"Saved {len(transactions)} transactions to {filepath}")


if __name__ == "__main__":
    output_path = os.path.join(os.path.dirname(__file__), "transactions.csv")
    txns = generate_transactions()
    save_to_csv(txns, output_path)
