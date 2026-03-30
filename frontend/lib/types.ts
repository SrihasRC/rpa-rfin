/**
 * TypeScript type definitions for the RegTech compliance system.
 */

export interface Transaction {
  transaction_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  sender_id: string;
  sender_name?: string;
  sender_country: string;
  sender_account_age_days?: number;
  receiver_id: string;
  receiver_name?: string;
  receiver_country: string;
  transaction_type: string;
  kyc_status: string;
  is_sanctioned_entity?: boolean;
  is_pep?: boolean;
  txn_count_last_24h?: number;
  txn_count_last_7d?: number;
  txn_count_last_30d?: number;
  avg_txn_amount_30d?: number;
  same_beneficiary_count_7d?: number;
  days_since_last_txn?: number;
  is_round_amount?: boolean;
  final_risk: "HIGH" | "MEDIUM" | "LOW";
  risk_score: number;
  rules_count: number;
  rules_triggered: RuleTriggered[];
  explanation_summary?: string;
}

export interface RuleTriggered {
  id: string;
  name: string;
  source: string;
  details: string;
}

export interface MLInsights {
  risk_score: number;
  risk_label: string;
  probabilities: Record<string, number>;
  top_contributing_features: { feature: string; importance: number }[];
}

export interface Explanation {
  summary: string;
  risk_level: string;
  reasons: string[];
  rule_details: RuleTriggered[];
  ml_insights: MLInsights;
  recommendation: string;
}

export interface ComplianceResult {
  transaction_id: string;
  amount: number;
  currency: string;
  risk_score: number;
  final_risk: "HIGH" | "MEDIUM" | "LOW";
  rules_triggered: RuleTriggered[];
  rules_count: number;
  explanation: Explanation;
}

export interface DashboardStats {
  total_transactions: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_flagged: number;
  flagged_percentage: number;
  avg_risk_score: number;
  total_amount_usd: number;
  currencies_seen: string[];
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TransactionInput {
  amount: number;
  currency: string;
  sender_id: string;
  sender_country: string;
  receiver_id: string;
  receiver_name?: string;
  receiver_country: string;
  transaction_type: string;
}
