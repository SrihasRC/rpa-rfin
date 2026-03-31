"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { RiskBadge } from "@/components/risk-badge";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getDashboardStats, getTransactions } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardStats, Transaction } from "@/lib/types";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  Analytics01Icon,
  CircleIcon,
  AlertCircleIcon,
  ChartLineData01Icon,
  Money01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { getReport } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          getDashboardStats(),
          getTransactions({ page: 1, page_size: 10, sort_by: "timestamp", sort_order: "desc" }),
        ]);
        setStats(s);
        setRecentTxns(t.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRowClick = (txn: Transaction) => {
    setSelectedTxn(txn);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading compliance dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="max-w-md border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Connection Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Make sure the backend server is running at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">http://localhost:8000</code>
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h2>
            <p className="text-muted-foreground">Real-time transaction monitoring and risk analysis</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => getReport("flagged", "csv")}>
              <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
              Flagged Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => getReport("compliance", "csv")}>
              <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
              Full Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Transactions"
              value={stats.total_transactions.toLocaleString()}
              subtitle={`across ${stats.currencies_seen.length} currencies`}
              icon={<HugeiconsIcon icon={Analytics01Icon} size={20} />}
            />
            <StatCard
              title="High Risk"
              value={stats.high_risk_count}
              subtitle={`${((stats.high_risk_count / stats.total_transactions) * 100).toFixed(1)}% of total`}
              icon={<HugeiconsIcon icon={CircleIcon} size={20} className="fill-current" />}
              variant="danger"
            />
            <StatCard
              title="Medium Risk"
              value={stats.medium_risk_count}
              subtitle={`${((stats.medium_risk_count / stats.total_transactions) * 100).toFixed(1)}% of total`}
              icon={<HugeiconsIcon icon={CircleIcon} size={20} className="fill-current" />}
              variant="warning"
            />
            <StatCard
              title="Low Risk"
              value={stats.low_risk_count}
              subtitle={`${((stats.low_risk_count / stats.total_transactions) * 100).toFixed(1)}% of total`}
              icon={<HugeiconsIcon icon={CircleIcon} size={20} className="fill-current" />}
              variant="success"
            />
          </div>
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Flagged Transactions"
              value={stats.total_flagged}
              subtitle={`${stats.flagged_percentage}% flagging rate`}
              icon={<HugeiconsIcon icon={AlertCircleIcon} size={20} />}
              variant="warning"
            />
            <StatCard
              title="Avg Risk Score"
              value={(stats.avg_risk_score * 100).toFixed(1) + "%"}
              subtitle="across all transactions"
              icon={<HugeiconsIcon icon={ChartLineData01Icon} size={20} />}
            />
            <StatCard
              title="Total Volume (USD)"
              value={formatCurrency(stats.total_amount_usd)}
              subtitle="USD-equivalent total"
              icon={<HugeiconsIcon icon={Money01Icon} size={20} />}
            />
          </div>
        )}

        {/* Risk Distribution */}
        {stats && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Distribution</CardTitle>
                <CardDescription>Breakdown of transaction risk levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Low Risk", count: stats.low_risk_count, pct: (stats.low_risk_count / stats.total_transactions) * 100, color: "bg-emerald-500" },
                    { label: "Medium Risk", count: stats.medium_risk_count, pct: (stats.medium_risk_count / stats.total_transactions) * 100, color: "bg-amber-500" },
                    { label: "High Risk", count: stats.high_risk_count, pct: (stats.high_risk_count / stats.total_transactions) * 100, color: "bg-red-500" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.count} ({item.pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Currencies Monitored</CardTitle>
                <CardDescription>Active currencies in the compliance pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.currencies_seen.map((c) => (
                    <span
                      key={c}
                      className="rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Click a row to view full details</CardDescription>
            </div>
            <Link href="/dashboard/transactions">
              <Button variant="outline" size="sm" className="gap-1">
                View All
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTxns.map((txn) => (
                  <TableRow
                    key={txn.transaction_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(txn)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs text-primary">
                        {txn.transaction_id.slice(0, 12)}...
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(txn.amount, txn.currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs">{txn.sender_country}</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="mx-1 inline text-muted-foreground" />
                      <span className="font-mono text-xs">{txn.receiver_country}</span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={txn.final_risk} size="sm" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {(txn.risk_score * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {txn.rules_count}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(txn.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentTxns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No transactions found. Seed the database first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        transaction={selectedTxn}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AppShell>
  );
}
