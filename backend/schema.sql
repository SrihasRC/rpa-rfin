-- ═══════════════════════════════════════════════════
-- RegTech Financial Compliance System — Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up the database.
-- ═══════════════════════════════════════════════════

-- Transactions table (stores transactions + compliance results)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Sender info
    sender_id TEXT,
    sender_name TEXT,
    sender_country TEXT,
    sender_account_age_days INTEGER DEFAULT 365,

    -- Receiver info
    receiver_id TEXT,
    receiver_name TEXT,
    receiver_country TEXT,

    -- Transaction details
    transaction_type TEXT DEFAULT 'wire_transfer',
    kyc_status TEXT DEFAULT 'verified',
    is_sanctioned_entity BOOLEAN DEFAULT FALSE,
    is_pep BOOLEAN DEFAULT FALSE,

    -- Behavioral features
    txn_count_last_24h INTEGER DEFAULT 0,
    txn_count_last_7d INTEGER DEFAULT 0,
    txn_count_last_30d INTEGER DEFAULT 0,
    avg_txn_amount_30d NUMERIC(18, 2) DEFAULT 0,
    same_beneficiary_count_7d INTEGER DEFAULT 0,
    days_since_last_txn INTEGER DEFAULT 0,
    is_round_amount BOOLEAN DEFAULT FALSE,

    -- Compliance results
    final_risk TEXT CHECK (final_risk IN ('HIGH', 'MEDIUM', 'LOW')),
    risk_score NUMERIC(6, 4) DEFAULT 0,
    rules_count INTEGER DEFAULT 0,
    rules_triggered JSONB DEFAULT '[]'::jsonb,
    explanation_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_risk ON transactions(final_risk);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    transaction_id TEXT REFERENCES transactions(transaction_id),
    user_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, for production use)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
