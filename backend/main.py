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
            "compliance_check": "/api/compliance-check",
            "transactions": "/api/transactions",
            "dashboard": "/api/dashboard/stats",
            "reports": "/api/reports/{type}",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
