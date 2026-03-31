-- ═══════════════════════════════════════════════════
-- RegTech Financial Compliance System — Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up the database.
-- ═══════════════════════════════════════════════════

-- Users table (for authentication and account management)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    country TEXT DEFAULT 'US',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    kyc_status TEXT DEFAULT 'verified' CHECK (kyc_status IN ('verified', 'pending', 'incomplete', 'expired')),
    account_age_days INTEGER DEFAULT 0,
    balance NUMERIC(18, 2) DEFAULT 10000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default users for demo
INSERT INTO users (account_id, email, password_hash, first_name, last_name, country, role, kyc_status, account_age_days, balance) VALUES
    ('ACC_ADMIN001', 'admin@regtech.com', 'admin1234', 'Admin', 'Officer', 'US', 'admin', 'verified', 730, 0),
    ('ACC_12345678', 'john@example.com', 'demo1234', 'John', 'Doe', 'US', 'user', 'verified', 365, 25000.00),
    ('ACC_87654321', 'jane@example.com', 'demo1234', 'Jane', 'Smith', 'US', 'user', 'verified', 180, 15000.00),
    ('ACC_11223344', 'raj@example.com', 'demo1234', 'Raj', 'Patel', 'IN', 'user', 'verified', 90, 50000.00)
ON CONFLICT (account_id) DO NOTHING;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);

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
