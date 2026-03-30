"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  role: "admin" | "user";
}

const adminLinks = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/transactions", label: "Transactions", icon: "📋" },
  { href: "/dashboard/reports", label: "Reports", icon: "📄" },
];

const userLinks = [
  { href: "/portal", label: "My Account", icon: "🏦" },
  { href: "/portal/send", label: "Send Money", icon: "💸" },
  { href: "/portal/history", label: "History", icon: "📋" },
];

export function AppShell({ children, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "admin" ? adminLinks : userLinks;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <Link href={role === "admin" ? "/dashboard" : "/portal"} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none tracking-tight">RegTech CFMS</h1>
              <p className="text-[10px] text-muted-foreground">
                {role === "admin" ? "Compliance Dashboard" : "Banking Portal"}
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={pathname === link.href ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 text-sm",
                    pathname === link.href && "font-semibold"
                  )}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right: Role badge + Logout */}
          <div className="flex items-center gap-3">
            <span className={cn(
              "hidden rounded-full px-3 py-1 text-xs font-medium sm:inline-block",
              role === "admin"
                ? "bg-chart-2/10 text-chart-2"
                : "bg-primary/10 text-primary"
            )}>
              {role === "admin" ? "Compliance Officer" : "Account Holder"}
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/login")}
              className="text-sm text-muted-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="border-t border-border/30 md:hidden">
          <div className="flex gap-1 overflow-x-auto px-4 py-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={pathname === link.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-xs whitespace-nowrap"
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-muted/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            © 2025 RegTech CFMS — AML/KYC Compliance Engine
          </p>
          <p className="text-xs text-muted-foreground">
            FATF · BSA · OFAC · KYC
          </p>
        </div>
      </footer>
    </div>
  );
}
