# RegTech Financial Compliance Monitoring System

A full-stack RegTech system that simulates how banks monitor transactions for regulatory compliance using rule-based checks, ML risk scoring, and explainable decisions.

## Architecture

```
Frontend (Next.js)  →  Backend (FastAPI)  →  Supabase (PostgreSQL)
                            ├── Rule Engine (12 rules)
                            ├── ML Model (Gradient Boosting)
                            ├── Explanation Engine
                            └── Report Generator
                                    ↓
                          UiPath (optional automation)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI |
| Frontend | Next.js 16, Tailwind 4, shadcn |
| Database | Supabase (PostgreSQL) |
| ML | scikit-learn, SHAP |
| Reports | CSV, JSON |

## Getting Started

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # or .venv/bin/activate.fish
pip install -r requirements.txt

# Copy env and add Supabase credentials
cp .env.example .env
# Edit .env with your Supabase URL and keys

# Run the schema.sql in your Supabase SQL Editor

# Generate dataset
python data/generate_dataset.py

# Train ML model
python ml/train_model.py

# Seed database
python data/seed_supabase.py

# Start server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `backend/schema.sql`
3. Copy the URL and anon key to `backend/.env`

## Features

- **12 Compliance Rules**: BSA, FATF, OFAC, KYC, AML-derived
- **ML Risk Scoring**: Gradient Boosting with feature importance
- **Multi-Currency**: USD, INR, EUR, GBP, JPY, and more
- **Explainable Decisions**: Every risk assessment includes human-readable reasoning
- **Admin Dashboard**: Transaction monitoring, risk charts, report downloads
- **User Portal**: Send money, view history, real-time compliance feedback
- **Report Generation**: Compliance, flagged, and SAR/STR reports
- **UiPath Ready**: API-based integration for RPA automation

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/compliance-check` | Check single transaction |
| POST | `/api/compliance-check/batch` | Batch check |
| GET | `/api/transactions` | List (paginated) |
| GET | `/api/transactions/{id}` | Transaction detail |
| GET | `/api/dashboard/stats` | Dashboard stats |
| GET | `/api/reports/{type}` | Download reports |
| GET | `/api/reports/sar/{id}` | SAR for transaction |
