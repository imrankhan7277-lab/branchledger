import { BRANCH_IDS, categoryClass, type Entry, type LedgerData, type Settings } from "./types";

export const BACKUP_APP = "BranchLedger";
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  settings: Settings;
  entries: Entry[];
}

export function makeBackup(data: LedgerData, now = new Date()): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), settings: data.settings, entries: data.entries };
}

const isStr = (v: unknown): v is string => typeof v === "string";

export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateEntry(v: unknown, i: number): { entry?: Entry; error?: string } {
  const p = `Entry ${i + 1}`;
  if (!v || typeof v !== "object") return { error: `${p}: not an object` };
  const e = v as Record<string, unknown>;
  if (!isStr(e.id) || !e.id) return { error: `${p}: missing id` };
  if (!isStr(e.date) || !validDate(e.date)) return { error: `${p}: invalid date` };
  if (!BRANCH_IDS.includes(e.branchId as never)) return { error: `${p}: invalid branch` };
  if (e.type !== "sale" && e.type !== "expense") return { error: `${p}: invalid type` };
  if (!isStr(e.category) || !categoryClass(e.category)) return { error: `${p}: unknown category` };
  const cls = categoryClass(e.category);
  if ((e.type === "sale") !== (cls === "sales")) return { error: `${p}: category does not match type` };
  if (typeof e.amountMinor !== "number" || !Number.isSafeInteger(e.amountMinor) || e.amountMinor <= 0)
    return { error: `${p}: amount must be a positive integer of minor units` };
  return {
    entry: {
      id: e.id, date: e.date, branchId: e.branchId as Entry["branchId"], type: e.type, category: e.category,
      amountMinor: e.amountMinor, paymentMethod: isStr(e.paymentMethod) ? e.paymentMethod : "Other",
      notes: isStr(e.notes) ? e.notes.slice(0, 1000) : "",
      createdAt: isStr(e.createdAt) ? e.createdAt : new Date(0).toISOString(),
      updatedAt: isStr(e.updatedAt) ? e.updatedAt : new Date(0).toISOString(),
    },
  };
}

export function validateSettings(v: unknown): Settings | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const b = s.branches as Record<string, unknown> | undefined;
  if (!b || !isStr(b.b1) || !isStr(b.b2) || !b.b1.trim() || !b.b2.trim()) return null;
  if (s.currency !== "INR") return null;
  return { branches: { b1: b.b1.trim().slice(0, 60), b2: b.b2.trim().slice(0, 60) }, currency: s.currency };
}

export type ParseResult = { ok: true; data: LedgerData } | { ok: false; errors: string[] };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, errors: ["File is not valid JSON"] }; }
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["Backup must be a JSON object"] };
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP) return { ok: false, errors: ["Not a BranchLedger backup"] };
  if (r.version !== BACKUP_VERSION) return { ok: false, errors: [`Unsupported backup version: ${String(r.version)}`] };
  const settings = validateSettings(r.settings);
  const errors: string[] = [];
  if (!settings) errors.push("Settings are missing or invalid");
  if (!Array.isArray(r.entries)) return { ok: false, errors: [...errors, "Entries list is missing"] };
  const entries: Entry[] = [];
  const seen = new Set<string>();
  r.entries.forEach((v, i) => {
    const { entry, error } = validateEntry(v, i);
    if (error) errors.push(error);
    else if (entry) {
      if (seen.has(entry.id)) errors.push(`Entry ${i + 1}: duplicate id inside backup`);
      seen.add(entry.id);
      entries.push(entry);
    }
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, 20) };
  return { ok: true, data: { settings: settings!, entries } };
}

export interface ImportSummary { added: number; skippedDuplicates: number; conflicts: number }

const same = (a: Entry, b: Entry) =>
  a.date === b.date && a.branchId === b.branchId && a.type === b.type && a.category === b.category &&
  a.amountMinor === b.amountMinor && a.paymentMethod === b.paymentMethod && a.notes === b.notes;

/** Pure: compute the next dataset for an import. Merge keeps current settings and skips existing ids. */
export function applyImport(current: LedgerData, incoming: LedgerData, mode: "merge" | "replace"): { data: LedgerData; summary: ImportSummary } {
  if (mode === "replace") return { data: incoming, summary: { added: incoming.entries.length, skippedDuplicates: 0, conflicts: 0 } };
  const byId = new Map(current.entries.map((e) => [e.id, e]));
  const added: Entry[] = [];
  let dup = 0, conflicts = 0;
  for (const e of incoming.entries) {
    const ex = byId.get(e.id);
    if (!ex) added.push(e);
    else if (same(ex, e)) dup++;
    else conflicts++; // existing record kept
  }
  return { data: { settings: current.settings, entries: [...current.entries, ...added] }, summary: { added: added.length, skippedDuplicates: dup, conflicts } };
}

