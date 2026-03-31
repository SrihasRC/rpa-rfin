"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  FileValidationIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!transaction) return null;

  const txn = transaction;
  const riskPercent = (txn.risk_score * 100).toFixed(1);
  const isHighRisk = txn.final_risk === "HIGH";

  const handleDownloadSarPdf = async () => {
    setDownloadingPdf(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(
        `${API_BASE}/api/reports/sar/${txn.transaction_id}/pdf`
      );
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAR_${txn.transaction_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SAR PDF download failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(txn, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${txn.transaction_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-mono text-sm">
              {txn.transaction_id}
            </DialogTitle>
            <RiskBadge risk={txn.final_risk} size="lg" />
          </div>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-lg font-bold">
              {formatCurrency(txn.amount, txn.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium">{formatDate(txn.timestamp)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="text-sm font-medium capitalize">
              {(txn.transaction_type || "").replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <Separator />

        {/* Parties */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Parties</h4>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Sender</p>
              <p className="text-sm font-medium">
                {txn.sender_name || txn.sender_id}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {txn.sender_country}
              </p>
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              className="text-muted-foreground"
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Receiver</p>
              <p className="text-sm font-medium">
                {txn.receiver_name || txn.receiver_id}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {txn.receiver_country}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Risk Assessment */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Risk Assessment</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className="text-2xl font-bold">{riskPercent}%</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <p className="text-lg font-bold">{txn.final_risk}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Rules Triggered</p>
              <p className="text-2xl font-bold">{txn.rules_count}</p>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  txn.final_risk === "HIGH"
                    ? "bg-red-500"
                    : txn.final_risk === "MEDIUM"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(txn.risk_score * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Triggered Rules */}
        {txn.rules_triggered && txn.rules_triggered.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Triggered Rules ({txn.rules_triggered.length})
              </h4>
              <div className="space-y-2">
                {txn.rules_triggered.map((rule, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {rule.id}
                      </Badge>
                      <span className="text-sm font-medium">{rule.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {rule.source}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rule.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Explanation */}
        {txn.explanation_summary && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Compliance Explanation
              </h4>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm">{txn.explanation_summary}</p>
              </div>
            </div>
          </>
        )}

        {/* KYC & Entity Flags */}
        <Separator />
        <div>
          <h4 className="mb-2 text-sm font-semibold">Additional Flags</h4>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={txn.kyc_status === "verified" ? "secondary" : "destructive"}
            >
              KYC: {txn.kyc_status}
            </Badge>
            {txn.is_sanctioned_entity && (
              <Badge variant="destructive">Sanctioned Entity</Badge>
            )}
            {txn.is_pep && (
              <Badge variant="destructive">PEP</Badge>
            )}
            {txn.is_round_amount && (
              <Badge variant="outline">Round Amount</Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex gap-2">
          {isHighRisk && (
            <Button
              onClick={handleDownloadSarPdf}
              disabled={downloadingPdf}
              size="sm"
              variant="destructive"
            >
              <HugeiconsIcon icon={FileValidationIcon} size={16} className="mr-2" />
              {downloadingPdf ? "Generating..." : "Download SAR PDF"}
            </Button>
          )}
          <Button onClick={handleDownloadJson} size="sm" variant="outline">
            <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
            Export JSON
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
