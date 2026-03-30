import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleIcon } from "@hugeicons/core-free-icons";

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

  const iconColors = {
    HIGH: "text-red-500",
    MEDIUM: "text-amber-500",
    LOW: "text-emerald-500",
  };

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
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
      <HugeiconsIcon 
        icon={CircleIcon} 
        size={size === "sm" ? 8 : size === "md" ? 10 : 12} 
        className={cn("fill-current", iconColors[riskUpper as keyof typeof iconColors] || "text-gray-400")}
      />
      {riskUpper}
    </span>
  );
}
