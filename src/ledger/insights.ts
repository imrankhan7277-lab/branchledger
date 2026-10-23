import { changeBp, filterEntries, prevMonth, statement } from "./compute";
import { formatBp, formatMoney } from "./money";
import { BRANCH_IDS, type Entry, type Settings } from "./types";

export interface Insight {
  id: string;
  level: "alert" | "warning" | "info" | "good";
  title: string;
  detail: string;
}

/** Rule-based, deterministic observations. Not AI. */
export function computeInsights(entries: Entry[], month: string, settings: Settings, today: string): Insight[] {
  const out: Insight[] = [];
  const fmt = (m: number) => formatMoney(m, settings.currency);
  const pm = prevMonth(month);
  for (const b of BRANCH_IDS) {
    const name = settings.branches[b];
    const s = statement(entries, month, b);
    const p = statement(entries, pm, b);
    if (s.count === 0) { out.push({ id: `empty-${b}`, level: "info", title: `${name}: no entries this month`, detail: "Add daily sales and expenses to see results." }); continue; }
    if (s.netProfit < 0) out.push({ id: `loss-${b}`, level: "alert", title: `${name} is at a net loss`, detail: `Net ${fmt(s.netProfit)} on sales of ${fmt(s.sales)}.` });
    if (s.sales > 0 && s.costOfSales * 100 > s.sales * 60)
      out.push({ id: `cos-${b}`, level: "warning", title: `${name}: cost of sales above 60% of sales`, detail: `Cost of sales is ${formatBp(Math.round((s.costOfSales * 10000) / s.sales))} of sales.` });
    const opexCh = changeBp(s.operatingExpenses, p.operatingExpenses);
    if (opexCh !== null && opexCh > 2000)
      out.push({ id: `opex-${b}`, level: "warning", title: `${name}: operating expenses up ${formatBp(opexCh)}`, detail: `${fmt(s.operatingExpenses)} vs ${fmt(p.operatingExpenses)} last month.` });
    const salesCh = changeBp(s.sales, p.sales);
    if (salesCh !== null && salesCh >= 1000)
      out.push({ id: `growth-${b}`, level: "good", title: `${name}: sales up ${formatBp(salesCh)}`, detail: `Compared with ${pm}.` });
  }
  if (month === today.slice(0, 7)) {
    const recent = filterEntries(entries, { month }).some((e) => e.date <= today && e.date >= shiftDays(today, -3));
    if (!recent && entries.length) out.push({ id: "stale", level: "info", title: "No entries in the last 3 days", detail: "Keep daily records up to date for accurate totals." });
  }
  const excl = statement(entries, month, "all").excluded;
  if (excl > 0) out.push({ id: "excluded", level: "info", title: "Owner withdrawals / transfers excluded", detail: `${fmt(excl)} recorded this month is not counted in profit.` });
  return out;
}

function shiftDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

