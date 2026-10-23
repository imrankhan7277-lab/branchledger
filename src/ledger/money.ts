export const MAX_AMOUNT_MINOR = 100_000_000_000_00; // 100 billion major units

/** Parse a user-typed positive amount with up to 2 decimals into integer minor units. */
export function parseAmount(input: string): { ok: true; minor: number } | { ok: false; error: string } {
  const s = input.trim().replace(/,/g, "");
  if (!s) return { ok: false, error: "Amount is required" };
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, error: "Use a positive number with at most 2 decimals" };
  const minor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return { ok: false, error: "Amount is too large" };
  if (minor <= 0) return { ok: false, error: "Amount must be greater than zero" };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: "Amount is too large" };
  return { ok: true, minor };
}

/** Exact decimal string from minor units, no floating point. */
export function minorToDecimal(minor: number): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

export function formatMoney(minor: number, currency: string): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(
      Number(minorToDecimal(minor)),
    );
  } catch {
    return `${currency} ${minorToDecimal(minor)}`;
  }
}

/** Margin in basis points (integer) or null when sales are zero. */
export function marginBp(net: number, sales: number): number | null {
  if (sales === 0) return null;
  return Math.round((net * 10000) / sales);
}

export function formatBp(bp: number | null): string {
  if (bp === null) return "N/A";
  const sign = bp < 0 ? "-" : "";
  const a = Math.abs(bp);
  return `${sign}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}%`;
}

