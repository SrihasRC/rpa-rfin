"""
Pydantic models for API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Request Models ---

class TransactionInput(BaseModel):
    """Input schema for a single transaction compliance check."""
    transaction_id: Optional[str] = None
    amount: float = Field(..., gt=0, description="Transaction amount in the specified currency")
    currency: str = Field(default="USD", description="Currency code (USD, INR, EUR, GBP, etc.)")
    timestamp: Optional[str] = None
    sender_id: str = Field(..., description="Sender account ID")
    sender_name: Optional[str] = None
    sender_country: str = Field(default="US", description="Sender country code (ISO 2)")
    sender_account_age_days: int = Field(default=365, ge=0)
    receiver_id: str = Field(..., description="Receiver account ID")
    receiver_name: Optional[str] = None
    receiver_country: str = Field(default="US", description="Receiver country code (ISO 2)")
    transaction_type: str = Field(default="wire_transfer")
    kyc_status: str = Field(default="verified", description="verified, pending, incomplete, expired")
    is_sanctioned_entity: bool = Field(default=False)
    is_pep: bool = Field(default=False)
    txn_count_last_24h: int = Field(default=0, ge=0)
    txn_count_last_7d: int = Field(default=0, ge=0)
    txn_count_last_30d: int = Field(default=0, ge=0)
    avg_txn_amount_30d: float = Field(default=0.0, ge=0)
    same_beneficiary_count_7d: int = Field(default=0, ge=0)
    days_since_last_txn: int = Field(default=0)
    is_round_amount: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "amount": 15000.00,
                "currency": "USD",
                "sender_id": "ACC_001",
                "sender_country": "US",
                "sender_account_age_days": 120,
                "receiver_id": "ACC_002",
                "receiver_country": "IR",
                "transaction_type": "wire_transfer",
                "kyc_status": "verified",
                "is_sanctioned_entity": False,
                "is_pep": False,
                "txn_count_last_24h": 2,
                "txn_count_last_7d": 5,
                "txn_count_last_30d": 12,
                "avg_txn_amount_30d": 3000.00,
                "same_beneficiary_count_7d": 1,
                "days_since_last_txn": 3,
            }
        }


class BatchTransactionInput(BaseModel):
    """Input schema for batch compliance check."""
    transactions: list[TransactionInput]


class UserTransactionInput(BaseModel):
    """Simplified input for user portal — sending a transaction."""
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD")
    receiver_id: str
    receiver_name: Optional[str] = None
    receiver_country: str = Field(default="US")
    transaction_type: str = Field(default="wire_transfer")


# --- Response Models ---

class RuleTriggered(BaseModel):
    id: str
    name: str
    source: str
    details: str


class MLInsights(BaseModel):
    risk_score: float
    risk_label: str
    probabilities: dict[str, float]
    top_contributing_features: list[dict]


class ExplanationResponse(BaseModel):
    summary: str
    risk_level: str
    reasons: list[str]
    rule_details: list[RuleTriggered]
    ml_insights: MLInsights
    recommendation: str


class ComplianceResult(BaseModel):
    transaction_id: str
    amount: float
    currency: str
    risk_score: float
    final_risk: str
    rules_triggered: list[RuleTriggered]
    rules_count: int
    explanation: ExplanationResponse


class DashboardStats(BaseModel):
    total_transactions: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    total_flagged: int
    flagged_percentage: float
    avg_risk_score: float
    total_amount_usd: float
    currencies_seen: list[str]


class TransactionRecord(BaseModel):
    """Full transaction record with compliance result (for DB storage/retrieval)."""
    transaction_id: str
    amount: float
    currency: str
    timestamp: str
    sender_id: str
    sender_name: Optional[str] = None
    sender_country: str
    receiver_id: str
    receiver_name: Optional[str] = None
    receiver_country: str
    transaction_type: str
    kyc_status: str
    final_risk: str
    risk_score: float
    rules_count: int
    rules_triggered: list[dict] = []
    explanation_summary: Optional[str] = None
