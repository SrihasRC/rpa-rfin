"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { sendTransaction } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  MoneySend01Icon,
} from "@hugeicons/core-free-icons";

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF"];
const TXN_TYPES = ["wire_transfer", "ach", "card_payment", "cash_deposit", "internal_transfer"];

interface SendResult {
  transaction_id: string;
  amount: number;
  currency: string;
  receiver_name?: string;
  timestamp: string;
}

export default function SendMoneyPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverCountry, setReceiverCountry] = useState("US");
  const [txnType, setTxnType] = useState("wire_transfer");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await sendTransaction(
        {
          amount: parseFloat(amount),
          currency,
          sender_id: "ACC_12345678",
          sender_country: "US",
          receiver_id: receiverId,
          receiver_name: receiverName,
          receiver_country: receiverCountry,
          transaction_type: txnType,
        },
        "ACC_12345678"
      );
      setResult({
        transaction_id: res.transaction_id,
        amount: res.amount,
        currency: res.currency,
        receiver_name: res.receiver_name,
        timestamp: res.timestamp,
      });
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
          <p className="text-muted-foreground">
            Transfer funds securely. All transactions are processed and monitored for compliance.
          </p>
        </div>

        {/* Success State */}
        {result ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={48}
                  className="text-emerald-500"
                />
                <div>
                  <h3 className="text-xl font-bold">Transaction Submitted</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your transfer is being processed. Compliance checks run automatically in the background.
                  </p>
                </div>

                <Separator />

                <div className="grid w-full gap-2 text-left sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{result.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(result.amount, result.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recipient</p>
                    <p className="text-sm">{result.receiver_name || receiverId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/portal/history")}
                  >
                    View History
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setResult(null);
                      setAmount("");
                      setReceiverId("");
                      setReceiverName("");
                    }}
                  >
                    <HugeiconsIcon icon={MoneySend01Icon} size={14} className="mr-1" />
                    Send Another
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Transfer</CardTitle>
              <CardDescription>
                All transfers are subject to AML/KYC compliance checks
              </CardDescription>
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
                              {t.replace(/_/g, " ")}
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
                      Submitting transfer...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={MoneySend01Icon} size={18} />
                      {`Send ${amount ? formatCurrency(parseFloat(amount), currency) : "Money"}`}
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
