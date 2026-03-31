"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  KnightShieldIcon,
  AiBrain01Icon,
  DocumentValidationIcon,
  ArrowRight01Icon,
  BankIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";

const features = [
  {
    icon: Analytics01Icon,
    title: "Real-Time Monitoring",
    description:
      "Every transaction is analyzed against 12 regulatory compliance rules in milliseconds, covering BSA, FATF, OFAC, and AML guidelines.",
  },
  {
    icon: AiBrain01Icon,
    title: "ML Risk Scoring",
    description:
      "A trained Gradient Boosting model evaluates behavioral patterns, velocity anomalies, and entity risk to produce an intelligent risk score.",
  },
  {
    icon: KnightShieldIcon,
    title: "Regulatory Compliance",
    description:
      "Built for BSA/CTR thresholds, FATF high-risk jurisdictions, OFAC sanctions screening, and KYC verification status checks.",
  },
  {
    icon: DocumentValidationIcon,
    title: "Automated SAR Reports",
    description:
      "Generate FinCEN-formatted Suspicious Activity Reports as PDF documents with a single click for regulatory filing.",
  },
];

const stats = [
  { label: "Compliance Rules", value: "12" },
  { label: "ML Features", value: "20+" },
  { label: "Currencies", value: "10" },
  { label: "Jurisdictions", value: "29" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight">
                RegTech CFMS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-chart-2/5 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-chart-4/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badges */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                size={14}
                className="text-primary"
              />
              BSA / FATF / OFAC / KYC Compliant
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Financial Compliance{" "}
              <span className="text-primary">Monitoring System</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              An intelligent RegTech platform that combines rule-based compliance
              checks with ML-powered risk scoring to detect suspicious financial
              activity in real time.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="gap-2 px-8">
                  <HugeiconsIcon icon={BankIcon} size={18} />
                  Customer Portal
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="gap-2 px-8">
                  <HugeiconsIcon icon={Analytics01Icon} size={18} />
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Enterprise-Grade Compliance
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built to meet the standards of real financial institutions with a
            multi-layered detection architecture.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-lg text-primary">
                <HugeiconsIcon icon={f.icon} size={28} />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Every transaction passes through a multi-stage compliance pipeline.
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-4">
            {[
              {
                step: "01",
                title: "Transaction Submitted",
                desc: "Customer sends a transfer via the banking portal.",
              },
              {
                step: "02",
                title: "Rule Engine",
                desc: "12 regulatory rules evaluate CTR thresholds, sanctions, KYC, and more.",
              },
              {
                step: "03",
                title: "ML Scoring",
                desc: "Gradient Boosting model analyzes behavioral patterns and entity risk.",
              },
              {
                step: "04",
                title: "Decision & Report",
                desc: "Final risk classification with explainable reasons and SAR generation.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-border/50 bg-card p-5"
              >
                <span className="text-3xl font-bold text-primary/20">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12 text-center">
          <h2 className="text-2xl font-bold">Ready to Explore?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Sign in as a customer to send transactions, or access the admin
            dashboard to monitor compliance in real time.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Enter Portal
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 RegTech CFMS — AML/KYC Compliance Engine
          </p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>FATF</span>
            <span>BSA</span>
            <span>OFAC</span>
            <span>KYC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
