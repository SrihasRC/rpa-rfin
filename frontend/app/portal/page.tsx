"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getTransactions, getDashboardStats } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardStats, Transaction } from "@/lib/types";
import Link from "next/link";

export default function PortalPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          getDashboardStats(),
          getTransactions({ page: 1, page_size: 8, sort_by: "timestamp", sort_order: "desc" }),
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

  if (loading) {
    return (
      <AppShell role="user">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading account...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="user">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="max-w-md border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Connection Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Backend server is not reachable. Please try again later.
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="user">
      <div className="space-y-8">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Account</h2>
            <p className="text-muted-foreground">Welcome back — here&#39;s your account overview</p>
          </div>
          <Link href="/portal/send">
            <Button size="lg" className="gap-2">
              💸 Send Money
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Transactions"
              value={stats.total_transactions}
              icon="📊"
            />
            <StatCard
              title="Flagged"
              value={stats.total_flagged}
              subtitle="require attention"
              icon="⚠️"
              variant={stats.total_flagged > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Account Status"
              value="Active"
              subtitle="verified"
              icon="✅"
              variant="success"
            />
          </div>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your latest transaction activity</CardDescription>
            </div>
            <Link href="/portal/history">
              <Button variant="outline" size="sm">View All →</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTxns.map((txn) => (
                  <TableRow key={txn.transaction_id}>
                    <TableCell>
                      <Link
                        href={`/transactions/${txn.transaction_id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {txn.transaction_id.slice(0, 12)}...
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(txn.amount, txn.currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.receiver_name || txn.receiver_id}
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={txn.final_risk} size="sm" />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(txn.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentTxns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
