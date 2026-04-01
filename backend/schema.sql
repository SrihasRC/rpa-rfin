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
    account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
    kyc_status TEXT DEFAULT 'verified' CHECK (kyc_status IN ('verified', 'pending', 'incomplete', 'expired')),
    account_age_days INTEGER DEFAULT 0,
    balance NUMERIC(18, 2) DEFAULT 10000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default users for demo
-- Individual users (personal accounts)
INSERT INTO users (account_id, email, password_hash, first_name, last_name, country, role, account_type, kyc_status, account_age_days, balance) VALUES
    ('ACC_ADMIN001', 'admin@regtech.com', 'admin1234', 'Admin', 'Officer', 'US', 'admin', 'individual', 'verified', 730, 0),
    ('ACC_12345678', 'john@example.com', 'demo1234', 'John', 'Doe', 'US', 'user', 'individual', 'verified', 365, 25000.00),
    ('ACC_87654321', 'jane@example.com', 'demo1234', 'Jane', 'Smith', 'US', 'user', 'individual', 'verified', 180, 15000.00),
    ('ACC_11223344', 'raj@example.com', 'demo1234', 'Raj', 'Patel', 'IN', 'user', 'individual', 'verified', 90, 50000.00),
    -- Business user with high transaction volume (for ML behavioral pattern demo)
    ('ACC_BIZGT001', 'finance@globaltrade.com', 'demo1234', 'GlobalTrade', 'Corp', 'US', 'user', 'business', 'verified', 1095, 500000.00)
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

-- ═══════════════════════════════════════════════════
-- Historical transactions for GlobalTrade Corp (business user)
-- These establish a pattern of consistent large transactions (~$50k avg)
-- so the ML model sees $50k as NORMAL behavior for this account
-- ═══════════════════════════════════════════════════
INSERT INTO transactions (
    transaction_id, amount, currency, timestamp,
    sender_id, sender_name, sender_country, sender_account_age_days,
    receiver_id, receiver_name, receiver_country,
    transaction_type, kyc_status, is_sanctioned_entity, is_pep,
    txn_count_last_24h, txn_count_last_7d, txn_count_last_30d,
    avg_txn_amount_30d, same_beneficiary_count_7d, days_since_last_txn, is_round_amount,
    final_risk, risk_score, rules_count, rules_triggered, explanation_summary
) VALUES
    -- 30 days ago: $48,000 wire transfer
    ('TXN_BIZ_HIST_001', 48000.00, 'USD', NOW() - INTERVAL '30 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_001', 'Asia Pacific Supplies Ltd', 'SG',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 3, 8, 45000.00, 2, 3, FALSE,
     'LOW', 0.25, 1, '["R001"]', 'Routine high-value business payment to established supplier'),
    
    -- 25 days ago: $52,000 wire transfer
    ('TXN_BIZ_HIST_002', 52000.00, 'USD', NOW() - INTERVAL '25 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_002', 'European Logistics GmbH', 'DE',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 4, 9, 46500.00, 1, 5, FALSE,
     'LOW', 0.22, 1, '["R001"]', 'Standard business payment to European partner'),
    
    -- 20 days ago: $47,500 wire transfer
    ('TXN_BIZ_HIST_003', 47500.00, 'USD', NOW() - INTERVAL '20 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_001', 'Asia Pacific Supplies Ltd', 'SG',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 3, 10, 47000.00, 3, 5, FALSE,
     'LOW', 0.20, 1, '["R001"]', 'Regular supplier payment'),
    
    -- 15 days ago: $55,000 wire transfer
    ('TXN_BIZ_HIST_004', 55000.00, 'USD', NOW() - INTERVAL '15 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_003', 'Canadian Materials Inc', 'CA',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 4, 11, 48500.00, 1, 5, FALSE,
     'LOW', 0.23, 1, '["R001"]', 'Quarterly materials procurement'),
    
    -- 10 days ago: $49,000 wire transfer
    ('TXN_BIZ_HIST_005', 49000.00, 'USD', NOW() - INTERVAL '10 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_002', 'European Logistics GmbH', 'DE',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 3, 12, 49500.00, 2, 5, FALSE,
     'LOW', 0.21, 1, '["R001"]', 'Monthly logistics payment'),
    
    -- 5 days ago: $51,500 wire transfer
    ('TXN_BIZ_HIST_006', 51500.00, 'USD', NOW() - INTERVAL '5 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_001', 'Asia Pacific Supplies Ltd', 'SG',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 4, 13, 50000.00, 4, 5, FALSE,
     'LOW', 0.19, 1, '["R001"]', 'Routine supplier payment'),
    
    -- 2 days ago: $50,000 wire transfer
    ('TXN_BIZ_HIST_007', 50000.00, 'USD', NOW() - INTERVAL '2 days',
     'ACC_BIZGT001', 'GlobalTrade Corp', 'US', 1095,
     'RCV_SUPPLIER_004', 'UK Distribution Ltd', 'GB',
     'wire_transfer', 'verified', FALSE, FALSE,
     1, 5, 14, 50500.00, 1, 3, TRUE,
     'LOW', 0.20, 1, '["R001"]', 'New supplier onboarding payment')
ON CONFLICT (transaction_id) DO NOTHING;

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
