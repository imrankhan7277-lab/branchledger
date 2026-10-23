import { dailySeries, statement } from "./compute";
import { minorToDecimal, formatBp } from "./money";
import { BRANCH_IDS, type BranchFilter, type Entry, type Settings } from "./types";

/** Quote every cell and neutralise spreadsheet formula injection. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function entriesCsv(entries: Entry[], settings: Settings): string {
  return toCsv([
    ["Date", "Branch", "Type", "Category", `Amount (${settings.currency})`, "Payment method", "Notes"],
    ...entries.map((e) => [
      e.date, settings.branches[e.branchId], e.type === "sale" ? "Sale" : "Expense", e.category,
      minorToDecimal(e.amountMinor), e.paymentMethod, e.notes,
    ]),
  ]);
}

export function dailyCsv(entries: Entry[], month: string, branch: BranchFilter, settings: Settings): string {
  const label = branch === "all" ? "All branches" : settings.branches[branch];
  return toCsv([
    ["Date", "Scope", `Sales (${settings.currency})`, "Expenses", "Net"],
    ...dailySeries(entries, month, branch).map((d) => [
      d.date, label, minorToDecimal(d.sales), minorToDecimal(d.expenses), minorToDecimal(d.net),
    ]),
  ]);
}

export function monthlyCsv(entries: Entry[], month: string, settings: Settings): string {
  const scopes: [string, BranchFilter][] = [...BRANCH_IDS.map((b) => [settings.branches[b], b] as [string, BranchFilter]), ["Consolidated", "all"]];
  const st = scopes.map(([, b]) => statement(entries, month, b));
  const line = (label: string, k: "sales" | "costOfSales" | "grossProfit" | "operatingExpenses" | "netProfit" | "excluded") =>
    [label, ...st.map((s) => minorToDecimal(s[k]))];
  return toCsv([
    [`Monthly P&L ${month} (${settings.currency})`, ...scopes.map(([n]) => n)],
    line("Sales", "sales"),
    line("Cost of sales", "costOfSales"),
    line("Gross profit", "grossProfit"),
    line("Operating expenses", "operatingExpenses"),
    line("Net profit", "netProfit"),
    ["Net margin", ...st.map((s) => formatBp(s.marginBp))],
    line("Excluded (owner withdrawals / transfers)", "excluded"),
  ]);
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

