"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getTransactions, getDashboardStats, topUpBalance, type User } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardStats, Transaction } from "@/lib/types";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  MoneySend01Icon, 
  Analytics01Icon, 
  AlertCircleIcon, 
  Tick01Icon,
  ArrowRight01Icon,
  Wallet01Icon,
  Add01Icon
} from "@hugeicons/core-free-icons";

export default function PortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Top-up state
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
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

    async function load() {
      try {
        const [s, t] = await Promise.all([
          getDashboardStats(userData.account_id),
          getTransactions({ 
            page: 1, 
            page_size: 8, 
            sort_by: "timestamp", 
            sort_order: "desc",
            user_id: userData.account_id 
          }),
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
  }, [router]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setTopUpError("Please enter a valid amount");
      return;
    }
    if (amount > 1000000) {
      setTopUpError("Maximum top-up is $1,000,000");
      return;
    }

    setTopUpLoading(true);
    setTopUpError(null);

    try {
      const result = await topUpBalance(user!.account_id, amount);
      // Update local user state
      const updatedUser = { ...user!, balance: result.new_balance };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setTopUpOpen(false);
      setTopUpAmount("");
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <AppShell role="user" user={user}>
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
      <AppShell role="user" user={user}>
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
    <AppShell role="user" user={user}>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome, {user.first_name}
            </h2>
            <p className="text-muted-foreground">
              Account: {user.account_id}
              <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {user.account_type === "business" ? "Business" : "Individual"}
              </span>
            </p>
          </div>
          <Link href="/portal/send">
            <Button size="lg" className="gap-2">
              <HugeiconsIcon icon={MoneySend01Icon} size={20} />
              Send Money
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                    <HugeiconsIcon icon={Wallet01Icon} size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold">{formatCurrency(user.balance, "USD")}</p>
                  </div>
                </div>
                <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
                  <DialogTrigger
                    render={
                      <Button size="sm" variant="outline" className="gap-1">
                        <HugeiconsIcon icon={Add01Icon} size={14} />
                        Top Up
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Balance</DialogTitle>
                      <DialogDescription>
                        Top up your account balance for testing transactions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          min="1"
                          max="1000000"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1000, 5000, 10000, 50000, 100000].map((amt) => (
                          <Button
                            key={amt}
                            variant="outline"
                            size="sm"
                            onClick={() => setTopUpAmount(String(amt))}
                          >
                            ${amt.toLocaleString()}
                          </Button>
                        ))}
                      </div>
                      {topUpError && (
                        <p className="text-sm text-destructive">{topUpError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTopUpOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleTopUp} disabled={topUpLoading}>
                        {topUpLoading ? "Processing..." : "Add Balance"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          <StatCard
            title="Transactions"
            value={stats?.total_transactions || 0}
            icon={<HugeiconsIcon icon={Analytics01Icon} size={20} />}
          />
          <StatCard
            title="Flagged"
            value={stats?.total_flagged || 0}
            subtitle="require attention"
            icon={<HugeiconsIcon icon={AlertCircleIcon} size={20} />}
            variant={(stats?.total_flagged || 0) > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Account Status"
            value={user.kyc_status === "verified" ? "Verified" : user.kyc_status}
            subtitle={`${user.account_age_days} days old`}
            icon={<HugeiconsIcon icon={Tick01Icon} size={20} />}
            variant={user.kyc_status === "verified" ? "success" : "warning"}
          />
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your latest transaction activity</CardDescription>
            </div>
            <Link href="/portal/history">
              <Button variant="outline" size="sm" className="gap-2">
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
                      No transactions yet. Send your first transfer!
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
