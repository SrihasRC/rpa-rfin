"""
API Routes — FastAPI router with all compliance endpoints.
"""

import uuid
import csv
import io
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.schemas import (
    TransactionInput,
    BatchTransactionInput,
    ComplianceResult,
    DashboardStats,
    TransactionRecord,
    UserTransactionInput,
)
from engine.compliance import run_compliance_check
from config import CURRENCY_TO_USD
from supabase_client import get_supabase_client

router = APIRouter(prefix="/api")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPLIANCE CHECK ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/compliance-check", response_model=ComplianceResult)
async def compliance_check(txn: TransactionInput):
    """Run compliance check on a single transaction."""
    txn_dict = txn.model_dump()

    # Auto-generate ID and timestamp if not provided
    if not txn_dict.get("transaction_id"):
        txn_dict["transaction_id"] = f"TXN_{uuid.uuid4().hex[:12].upper()}"
    if not txn_dict.get("timestamp"):
        txn_dict["timestamp"] = datetime.utcnow().isoformat()

    # Auto-detect round amount
    if txn_dict.get("is_round_amount") is None:
        txn_dict["is_round_amount"] = (
            txn_dict["amount"] % 1000 == 0 and txn_dict["amount"] >= 1000
        )

    result = run_compliance_check(txn_dict)

    # Store in Supabase
    try:
        await _store_compliance_result(txn_dict, result)
    except Exception as e:
        print(f"Warning: Could not store result in Supabase: {e}")

    return result


