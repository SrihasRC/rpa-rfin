"""
Seed the generated dataset into Supabase.
Run this after generate_dataset.py to populate the database.
"""

import os
import sys
import csv
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase_client import get_supabase_client
from engine.compliance import run_compliance_check


def seed_database():
    """Load transactions from CSV, run compliance checks, and store in Supabase."""
    csv_path = os.path.join(os.path.dirname(__file__), "transactions.csv")

    if not os.path.exists(csv_path):
        print("[ERROR] transactions.csv not found. Run generate_dataset.py first.")
        return

    print(f"[INFO] Loading transactions from {csv_path}")

    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        transactions = list(reader)

    print(f"   Found {len(transactions)} transactions")

    supabase = get_supabase_client()

    # Clear existing data before seeding
    print("[INFO] Clearing existing transactions from Supabase...")
    try:
        supabase.table("transactions").delete().neq("id", 0).execute()
        print("   Cleared existing data.")
    except Exception as e:
        print(f"   [WARN] Could not clear table (may be empty): {e}")

    batch = []
    success_count = 0

    for i, txn in enumerate(transactions):
        # Convert types
        txn["amount"] = float(txn["amount"])
        txn["sender_account_age_days"] = int(float(txn["sender_account_age_days"]))
        txn["txn_count_last_24h"] = int(float(txn["txn_count_last_24h"]))
        txn["txn_count_last_7d"] = int(float(txn["txn_count_last_7d"]))
        txn["txn_count_last_30d"] = int(float(txn["txn_count_last_30d"]))
        txn["avg_txn_amount_30d"] = float(txn["avg_txn_amount_30d"])
        txn["same_beneficiary_count_7d"] = int(float(txn["same_beneficiary_count_7d"]))
        txn["days_since_last_txn"] = int(float(txn["days_since_last_txn"]))
        txn["is_sanctioned_entity"] = txn["is_sanctioned_entity"].lower() == "true"
        txn["is_pep"] = txn["is_pep"].lower() == "true"
        txn["is_round_amount"] = txn["is_round_amount"].lower() == "true"

        # Run compliance check
        result = run_compliance_check(txn)

        record = {
            "transaction_id": txn["transaction_id"],
            "amount": float(txn["amount"]),
            "currency": txn.get("currency", "USD"),
            "timestamp": txn.get("timestamp"),
            "sender_id": txn.get("sender_id"),
            "sender_name": txn.get("sender_name"),
            "sender_country": txn.get("sender_country"),
            "receiver_id": txn.get("receiver_id"),
            "receiver_name": txn.get("receiver_name"),
            "receiver_country": txn.get("receiver_country"),
            "transaction_type": txn.get("transaction_type"),
            "kyc_status": txn.get("kyc_status"),
            "sender_account_age_days": int(float(txn.get("sender_account_age_days", 365))),
            "is_sanctioned_entity": txn.get("is_sanctioned_entity", False),
            "is_pep": txn.get("is_pep", False),
            "txn_count_last_24h": int(float(txn.get("txn_count_last_24h", 0))),
            "txn_count_last_7d": int(float(txn.get("txn_count_last_7d", 0))),
            "txn_count_last_30d": int(float(txn.get("txn_count_last_30d", 0))),
            "avg_txn_amount_30d": float(txn.get("avg_txn_amount_30d", 0)),
            "same_beneficiary_count_7d": int(float(txn.get("same_beneficiary_count_7d", 0))),
            "days_since_last_txn": int(float(txn.get("days_since_last_txn", 0))),
            "is_round_amount": txn.get("is_round_amount", False),
            "final_risk": result["final_risk"],
            "risk_score": float(result["risk_score"]),
            "rules_count": int(result["rules_count"]),
            "rules_triggered": result["rules_triggered"],
            "explanation_summary": result["explanation"]["summary"],
        }
        batch.append(record)

        # Insert in batches of 50
        if len(batch) >= 50:
            try:
                supabase.table("transactions").upsert(batch).execute()
                success_count += len(batch)
                print(f"   [OK] Inserted {success_count}/{len(transactions)} records...")
            except Exception as e:
                print(f"   [ERROR] Batch insert failed: {e}")
            batch = []

    # Insert remaining
    if batch:
        try:
            supabase.table("transactions").upsert(batch).execute()
            success_count += len(batch)
        except Exception as e:
            print(f"   [ERROR] Final batch insert failed: {e}")

    print(f"\n[DONE] Seeded {success_count}/{len(transactions)} transactions into Supabase")


if __name__ == "__main__":
    seed_database()
