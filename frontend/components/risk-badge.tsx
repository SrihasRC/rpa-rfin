import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  risk: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RiskBadge({ risk, size = "md", className }: RiskBadgeProps) {
  const riskUpper = risk?.toUpperCase() || "LOW";

  const colors = {
    HIGH: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    LOW: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  };

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  const icons = {
    HIGH: "🔴",
    MEDIUM: "🟡",
    LOW: "🟢",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        colors[riskUpper as keyof typeof colors] || colors.LOW,
        sizes[size],
        className
      )}
    >
      <span className="text-[0.6em]">{icons[riskUpper as keyof typeof icons] || "⚪"}</span>
      {riskUpper}
    </span>
  );
}
