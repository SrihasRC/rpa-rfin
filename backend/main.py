"""
FastAPI Application — Main entry point for the RegTech Compliance backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

app = FastAPI(
    title="RegTech Financial Compliance System",
    description=(
        "A RegTech compliance monitoring system that processes financial transactions "
        "using rule-based checks, ML risk scoring, and explainable decision-making."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "RegTech Financial Compliance System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": {
                "login": "POST /api/auth/login",
                "get_user": "GET /api/auth/user/{account_id}",
                "list_users": "GET /api/users",
            },
            "compliance": {
                "check_single": "POST /api/compliance-check",
                "check_batch": "POST /api/compliance-check/batch",
            },
            "transactions": {
                "list": "GET /api/transactions",
                "get_one": "GET /api/transactions/{id}",
                "send": "POST /api/transactions/send",
            },
            "dashboard": {
                "stats": "GET /api/dashboard/stats",
            },
            "reports": {
                "generate": "GET /api/reports/{type}",
                "sar_json": "GET /api/reports/sar/{transaction_id}",
                "sar_pdf": "GET /api/reports/sar/{transaction_id}/pdf",
            },
            "uipath": {
                "transactions_csv": "GET /api/uipath/transactions/csv",
                "transactions_json": "GET /api/uipath/transactions/json",
                "flagged_json": "GET /api/uipath/flagged/json",
                "single_check": "POST /api/uipath/transaction/check",
                "batch_csv_check": "POST /api/uipath/compliance-check/csv",
            },
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
