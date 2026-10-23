import { describe, expect, it } from "vitest";
import { parseAmount, minorToDecimal, formatBp } from "@/ledger/money";
import { filterEntries, prevMonth, statement, summarize } from "@/ledger/compute";
import { csvCell } from "@/ledger/csv";
import { applyImport, makeBackup, parseBackup } from "@/ledger/backup";
import { LedgerSession } from "@/ledger/session";
import { LocalStorageRepository, MemoryRepository } from "@/ledger/repository";
import { emptyData, type Entry } from "@/ledger/types";

let n = 0;
const e = (p: Partial<Entry>): Entry => ({
  id: `t${++n}`, date: "2026-03-10", branchId: "b1", type: "sale", category: "Product sales", amountMinor: 100,
  paymentMethod: "Cash", notes: "", createdAt: "x", updatedAt: "x", ...p,
});

describe("amount parsing (integer minor units)", () => {
  it("parses up to 2 decimals exactly", () => {
    expect(parseAmount("0.1")).toEqual({ ok: true, minor: 10 });
    expect(parseAmount("1234.56")).toEqual({ ok: true, minor: 123456 });
    expect(parseAmount("1,000.05")).toEqual({ ok: true, minor: 100005 });
  });
  it("rejects zero, negatives and 3 decimals", () => {
    expect(parseAmount("0").ok).toBe(false);
    expect(parseAmount("-5").ok).toBe(false);
    expect(parseAmount("1.234").ok).toBe(false);
    expect(parseAmount("abc").ok).toBe(false);
  });
  it("sums without float drift", () => {
    const s = summarize([e({ amountMinor: 10 }), e({ amountMinor: 20 })]);
    expect(s.sales).toBe(30);
    expect(minorToDecimal(s.sales)).toBe("0.30");
  });
});

describe("statement", () => {
  const data = [
    e({ amountMinor: 100000 }),
    e({ branchId: "b2", amountMinor: 50000 }),
    e({ type: "expense", category: "Cost of goods sold", amountMinor: 30000 }),
    e({ type: "expense", category: "Rent", amountMinor: 20000 }),
    e({ type: "expense", category: "Owner withdrawal", amountMinor: 99999 }),
    e({ date: "2026-02-28", amountMinor: 7000 }),
  ];
  it("separates cost of sales, operating and excluded", () => {
    const s = statement(data, "2026-03", "b1");
    expect(s.sales).toBe(100000);
    expect(s.costOfSales).toBe(30000);
    expect(s.grossProfit).toBe(70000);
    expect(s.operatingExpenses).toBe(20000);
    expect(s.netProfit).toBe(50000);
    expect(s.excluded).toBe(99999);
    expect(s.marginBp).toBe(5000);
  });
  it("filters by branch and month", () => {
    expect(statement(data, "2026-03", "b2").sales).toBe(50000);
    expect(statement(data, "2026-03", "all").sales).toBe(150000);
    expect(statement(data, "2026-02", "all").sales).toBe(7000);
    expect(filterEntries(data, { month: "2026-03", branch: "b2" })).toHaveLength(1);
  });
  it("margin is N/A for zero sales", () => {
    const s = summarize([e({ type: "expense", category: "Rent", amountMinor: 500 })]);
    expect(s.marginBp).toBeNull();
    expect(formatBp(s.marginBp)).toBe("N/A");
    expect(s.netProfit).toBe(-500);
  });
  it("previous month wraps year", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
  });
});

describe("csv", () => {
  it("quotes and escapes formulas", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell("-12.50")).toBe('"-12.50"');
  });
});

describe("backups", () => {
  it("rejects malformed backups", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "Other" })).ok).toBe(false);
    const bad = makeBackup({ ...emptyData(), entries: [e({ amountMinor: 1.5 })] });
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
    const wrongCat = makeBackup({ ...emptyData(), entries: [e({ type: "expense" })] });
    expect(parseBackup(JSON.stringify(wrongCat)).ok).toBe(false);
  });
  it("round-trips and merges skipping duplicates", () => {
    const a = e({}), b = e({});
    const r = parseBackup(JSON.stringify(makeBackup({ ...emptyData(), entries: [a, b] })));
    expect(r.ok).toBe(true);
    const cur = { ...emptyData(), entries: [a, { ...b, amountMinor: 1 }] };
    const { data, summary } = applyImport(cur, r.ok ? r.data : emptyData(), "merge");
    expect(summary).toEqual({ added: 0, skippedDuplicates: 1, conflicts: 1 });
    expect(data.entries).toHaveLength(2);
  });
});

describe("session", () => {
  it("detects a changed ledger in another tab before overwriting it", () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } } as unknown as Storage;
    const first = new LedgerSession(new LocalStorageRepository(storage));
    const second = new LedgerSession(new LocalStorageRepository(storage));
    expect(first.addEntry(e({})).ok).toBe(true);
    expect(second.addEntry(e({})).ok).toBe(false);
    expect(JSON.parse(raw!).entries).toHaveLength(1);
  });
  it("demo never touches real records", () => {
    const real = e({});
    const repo = new MemoryRepository({ ...emptyData(), entries: [real] });
    const s = new LedgerSession(repo);
    s.enterDemo("2026-03");
    expect(s.getSnapshot().mode).toBe("demo");
    s.addEntry(e({}));
    s.deleteEntry(real.id);
    expect(repo.saves).toBe(0);
    s.exitDemo();
    expect(s.getSnapshot().data.entries).toEqual([real]);
  });
  it("failed writes keep previous state", () => {
    const repo = new MemoryRepository();
    const s = new LedgerSession(repo);
    repo.failNext = true;
    const r = s.addEntry(e({}));
    expect(r.ok).toBe(false);
    expect(s.getSnapshot().data.entries).toHaveLength(0);
  });
});

