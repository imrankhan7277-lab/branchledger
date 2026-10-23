import { daysInMonth, prevMonth } from "./compute";
import type { Entry, LedgerData } from "./types";

/** Deterministic fictional dataset. Never persisted. */
export function makeDemoData(currentMonth: string): LedgerData {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const months = [prevMonth(prevMonth(currentMonth)), prevMonth(currentMonth), currentMonth];
  const entries: Entry[] = [];
  let n = 0;
  const add = (date: string, branchId: "b1" | "b2", type: Entry["type"], category: string, major: number, pm: string, notes = "") =>
    entries.push({
      id: `demo-${++n}`, date, branchId, type, category, amountMinor: Math.round(major * 100), paymentMethod: pm,
      notes, createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
    });
  months.forEach((m, mi) => {
    const days = mi === 2 ? Math.min(daysInMonth(m), 20) : daysInMonth(m);
    for (let d = 1; d <= days; d++) {
      const date = `${m}-${String(d).padStart(2, "0")}`;
      add(date, "b1", "sale", "Product sales", 18000 + Math.floor(rnd() * 9000), rnd() > 0.5 ? "UPI" : "Cash");
      add(date, "b2", "sale", "Service sales", 11000 + Math.floor(rnd() * 7000), rnd() > 0.5 ? "Card" : "UPI");
      if (d % 3 === 0) add(date, "b1", "expense", "Cost of goods sold", 22000 + Math.floor(rnd() * 8000), "Bank transfer");
      if (d % 4 === 0) add(date, "b2", "expense", "Direct materials", 9000 + Math.floor(rnd() * 5000), "Bank transfer");
      if (d % 7 === 0) add(date, mi % 2 ? "b1" : "b2", "expense", "Supplies", 1500 + Math.floor(rnd() * 1500), "Cash");
    }
    add(`${m}-01`, "b1", "expense", "Rent", 85000, "Bank transfer", "Demo rent");
    add(`${m}-01`, "b2", "expense", "Rent", 60000, "Bank transfer", "Demo rent");
    add(`${m}-05`, "b1", "expense", "Salaries", 120000, "Bank transfer");
    add(`${m}-05`, "b2", "expense", "Salaries", mi === 2 ? 140000 : 95000, "Bank transfer");
    add(`${m}-10`, "b1", "expense", "Utilities", 9000 + mi * 1200, "UPI");
    add(`${m}-10`, "b2", "expense", "Marketing", 15000 + mi * 9000, "Card");
    add(`${m}-15`, "b1", "expense", "Owner withdrawal", 40000, "Bank transfer", "Excluded from profit");
  });
  return { settings: { branches: { b1: "Demo Central", b2: "Demo Riverside" }, currency: "INR" }, entries };
}

