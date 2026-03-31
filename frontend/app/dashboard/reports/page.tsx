"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReport, type User } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Task01Icon, 
  AlertCircleIcon, 
  SecurityWarningIcon, 
  Download01Icon 
} from "@hugeicons/core-free-icons";

const REPORT_TYPES = [
  {
    id: "compliance",
    title: "Full Compliance Report",
    description: "Complete report of all transactions with risk assessments, triggered rules, and explanations.",
    icon: <HugeiconsIcon icon={Task01Icon} size={32} className="text-primary" />,
  },
  {
    id: "flagged",
    title: "Flagged Transactions Report",
    description: "Only medium and high risk transactions that require attention or further review.",
    icon: <HugeiconsIcon icon={AlertCircleIcon} size={32} className="text-amber-500" />,
  },
  {
    id: "sar",
    title: "SAR/STR Report",
    description: "Suspicious Activity Reports for high-risk transactions. For regulatory filing with FinCEN.",
    icon: <HugeiconsIcon icon={SecurityWarningIcon} size={32} className="text-destructive" />,
  },
] as const;

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(storedUser) as User;
    if (userData.role !== "admin") {
      router.push("/portal");
      return;
    }
    setUser(userData);
  }, [router]);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      await getReport(type as "compliance" | "flagged" | "sar", "csv");
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  if (!user) {
    return (
      <AppShell role="admin" user={null}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="admin" user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and download compliance reports for auditing and regulatory filing
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => (
            <Card key={report.id} className="flex flex-col transition-all hover:shadow-md">
              <CardHeader>
                <div className="mb-2">{report.icon}</div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleDownload(report.id)}
                  disabled={downloading === report.id}
                >
                  {downloading === report.id ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={Download01Icon} size={16} />
                      Download CSV
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
