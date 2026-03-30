"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getTransaction, getSARReport } from "@/lib/api";
import { formatCurrency, formatDate, COUNTRY_NAMES } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import Link from "next/link";

export default function TransactionDetailPage() {
  const params = useParams();
  const txnId = params.id as string;
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTransaction(txnId);
        setTxn(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [txnId]);

  if (loading) {
    return (
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !txn) {
    return (
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Transaction Not Found</CardTitle>
              <CardDescription>{error || "The requested transaction could not be found."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/transactions">
                <Button>← Back to Transactions</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const rules = txn.rules_triggered || [];

  return (
    <AppShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard/transactions" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Transactions
            </Link>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Transaction Detail</h2>
            <p className="font-mono text-sm text-muted-foreground">{txn.transaction_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge risk={txn.final_risk} size="lg" />
            {txn.final_risk === "HIGH" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    const sar = await getSARReport(txn.transaction_id);
                    const blob = new Blob([JSON.stringify(sar, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `SAR_${txn.transaction_id}.json`;
                    a.click();
                  } catch (e) {}
                }}
              >
                📄 Generate SAR
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info - Left 2 cols */}
          <div className="space-y-6 lg:col-span-2">
            {/* Transaction Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(txn.amount, txn.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                    <p className="text-lg font-medium capitalize">{txn.transaction_type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Date</p>
                    <p className="text-sm">{formatDate(txn.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">KYC Status</p>
                    <Badge variant={txn.kyc_status === "verified" ? "secondary" : "destructive"} className="capitalize">
                      {txn.kyc_status}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Sender → Receiver */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sender</p>
                    <p className="font-medium">{txn.sender_name || txn.sender_id}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{txn.sender_id}</p>
                    <p className="mt-1 text-sm">{COUNTRY_NAMES[txn.sender_country] || txn.sender_country}</p>
                    {txn.sender_account_age_days !== undefined && (
                      <p className="text-xs text-muted-foreground">Account age: {txn.sender_account_age_days} days</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receiver</p>
                    <p className="font-medium">{txn.receiver_name || txn.receiver_id}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{txn.receiver_id}</p>
                    <p className="mt-1 text-sm">{COUNTRY_NAMES[txn.receiver_country] || txn.receiver_country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Triggered Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Triggered Rules ({rules.length})</CardTitle>
                <CardDescription>Regulatory compliance rules that flagged this transaction</CardDescription>
              </CardHeader>
              <CardContent>
                {rules.length > 0 ? (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-lg border border-border/50 bg-muted/30 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                              <Badge variant="outline" className="text-xs">{rule.source}</Badge>
                            </div>
                            <p className="mt-1 font-medium">{rule.name}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{rule.details}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No compliance rules were triggered.</p>
                )}
              </CardContent>
            </Card>

            {/* Explanation */}
            {txn.explanation_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed">{txn.explanation_summary}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right col */}
          <div className="space-y-6">
            {/* Risk Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="3"
                        strokeDasharray={`${(txn.risk_score * 100)}, 100`}
                        className={
                          txn.final_risk === "HIGH"
                            ? "stroke-red-500"
                            : txn.final_risk === "MEDIUM"
                            ? "stroke-amber-500"
                            : "stroke-emerald-500"
                        }
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {(txn.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{txn.final_risk}</p>
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <FlagItem label="Sanctioned Entity" value={txn.is_sanctioned_entity} />
                <FlagItem label="PEP" value={txn.is_pep} />
                <FlagItem label="Round Amount" value={txn.is_round_amount} />
                <Separator className="my-2" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>24h txn count: {txn.txn_count_last_24h ?? "N/A"}</p>
                  <p>7d txn count: {txn.txn_count_last_7d ?? "N/A"}</p>
                  <p>30d txn count: {txn.txn_count_last_30d ?? "N/A"}</p>
                  <p>30d avg amount: {txn.avg_txn_amount_30d !== undefined ? formatCurrency(txn.avg_txn_amount_30d, txn.currency) : "N/A"}</p>
                  <p>Same beneficiary (7d): {txn.same_beneficiary_count_7d ?? "N/A"}</p>
                  <p>Days since last txn: {txn.days_since_last_txn ?? "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FlagItem({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={value ? "font-semibold text-red-500" : "text-muted-foreground"}>
        {value ? "⚠️ YES" : "No"}
      </span>
    </div>
  );
}
