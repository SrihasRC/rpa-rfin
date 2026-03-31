/**
 * API client for the RegTech compliance backend.
 */

import type {
  ComplianceResult,
  DashboardStats,
  PaginatedTransactions,
  Transaction,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json();
}

// --- Compliance Check ---

export async function complianceCheck(
  txn: Record<string, unknown>
): Promise<ComplianceResult> {
  return apiFetch<ComplianceResult>("/api/compliance-check", {
    method: "POST",
    body: JSON.stringify(txn),
  });
}

export async function batchComplianceCheck(
  transactions: Record<string, unknown>[]
): Promise<{ results: ComplianceResult[]; total: number }> {
  return apiFetch("/api/compliance-check/batch", {
    method: "POST",
    body: JSON.stringify({ transactions }),
  });
}

// --- Transactions ---

export async function getTransactions(params?: {
  page?: number;
  page_size?: number;
  risk_filter?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<PaginatedTransactions> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params?.risk_filter)
    searchParams.set("risk_filter", params.risk_filter);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);

  const qs = searchParams.toString();
  return apiFetch<PaginatedTransactions>(
    `/api/transactions${qs ? `?${qs}` : ""}`
  );
}

export async function getTransaction(id: string): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/transactions/${id}`);
}

export interface SendTransactionResponse {
  message: string;
  transaction_id: string;
  amount: number;
  currency: string;
  receiver_name?: string;
  timestamp: string;
  status: string;
}

export async function sendTransaction(
  txn: {
    amount: number;
    currency: string;
    sender_id: string;
    sender_country: string;
    receiver_id: string;
    receiver_name?: string;
    receiver_country: string;
    transaction_type: string;
  },
  senderId: string
): Promise<SendTransactionResponse> {
  return apiFetch(`/api/transactions/send?sender_id=${encodeURIComponent(senderId)}`, {
    method: "POST",
    body: JSON.stringify(txn),
  });
}

// --- Dashboard ---

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/dashboard/stats");
}

// --- Reports ---

export async function getReport(
  type: "compliance" | "flagged" | "sar",
  format: "json" | "csv" = "json"
) {
  if (format === "csv") {
    const res = await fetch(
      `${API_BASE}/api/reports/${type}?format=csv`
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  return apiFetch(`/api/reports/${type}?format=json`);
}

export async function getSARReport(transactionId: string) {
  return apiFetch(`/api/reports/sar/${transactionId}`);
}

export async function downloadSARPdf(transactionId: string) {
  const res = await fetch(
    `${API_BASE}/api/reports/sar/${transactionId}/pdf`
  );
  if (!res.ok) throw new Error("SAR PDF generation failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SAR_${transactionId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
