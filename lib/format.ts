export function formatValue(
  value: number,
  format?: "number" | "currency" | "percent"
): string {
  if (!Number.isFinite(value)) return "—";
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  const compact = Math.abs(value) >= 10000;
  const formatted = new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : Math.abs(value) < 10 && value % 1 !== 0 ? 2 : 0,
  }).format(value);
  return format === "currency" ? `$${formatted}` : formatted;
}
