-- ═══════════════════════════════════════════════════
-- Migration: Add account_type field and business user
-- Run this on existing databases to add business account support
-- ═══════════════════════════════════════════════════

-- Add account_type column to users table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'account_type') THEN
        ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'individual' 
            CHECK (account_type IN ('individual', 'business'));
    END IF;
END $$;

-- Update existing users to be 'individual' type
UPDATE users SET account_type = 'individual' WHERE account_type IS NULL;

-- Add business user: GlobalTrade Corp
INSERT INTO users (account_id, email, password_hash, first_name, last_name, country, role, account_type, kyc_status, account_age_days, balance) 
VALUES ('ACC_BIZGT001', 'finance@globaltrade.com', 'demo1234', 'GlobalTrade', 'Corp', 'US', 'user', 'business', 'verified', 1095, 500000.00)
ON CONFLICT (account_id) DO UPDATE SET account_type = 'business';

-- ═══════════════════════════════════════════════════
-- Historical transactions for GlobalTrade Corp
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

-- Verify the migration
SELECT 'Migration complete. Business user and historical transactions added.' AS status;
SELECT account_id, first_name, last_name, account_type, balance FROM users WHERE account_id = 'ACC_BIZGT001';
SELECT COUNT(*) AS historical_transactions FROM transactions WHERE sender_id = 'ACC_BIZGT001';
