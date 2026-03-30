"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("user");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push("/portal");
    }, 500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push("/portal");
    }, 800);
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">RegTech CFMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Financial Compliance Monitoring System
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="user">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* User Login */}
            <TabsContent value="user" className="mt-0">
              <form onSubmit={handleUserLogin}>
                <CardContent className="space-y-4 pt-0">
                  <CardDescription>
                    Access your account to view transactions and send transfers.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="user-id">Account ID</Label>
                    <Input
                      id="user-id"
                      placeholder="ACC_XXXXXXXX"
                      defaultValue="ACC_12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-pass">Password</Label>
                    <Input
                      id="user-pass"
                      type="password"
                      placeholder="••••••••"
                      defaultValue="demo1234"
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
                  <p className="text-center text-xs text-muted-foreground">
                    Demo mode — any credentials work
                  </p>
                </CardContent>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4 pt-0">
                  <CardDescription>
                    Create a new banking account. KYC verification is simulated.
                  </CardDescription>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first">First Name</Label>
                      <Input
                        id="signup-first"
                        placeholder="John"
                        defaultValue="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last">Last Name</Label>
                      <Input
                        id="signup-last"
                        placeholder="Doe"
                        defaultValue="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="john@example.com"
                      defaultValue="john@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-country">Country Code</Label>
                    <Input
                      id="signup-country"
                      placeholder="US"
                      defaultValue="US"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pass">Password</Label>
                    <Input
                      id="signup-pass"
                      type="password"
                      placeholder="••••••••"
                      defaultValue="demo1234"
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
                        Creating account...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Demo mode — account creation is simulated
                  </p>
                </CardContent>
              </form>
            </TabsContent>

            {/* Admin Login */}
            <TabsContent value="admin" className="mt-0">
              <form onSubmit={handleAdminLogin}>
                <CardContent className="space-y-4 pt-0">
                  <CardDescription>
                    Compliance officer dashboard — monitor, review, and generate reports.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@regtech.com"
                      defaultValue="admin@regtech.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-pass">Password</Label>
                    <Input
                      id="admin-pass"
                      type="password"
                      placeholder="••••••••"
                      defaultValue="admin1234"
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
                  <p className="text-center text-xs text-muted-foreground">
                    Demo mode — any credentials work
                  </p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by RegTech CFMS &middot; AML/KYC Compliance Engine v1.0
        </p>
      </div>
    </div>
  );
}
