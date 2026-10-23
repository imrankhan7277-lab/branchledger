import { categoryClass, type BranchFilter, type Entry } from "./types";
import { marginBp } from "./money";

export interface Statement {
  sales: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  excluded: number; // owner withdrawals / transfers, not part of profit
  marginBp: number | null;
  count: number;
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function localToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function filterEntries(entries: Entry[], f: { month?: string; branch?: BranchFilter }): Entry[] {
  return entries.filter(
    (e) => (!f.month || monthOf(e.date) === f.month) && (!f.branch || f.branch === "all" || e.branchId === f.branch),
  );
}

export function summarize(entries: Entry[]): Statement {
  let sales = 0, cos = 0, opex = 0, excluded = 0;
  for (const e of entries) {
    const cls = categoryClass(e.category);
    if (e.type === "sale") sales += e.amountMinor;
    else if (cls === "cost_of_sales") cos += e.amountMinor;
    else if (cls === "excluded") excluded += e.amountMinor;
    else opex += e.amountMinor; // operating or unknown expense category
  }
  const gross = sales - cos;
  const net = gross - opex;
  return {
    sales, costOfSales: cos, grossProfit: gross, operatingExpenses: opex, netProfit: net,
    excluded, marginBp: marginBp(net, sales), count: entries.length,
  };
}

export function statement(entries: Entry[], month: string, branch: BranchFilter): Statement {
  return summarize(filterEntries(entries, { month, branch }));
}

export interface DayRow {
  date: string;
  sales: number;
  expenses: number; // cost of sales + operating (excluded items omitted)
  net: number;
}

export function dailySeries(entries: Entry[], month: string, branch: BranchFilter): DayRow[] {
  const rows: DayRow[] = [];
  const scoped = filterEntries(entries, { month, branch });
  for (let d = 1; d <= daysInMonth(month); d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const s = summarize(scoped.filter((e) => e.date === date));
    const expenses = s.costOfSales + s.operatingExpenses;
    rows.push({ date, sales: s.sales, expenses, net: s.netProfit });
  }
  return rows;
}

export function categoryTotals(entries: Entry[]): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) if (e.type === "expense") map.set(e.category, (map.get(e.category) ?? 0) + e.amountMinor);
  return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

/** Change in basis points of the previous value, null when previous is 0. */
export function changeBp(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 10000) / Math.abs(previous));
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

