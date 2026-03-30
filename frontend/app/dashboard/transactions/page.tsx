"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getTransactions } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaginatedTransactions } from "@/lib/types";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleIcon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: 20,
          sort_by: "timestamp",
          sort_order: "desc",
        };
        if (riskFilter !== "all") {
          params.risk_filter = riskFilter;
        }
        const result = await getTransactions(params as Parameters<typeof getTransactions>[0]);
        setData(result);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, riskFilter]);

  return (
    <AppShell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">All Transactions</h2>
            <p className="text-muted-foreground">Browse and filter compliance-checked transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={riskFilter} onValueChange={(v) => { if (v) { setRiskFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
               <SelectItem value="HIGH">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={CircleIcon} size={10} className="fill-current text-red-500" />
                  High Risk
                </span>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={CircleIcon} size={10} className="fill-current text-amber-500" />
                  Medium Risk
                </span>
              </SelectItem>
              <SelectItem value="LOW">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={CircleIcon} size={10} className="fill-current text-emerald-500" />
                  Low Risk
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} transactions found
            </span>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  data?.transactions.map((txn) => (
                    <TableRow key={txn.transaction_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/transactions/${txn.transaction_id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {txn.transaction_id}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(txn.amount, txn.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{txn.sender_name || txn.sender_id}</div>
                        <div className="text-xs text-muted-foreground">{txn.sender_country}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{txn.receiver_name || txn.receiver_id}</div>
                        <div className="text-xs text-muted-foreground">{txn.receiver_country}</div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {txn.transaction_type.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <RiskBadge risk={txn.final_risk} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm">
                        {(txn.risk_score * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {txn.rules_count}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(txn.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.total_pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-2"
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
