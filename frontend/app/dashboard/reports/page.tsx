"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReport } from "@/lib/api";

const REPORT_TYPES = [
  {
    id: "compliance",
    title: "Full Compliance Report",
    description: "Complete report of all transactions with risk assessments, triggered rules, and explanations.",
    icon: "📋",
  },
  {
    id: "flagged",
    title: "Flagged Transactions Report",
    description: "Only medium and high risk transactions that require attention or further review.",
    icon: "⚠️",
  },
  {
    id: "sar",
    title: "SAR/STR Report",
    description: "Suspicious Activity Reports for high-risk transactions. For regulatory filing with FinCEN.",
    icon: "🚨",
  },
] as const;

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

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

  return (
    <AppShell role="admin">
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
                <div className="mb-2 text-3xl">{report.icon}</div>
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
                    "📥 Download CSV"
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
