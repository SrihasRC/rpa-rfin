"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";


export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("user");
  const [error, setError] = useState<string | null>(null);

  // User login form state
  const [userEmail, setUserEmail] = useState("john@example.com");
  const [userPassword, setUserPassword] = useState("demo1234");

  // Admin login form state
  const [adminEmail, setAdminEmail] = useState("admin@regtech.com");
  const [adminPassword, setAdminPassword] = useState("admin1234");

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login(userEmail, userPassword);
      if (response.success && response.user) {
        // Store user in localStorage
        localStorage.setItem("user", JSON.stringify(response.user));
        router.push("/portal");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login(adminEmail, adminPassword);
      if (response.success && response.user) {
        if (response.user.role !== "admin") {
          setError("This account does not have admin access.");
          return;
        }
        // Store user in localStorage
        localStorage.setItem("user", JSON.stringify(response.user));
        router.push("/dashboard");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/50 p-4">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-chart-2/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">RegTech CFMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Financial Compliance Monitoring System
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(null); }} className="w-full">
            <CardHeader className="pb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">User Login</TabsTrigger>
                <TabsTrigger value="admin">Admin Login</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                {error}
              </div>
            )}

            {/* User Login */}
            <TabsContent value="user" className="mt-0">
              <form onSubmit={handleUserLogin}>
                <CardContent className="space-y-4 pt-0">
                  <CardDescription>
                    Access your banking portal to view transactions and send transfers.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-pass">Password</Label>
                    <Input
                      id="user-pass"
                      type="password"
                      placeholder="Enter password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Demo Accounts:</p>
                    <p>john@example.com / demo1234</p>
                    <p>jane@example.com / demo1234</p>
                    <p>raj@example.com / demo1234</p>
                  </div>
                </CardContent>
              </form>
            </TabsContent>

            {/* Admin Login */}
            <TabsContent value="admin" className="mt-0">
              <form onSubmit={handleAdminLogin}>
                <CardContent className="space-y-4 pt-0">
                  <CardDescription>
                    Compliance officer dashboard for monitoring and reports.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@regtech.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-pass">Password</Label>
                    <Input
                      id="admin-pass"
                      type="password"
                      placeholder="Enter password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Signing in...
                      </span>
                    ) : (
                      "Access Dashboard"
                    )}
                  </Button>
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Admin Account:</p>
                    <p>admin@regtech.com / admin1234</p>
                  </div>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by RegTech CFMS - AML/KYC Compliance Engine v1.0
        </p>
      </div>
    </div>
  );
}
