/**
 * Currency formatting utilities.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "د.إ",
  CHF: "CHF ",
};

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRiskColor(risk: string): string {
  switch (risk?.toUpperCase()) {
    case "HIGH":
      return "text-red-600 dark:text-red-400";
    case "MEDIUM":
      return "text-amber-600 dark:text-amber-400";
    case "LOW":
      return "text-emerald-600 dark:text-emerald-400";
    default:
      return "text-muted-foreground";
  }
}

export function getRiskBgColor(risk: string): string {
  switch (risk?.toUpperCase()) {
    case "HIGH":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "LOW":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", IN: "India", GB: "United Kingdom", DE: "Germany",
  FR: "France", JP: "Japan", AU: "Australia", CA: "Canada",
  SG: "Singapore", AE: "UAE", BR: "Brazil", ZA: "South Africa",
  KR: "South Korea", MX: "Mexico", IT: "Italy", ES: "Spain",
  NL: "Netherlands", SE: "Sweden", CH: "Switzerland", HK: "Hong Kong",
  IR: "Iran", KP: "North Korea", MM: "Myanmar", SY: "Syria",
  YE: "Yemen", AF: "Afghanistan", PK: "Pakistan", NG: "Nigeria", TZ: "Tanzania",
};
