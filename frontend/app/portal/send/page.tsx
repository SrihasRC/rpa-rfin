"use client";

import { useEffect, useState } from "react";
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
import { sendTransaction, type User } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  MoneySend01Icon,
  AlertCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF"];
const TXN_TYPES = ["wire_transfer", "ach", "card_payment", "internal_transfer"];

interface SendResult {
  transaction_id: string;
  amount: number;
  currency: string;
  receiver_name?: string;
  timestamp: string;
  risk_level: string;
  new_balance: number;
}

export default function SendMoneyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverCountry, setReceiverCountry] = useState("US");
  const [txnType, setTxnType] = useState("wire_transfer");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(storedUser) as User;
    if (userData.role === "admin") {
      router.push("/dashboard");
      return;
    }
    setUser(userData);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await sendTransaction(
        {
          amount: parseFloat(amount),
          currency,
          receiver_id: receiverId,
          receiver_name: receiverName,
          receiver_country: receiverCountry,
          transaction_type: txnType,
        },
        user.account_id
      );
      
      // Update user balance in localStorage
      const updatedUser = { ...user, balance: res.new_balance };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      setResult({
        transaction_id: res.transaction_id,
        amount: res.amount,
        currency: res.currency,
        receiver_name: res.receiver_name,
        timestamp: res.timestamp,
        risk_level: res.compliance.risk_level,
        new_balance: res.new_balance,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <AppShell role="user" user={null}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="user" user={user}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Send Money</h2>
            <p className="text-muted-foreground">
              Transfer funds securely. All transactions are compliance-checked.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
            <HugeiconsIcon icon={Wallet01Icon} size={18} className="text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-semibold">{formatCurrency(user.balance, "USD")}</p>
            </div>
          </div>
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
                  <h3 className="text-xl font-bold">Transaction Completed</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your transfer has been processed and compliance-checked.
                  </p>
                </div>

                <Separator />

                <div className="grid w-full gap-3 text-left sm:grid-cols-2">
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
                    <p className="text-xs text-muted-foreground">Risk Status</p>
                    <p className={`text-sm font-medium ${
                      result.risk_level === "LOW" ? "text-emerald-600" :
                      result.risk_level === "MEDIUM" ? "text-amber-600" : "text-red-600"
                    }`}>
                      {result.risk_level}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New Balance</p>
                    <p className="text-sm font-medium">{formatCurrency(result.new_balance, "USD")}</p>
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
                      max={user.balance}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="text-lg font-medium"
                    />
                    {parseFloat(amount) > user.balance && (
                      <p className="text-xs text-destructive">Exceeds available balance</p>
                    )}
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={sending || parseFloat(amount) > user.balance || !amount}
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
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
              <div className="flex items-center gap-2 text-destructive">
                <HugeiconsIcon icon={AlertCircleIcon} size={18} />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
