export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export function formatCurrency(cents: number): string {
  const amount = cents / 100;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

export function formatDateTime(utcString: string): string {
  return utcString.replace("T", " ").replace("Z", " UTC");
}

export function nowUTC(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
