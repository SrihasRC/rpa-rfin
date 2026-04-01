"""
API Routes — FastAPI router with all compliance endpoints.
"""

import uuid
import csv
import io
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

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
from api.sar_pdf import generate_sar_pdf

router = APIRouter(prefix="/api")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH / USER ENDPOINTS (Simple - no JWT)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    account_id: str
    email: str
    first_name: str
    last_name: str
    country: str
    role: str
    kyc_status: str
    account_age_days: int
    balance: float


@router.post("/auth/login")
async def login(req: LoginRequest):
    """Simple login - validates credentials and returns user data."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("users")
            .select("*")
            .eq("email", req.email.lower())
            .eq("password_hash", req.password)
            .eq("is_active", True)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = response.data
        return {
            "success": True,
            "user": {
                "account_id": user["account_id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "country": user["country"],
                "role": user["role"],
                "account_type": user.get("account_type", "individual"),
                "kyc_status": user["kyc_status"],
                "account_age_days": user["account_age_days"],
                "balance": float(user["balance"]),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.get("/auth/user/{account_id}")
async def get_user(account_id: str):
    """Get user details by account ID."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("users")
            .select("*")
            .eq("account_id", account_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")

        user = response.data
        return {
            "account_id": user["account_id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "country": user["country"],
            "role": user["role"],
            "account_type": user.get("account_type", "individual"),
            "kyc_status": user["kyc_status"],
            "account_age_days": user["account_age_days"],
            "balance": float(user["balance"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/users")
async def list_users():
    """List all users (for demo/admin purposes)."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("users").select("*").eq("role", "user").execute()
        users = []
        for u in response.data or []:
            users.append(
                {
                    "account_id": u["account_id"],
                    "email": u["email"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "country": u["country"],
                    "balance": float(u["balance"]),
                    "account_type": u.get("account_type", "individual"),
                }
            )
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


class TopUpRequest(BaseModel):
    account_id: str
    amount: float


@router.post("/auth/topup")
async def topup_balance(req: TopUpRequest):
    """Add balance to a user account (for demo purposes)."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if req.amount > 1000000:
        raise HTTPException(status_code=400, detail="Maximum top-up is $1,000,000")

    try:
        supabase = get_supabase_client()

        # Get current user
        response = (
            supabase.table("users")
            .select("*")
            .eq("account_id", req.account_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")

        user = response.data
        new_balance = float(user["balance"]) + req.amount

        # Update balance
        supabase.table("users").update({"balance": new_balance}).eq(
            "account_id", req.account_id
        ).execute()

        return {
            "success": True,
            "message": f"Added ${req.amount:,.2f} to account",
            "previous_balance": float(user["balance"]),
            "new_balance": new_balance,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Top-up error: {str(e)}")


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
    risk_filter: Optional[str] = Query(
        None, description="Filter by risk: HIGH, MEDIUM, LOW"
    ),
    sort_by: str = Query("timestamp", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
    user_id: Optional[str] = Query(
        None, description="Filter by sender_id (user's transactions)"
    ),
):
    """List transactions with compliance results (paginated). Optionally filter by user."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("transactions").select("*", count="exact")

        # Filter by user if provided (for user portal)
        if user_id:
            query = query.eq("sender_id", user_id)

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
            "total_pages": (response.count + page_size - 1) // page_size
            if response.count
            else 0,
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
    """
    Send a transaction (user portal).
    1. Validates sender exists
    2. Computes behavioral features from transaction history
    3. Runs compliance check
    4. Stores transaction in database
    5. Updates user balance
    """
    txn_id = f"TXN_{uuid.uuid4().hex[:12].upper()}"
    timestamp = datetime.utcnow()

    try:
        supabase = get_supabase_client()

        # 1. Get sender user data
        user_response = (
            supabase.table("users")
            .select("*")
            .eq("account_id", sender_id)
            .single()
            .execute()
        )
        if not user_response.data:
            raise HTTPException(status_code=404, detail="Sender account not found")

        sender = user_response.data

        # Check balance
        if float(sender["balance"]) < txn.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        # 2. Compute behavioral features from sender's transaction history
        history_response = (
            supabase.table("transactions")
            .select("*")
            .eq("sender_id", sender_id)
            .order("timestamp", desc=True)
            .limit(100)
            .execute()
        )
        sender_txns = history_response.data or []

        # Calculate behavioral metrics
        now = timestamp
        txn_count_last_24h = 0
        txn_count_last_7d = 0
        txn_count_last_30d = 0
        total_amount_30d = 0
        same_beneficiary_count_7d = 0
        days_since_last_txn = 0

        for t in sender_txns:
            t_time = datetime.fromisoformat(
                t["timestamp"].replace("Z", "+00:00")
            ).replace(tzinfo=None)
            diff = now - t_time

            if diff.total_seconds() < 86400:  # 24 hours
                txn_count_last_24h += 1
            if diff.days < 7:
                txn_count_last_7d += 1
                if t.get("receiver_id") == txn.receiver_id:
                    same_beneficiary_count_7d += 1
            if diff.days < 30:
                txn_count_last_30d += 1
                total_amount_30d += float(t.get("amount", 0))

        avg_txn_amount_30d = (
            total_amount_30d / txn_count_last_30d if txn_count_last_30d > 0 else 0
        )

        if sender_txns:
            last_txn_time = datetime.fromisoformat(
                sender_txns[0]["timestamp"].replace("Z", "+00:00")
            ).replace(tzinfo=None)
            days_since_last_txn = (now - last_txn_time).days
        else:
            days_since_last_txn = 0  # First transaction

        # 3. Build full transaction data
        txn_dict = {
            "transaction_id": txn_id,
            "amount": txn.amount,
            "currency": txn.currency,
            "timestamp": timestamp.isoformat(),
            "sender_id": sender_id,
            "sender_name": f"{sender['first_name']} {sender['last_name']}",
            "sender_country": sender["country"],
            "sender_account_age_days": sender["account_age_days"],
            "receiver_id": txn.receiver_id,
            "receiver_name": txn.receiver_name,
            "receiver_country": txn.receiver_country,
            "transaction_type": txn.transaction_type,
            "kyc_status": sender["kyc_status"],
            "is_sanctioned_entity": False,
            "is_pep": False,
            "txn_count_last_24h": txn_count_last_24h,
            "txn_count_last_7d": txn_count_last_7d,
            "txn_count_last_30d": txn_count_last_30d,
            "avg_txn_amount_30d": avg_txn_amount_30d,
            "same_beneficiary_count_7d": same_beneficiary_count_7d,
            "days_since_last_txn": days_since_last_txn,
            "is_round_amount": txn.amount % 1000 == 0 and txn.amount >= 1000,
        }

        # 4. Run compliance check
        result = run_compliance_check(txn_dict)

        # 5. Store in database
        await _store_compliance_result(txn_dict, result)

        # 6. Update sender balance
        new_balance = float(sender["balance"]) - txn.amount
        supabase.table("users").update({"balance": new_balance}).eq(
            "account_id", sender_id
        ).execute()

        return {
            "success": True,
            "message": "Transaction completed successfully",
            "transaction_id": txn_id,
            "amount": txn.amount,
            "currency": txn.currency,
            "receiver_name": txn.receiver_name,
            "timestamp": timestamp.isoformat(),
            "status": "completed",
            "compliance": {
                "risk_level": result["final_risk"],
                "risk_score": result["risk_score"],
                "rules_triggered": result["rules_count"],
            },
            "new_balance": new_balance,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DASHBOARD ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(
    user_id: Optional[str] = Query(
        None, description="Filter stats by user (for portal)"
    ),
):
    """Get dashboard summary statistics. Optionally filter by user."""
    try:
        supabase = get_supabase_client()

        query = supabase.table("transactions").select("*")
        if user_id:
            query = query.eq("sender_id", user_id)

        response = query.execute()
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
            raise HTTPException(
                status_code=400, detail=f"Unknown report type: {report_type}"
            )

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
        raise HTTPException(
            status_code=500, detail=f"Report generation error: {str(e)}"
        )


@router.get("/reports/sar/{transaction_id}")
async def generate_sar_report(transaction_id: str):
    """Generate a SAR/STR report for a specific transaction (JSON)."""
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


@router.get("/reports/sar/{transaction_id}/pdf")
async def generate_sar_pdf_report(transaction_id: str):
    """Generate and download a SAR/STR PDF report for a specific transaction."""
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
        pdf_buf = generate_sar_pdf(txn)

        return StreamingResponse(
            pdf_buf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="SAR_{transaction_id}.pdf"',
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"SAR PDF generation error: {str(e)}"
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UIPATH CONVENIENCE ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/uipath/transactions/csv")
async def uipath_download_transactions_csv():
    """Download all transactions as CSV (for UiPath Read CSV activity)."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("transactions").select("*").execute()
        data = response.data or []
        return _generate_csv_response(data, "all_transactions")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uipath/transactions/json")
async def uipath_download_transactions_json():
    """Download all transactions as JSON (for UiPath Deserialize JSON)."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("transactions")
            .select("*")
            .order("timestamp", desc=True)
            .execute()
        )
        return {
            "success": True,
            "count": len(response.data or []),
            "transactions": response.data or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uipath/flagged/json")
async def uipath_get_flagged_transactions():
    """Get flagged (HIGH/MEDIUM risk) transactions as JSON for UiPath processing."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("transactions")
            .select("*")
            .in_("final_risk", ["HIGH", "MEDIUM"])
            .order("timestamp", desc=True)
            .execute()
        )
        return {
            "success": True,
            "count": len(response.data or []),
            "high_risk": [
                t for t in (response.data or []) if t.get("final_risk") == "HIGH"
            ],
            "medium_risk": [
                t for t in (response.data or []) if t.get("final_risk") == "MEDIUM"
            ],
            "transactions": response.data or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/uipath/transaction/check")
async def uipath_single_transaction_check(txn: TransactionInput):
    """
    Run compliance check on a single transaction (for UiPath HTTP Request).
    Returns simplified result suitable for RPA processing.
    """
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

    # Store in database
    try:
        await _store_compliance_result(txn_dict, result)
    except Exception as e:
        print(f"Warning: Could not store result: {e}")

    return {
        "success": True,
        "transaction_id": result["transaction_id"],
        "amount": txn_dict["amount"],
        "currency": txn_dict["currency"],
        "risk_level": result["final_risk"],
        "risk_score": round(result["risk_score"], 4),
        "rules_triggered": result["rules_count"],
        "explanation": result["explanation"]["summary"],
        "requires_review": result["final_risk"] in ["HIGH", "MEDIUM"],
    }


@router.post("/uipath/compliance-check/csv")
async def uipath_csv_compliance_check(file: UploadFile = File(...)):
    """
    Upload a CSV of transactions, run compliance checks, return results as CSV.
    For UiPath: HTTP Request upload -> get results CSV back.
    """
    try:
        content = await file.read()
        text = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))

        results_data = []
        for row in reader:
            # Build transaction dict from CSV row
            txn_dict = {
                "transaction_id": row.get(
                    "transaction_id", f"TXN_{uuid.uuid4().hex[:12].upper()}"
                ),
                "amount": float(row.get("amount", 0)),
                "currency": row.get("currency", "USD"),
                "timestamp": row.get("timestamp", datetime.utcnow().isoformat()),
                "sender_id": row.get("sender_id", ""),
                "sender_name": row.get("sender_name"),
                "sender_country": row.get("sender_country", "US"),
                "sender_account_age_days": int(
                    float(row.get("sender_account_age_days", 365))
                ),
                "receiver_id": row.get("receiver_id", ""),
                "receiver_name": row.get("receiver_name"),
                "receiver_country": row.get("receiver_country", "US"),
                "transaction_type": row.get("transaction_type", "wire_transfer"),
                "kyc_status": row.get("kyc_status", "verified"),
                "is_sanctioned_entity": row.get("is_sanctioned_entity", "").lower()
                == "true",
                "is_pep": row.get("is_pep", "").lower() == "true",
                "txn_count_last_24h": int(float(row.get("txn_count_last_24h", 0))),
                "txn_count_last_7d": int(float(row.get("txn_count_last_7d", 0))),
                "txn_count_last_30d": int(float(row.get("txn_count_last_30d", 0))),
                "avg_txn_amount_30d": float(row.get("avg_txn_amount_30d", 0)),
                "same_beneficiary_count_7d": int(
                    float(row.get("same_beneficiary_count_7d", 0))
                ),
                "days_since_last_txn": int(float(row.get("days_since_last_txn", 0))),
                "is_round_amount": row.get("is_round_amount", "").lower() == "true",
            }

            result = run_compliance_check(txn_dict)
            results_data.append(
                {
                    "transaction_id": result["transaction_id"],
                    "amount": txn_dict["amount"],
                    "currency": txn_dict["currency"],
                    "final_risk": result["final_risk"],
                    "risk_score": result["risk_score"],
                    "rules_count": result["rules_count"],
                    "explanation": result["explanation"]["summary"],
                }
            )

        # Return as CSV
        if not results_data:
            return StreamingResponse(
                io.StringIO("No records processed"),
                media_type="text/csv",
            )

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=results_data[0].keys())
        writer.writeheader()
        writer.writerows(results_data)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="compliance_results.csv"'
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV processing error: {str(e)}")


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
        "sender_account_age_days": int(txn.get("sender_account_age_days") or 0),
        "is_sanctioned_entity": txn.get("is_sanctioned_entity", False),
        "is_pep": txn.get("is_pep", False),
        "txn_count_last_24h": int(txn.get("txn_count_last_24h") or 0),
        "txn_count_last_7d": int(txn.get("txn_count_last_7d") or 0),
        "txn_count_last_30d": int(txn.get("txn_count_last_30d") or 0),
        "avg_txn_amount_30d": float(txn.get("avg_txn_amount_30d") or 0),
        "same_beneficiary_count_7d": int(txn.get("same_beneficiary_count_7d") or 0),
        "days_since_last_txn": int(txn.get("days_since_last_txn") or 0),
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
            headers={
                "Content-Disposition": f'attachment; filename="{report_type}_report.csv"'
            },
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{report_type}_report.csv"'
        },
    )
