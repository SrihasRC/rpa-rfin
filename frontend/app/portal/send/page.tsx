"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { complianceCheck } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { ComplianceResult } from "@/lib/types";

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF"];
const TXN_TYPES = ["wire_transfer", "ach", "card_payment", "cash_deposit", "internal_transfer"];

export default function SendMoneyPage() {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverCountry, setReceiverCountry] = useState("US");
  const [txnType, setTxnType] = useState("wire_transfer");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await complianceCheck({
        amount: parseFloat(amount),
        currency,
        sender_id: "ACC_12345678",
        sender_country: "US",
        sender_account_age_days: 365,
        receiver_id: receiverId,
        receiver_name: receiverName,
        receiver_country: receiverCountry,
        transaction_type: txnType,
        kyc_status: "verified",
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell role="user">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Send Money</h2>
          <p className="text-muted-foreground">Transfer funds — your transaction will be compliance-checked in real time</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Transfer</CardTitle>
            <CardDescription>All transfers are subject to AML/KYC compliance checks</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Receiver */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Beneficiary Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="receiver-id">Account/ID</Label>
                    <Input
                      id="receiver-id"
                      placeholder="ACC_XXXXXXXX"
                      value={receiverId}
                      onChange={(e) => setReceiverId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiver-name">Name</Label>
                    <Input
                      id="receiver-name"
                      placeholder="Beneficiary name"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      placeholder="Country code (e.g. US, IN, GB)"
                      value={receiverCountry}
                      onChange={(e) => setReceiverCountry(e.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <Select value={txnType} onValueChange={(v) => { if (v) setTxnType(v); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TXN_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={sending}>
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing compliance check...
                  </span>
                ) : (
                  `Send ${amount ? formatCurrency(parseFloat(amount), currency) : "Money"}`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Compliance Result</CardTitle>
                <RiskBadge risk={result.final_risk} size="lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{result.transaction_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="text-lg font-bold">{(result.risk_score * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rules Triggered</p>
                  <p className="text-lg font-bold">{result.rules_count}</p>
                </div>
              </div>

              {result.explanation && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-sm font-medium">Assessment</p>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm">{result.explanation.summary}</p>
                    </div>
                  </div>
                  {result.explanation.reasons.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Reasons</p>
                      <ul className="space-y-1">
                        {result.explanation.reasons.map((r, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rounded-lg bg-primary/5 p-3">
                    <p className="text-xs font-medium text-primary">Recommendation</p>
                    <p className="mt-1 text-sm">{result.explanation.recommendation}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
