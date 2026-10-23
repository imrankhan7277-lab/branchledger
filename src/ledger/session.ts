import { applyImport, type ImportSummary } from "./backup";
import { makeDemoData } from "./demo";
import type { LedgerRepository } from "./repository";
import type { Entry, LedgerData, Settings } from "./types";

export interface Snapshot {
  mode: "real" | "demo";
  data: LedgerData;
  loadError?: string;
  storageLabel: string;
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

/** Framework-free state holder. Demo data lives only in memory and never reaches the repository. */
export class LedgerSession {
  private real: LedgerData;
  private demo: LedgerData | null = null;
  private loadError?: string;
  private listeners = new Set<() => void>();
  private snap!: Snapshot;

  constructor(private repo: LedgerRepository) {
    const r = repo.load();
    this.real = r.data;
    this.loadError = r.error;
    this.refresh();
  }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;

  private refresh() {
    this.snap = {
      mode: this.demo ? "demo" : "real",
      data: this.demo ?? this.real,
      loadError: this.loadError,
      storageLabel: this.demo ? "Demo data • temporary, not saved" : this.repo.label,
    };
    this.listeners.forEach((l) => l());
  }

  private commit(next: LedgerData): Result {
    if (this.demo) { this.demo = next; this.refresh(); return { ok: true, value: undefined }; }
    try {
      this.repo.save(next);
    } catch (e) {
      return { ok: false, error: `Could not save on this device (${e instanceof Error ? e.message : "storage error"}). Your change was not applied.` };
    }
    this.real = next;
    this.loadError = undefined;
    this.refresh();
    return { ok: true, value: undefined };
  }

  private get cur() { return this.demo ?? this.real; }

  addEntry(e: Entry) { return this.commit({ ...this.cur, entries: [...this.cur.entries, e] }); }
  updateEntry(e: Entry) { return this.commit({ ...this.cur, entries: this.cur.entries.map((x) => (x.id === e.id ? e : x)) }); }
  deleteEntry(id: string) { return this.commit({ ...this.cur, entries: this.cur.entries.filter((x) => x.id !== id) }); }
  updateSettings(s: Settings) { return this.commit({ ...this.cur, settings: s }); }

  importData(incoming: LedgerData, mode: "merge" | "replace"): Result<ImportSummary> {
    if (this.demo) return { ok: false, error: "Exit demo before restoring a backup." };
    const { data, summary } = applyImport(this.real, incoming, mode);
    const r = this.commit(data); // single atomic write
    return r.ok ? { ok: true, value: summary } : r;
  }

  realData() { return this.real; }
  enterDemo(month: string) { this.demo = makeDemoData(month); this.refresh(); }
  exitDemo() { this.demo = null; this.refresh(); }
}