@router.post("/compliance-check/batch")
async def batch_compliance_check(batch: BatchTransactionInput):
    """Run compliance check on multiple transactions."""
    results = []
    for txn in batch.transactions:
        txn_dict = txn.model_dump()
        if not txn_dict.get("transaction_id"):
            txn_dict["transaction_id"] = f"TXN_{uuid.uuid4().hex[:12].upper()}"
        if not txn_dict.get("timestamp"):
            txn_dict["timestamp"] = datetime.utcnow().isoformat()
        if txn_dict.get("is_round_amount") is None:
            txn_dict["is_round_amount"] = (
                txn_dict["amount"] % 1000 == 0 and txn_dict["amount"] >= 1000
            )

        result = run_compliance_check(txn_dict)
        results.append(result)

        try:
            await _store_compliance_result(txn_dict, result)
        except Exception:
            pass

    return {"results": results, "total": len(results)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TRANSACTION ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_filter: Optional[str] = Query(None, description="Filter by risk: HIGH, MEDIUM, LOW"),
    sort_by: str = Query("timestamp", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
):
    """List all transactions with compliance results (paginated)."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("transactions").select("*", count="exact")

        if risk_filter:
            query = query.eq("final_risk", risk_filter.upper())

        # Sorting
        ascending = sort_order.lower() == "asc"
        query = query.order(sort_by, desc=not ascending)

        # Pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        response = query.execute()

        return {
            "transactions": response.data,
            "total": response.count,
            "page": page,
            "page_size": page_size,
            "total_pages": (response.count + page_size - 1) // page_size if response.count else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str):
    """Get detailed transaction info with compliance result."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("transactions")
            .select("*")
            .eq("transaction_id", transaction_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/transactions/send")
async def send_transaction(
    txn: UserTransactionInput,
    sender_id: str = Query(..., description="Current user's account ID"),
):
    """Send a transaction (user portal). Automatically runs compliance check."""
    # Build full transaction data
    txn_data = TransactionInput(
        transaction_id=f"TXN_{uuid.uuid4().hex[:12].upper()}",
        amount=txn.amount,
        currency=txn.currency,
        sender_id=sender_id,
        sender_country="US",  # Default; in real app comes from user profile
        receiver_id=txn.receiver_id,
        receiver_name=txn.receiver_name,
        receiver_country=txn.receiver_country,
        transaction_type=txn.transaction_type,
    )

    # Run compliance check
    result = await compliance_check(txn_data)
    return {
        "message": "Transaction submitted and compliance check completed",
        "result": result,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DASHBOARD ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats():
    """Get dashboard summary statistics."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("transactions").select("*").execute()
        transactions = response.data or []

        total = len(transactions)
        high = sum(1 for t in transactions if t.get("final_risk") == "HIGH")
        medium = sum(1 for t in transactions if t.get("final_risk") == "MEDIUM")
        low = sum(1 for t in transactions if t.get("final_risk") == "LOW")
        flagged = high + medium

        risk_scores = [t.get("risk_score", 0) for t in transactions]
        avg_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0

        # Total amount in USD
        total_usd = sum(
            t.get("amount", 0) * CURRENCY_TO_USD.get(t.get("currency", "USD"), 1.0)
            for t in transactions
        )

        currencies = list(set(t.get("currency", "USD") for t in transactions))

        return DashboardStats(
            total_transactions=total,
            high_risk_count=high,
            medium_risk_count=medium,
            low_risk_count=low,
            total_flagged=flagged,
            flagged_percentage=round(flagged / total * 100, 1) if total > 0 else 0,
            avg_risk_score=round(avg_score, 4),
            total_amount_usd=round(total_usd, 2),
            currencies_seen=currencies,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REPORT ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/reports/{report_type}")
async def generate_report(
    report_type: str,
    format: str = Query("json", description="json or csv"),
):
    """
    Generate and download compliance reports.
    Types: compliance (all), flagged (medium+high), sar (suspicious activity)
    """
    try:
        supabase = get_supabase_client()

        if report_type == "compliance":
            response = supabase.table("transactions").select("*").execute()
        elif report_type == "flagged":
            response = (
                supabase.table("transactions")
                .select("*")
                .in_("final_risk", ["HIGH", "MEDIUM"])
                .execute()
            )
        elif report_type == "sar":
            response = (
                supabase.table("transactions")
                .select("*")
                .eq("final_risk", "HIGH")
                .execute()
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")

        data = response.data or []

        if format == "csv":
            return _generate_csv_response(data, report_type)

        return {
            "report_type": report_type,
            "generated_at": datetime.utcnow().isoformat(),
            "total_records": len(data),
            "records": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@router.get("/reports/sar/{transaction_id}")
async def generate_sar_report(transaction_id: str):
    """Generate a SAR/STR report for a specific transaction."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("transactions")
            .select("*")
            .eq("transaction_id", transaction_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        txn = response.data
        return {
            "report_type": "SAR",
            "generated_at": datetime.utcnow().isoformat(),
            "filing_institution": "RegTech Compliance System",
            "transaction": {
                "id": txn["transaction_id"],
                "amount": txn["amount"],
                "currency": txn.get("currency", "USD"),
                "date": txn.get("timestamp", ""),
                "sender": txn.get("sender_id", ""),
                "receiver": txn.get("receiver_id", ""),
                "type": txn.get("transaction_type", ""),
            },
            "risk_assessment": {
                "final_risk": txn.get("final_risk", ""),
                "risk_score": txn.get("risk_score", 0),
                "rules_triggered": txn.get("rules_triggered", []),
                "rules_count": txn.get("rules_count", 0),
            },
            "explanation": txn.get("explanation_summary", ""),
            "recommendation": "File SAR with FinCEN within 30 days of detection.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAR generation error: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def _store_compliance_result(txn: dict, result: dict):
    """Store transaction + compliance result in Supabase."""
    supabase = get_supabase_client()

    record = {
        "transaction_id": result["transaction_id"],
        "amount": txn.get("amount"),
        "currency": txn.get("currency", "USD"),
        "timestamp": txn.get("timestamp", datetime.utcnow().isoformat()),
        "sender_id": txn.get("sender_id"),
        "sender_name": txn.get("sender_name"),
        "sender_country": txn.get("sender_country"),
        "receiver_id": txn.get("receiver_id"),
        "receiver_name": txn.get("receiver_name"),
        "receiver_country": txn.get("receiver_country"),
        "transaction_type": txn.get("transaction_type"),
        "kyc_status": txn.get("kyc_status"),
        "sender_account_age_days": txn.get("sender_account_age_days"),
        "is_sanctioned_entity": txn.get("is_sanctioned_entity", False),
        "is_pep": txn.get("is_pep", False),
        "txn_count_last_24h": txn.get("txn_count_last_24h", 0),
        "txn_count_last_7d": txn.get("txn_count_last_7d", 0),
        "txn_count_last_30d": txn.get("txn_count_last_30d", 0),
        "avg_txn_amount_30d": txn.get("avg_txn_amount_30d", 0),
        "same_beneficiary_count_7d": txn.get("same_beneficiary_count_7d", 0),
        "days_since_last_txn": txn.get("days_since_last_txn", 0),
        "is_round_amount": txn.get("is_round_amount", False),
        "final_risk": result["final_risk"],
        "risk_score": result["risk_score"],
        "rules_count": result["rules_count"],
        "rules_triggered": result["rules_triggered"],
        "explanation_summary": result["explanation"]["summary"],
    }

    supabase.table("transactions").upsert(record).execute()


def _generate_csv_response(data: list, report_type: str):
    """Generate a CSV streaming response."""
    if not data:
        return StreamingResponse(
            io.StringIO("No records found"),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report_type}_report.csv"'},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_type}_report.csv"'},
    )
