import { parseBackup, makeBackup } from "./backup";
import { emptyData, type LedgerData } from "./types";

/** Replaceable persistence adapter. Swap for a synced backend later. */
export interface LedgerRepository {
  readonly label: string; // shown to user, e.g. "Saved on this device • not synced"
  load(): { data: LedgerData; error?: string };
  /** Must throw on failure so callers keep the previous state. */
  save(data: LedgerData): void;
}

export const STORAGE_KEY = "branchledger:v1:real";

export class LocalStorageRepository implements LedgerRepository {
  readonly label = "Saved on this device • not synced";
  private lastRead: string | null = null;
  constructor(private storage: Storage, private key = STORAGE_KEY) {}
  load() {
    let raw: string | null;
    try { raw = this.storage.getItem(this.key); } catch { return { data: emptyData(), error: "Browser storage is unavailable" }; }
    this.lastRead = raw;
    if (!raw) return { data: emptyData() };
    const r = parseBackup(raw);
    if (!r.ok) return { data: emptyData(), error: "Stored data could not be read: " + r.errors[0] };
    return { data: r.data };
  }
  save(data: LedgerData) {
    if (this.storage.getItem(this.key) !== this.lastRead) {
      throw new Error("Records changed in another tab. Reload this page before saving");
    }
    const raw = JSON.stringify(makeBackup(data));
    this.storage.setItem(this.key, raw);
    this.lastRead = raw;
  }
}

export class MemoryRepository implements LedgerRepository {
  readonly label = "In memory only";
  saves = 0;
  failNext = false;
  constructor(public data: LedgerData = emptyData()) {}
  load() { return { data: structuredClone(this.data) }; }
  save(data: LedgerData) {
    if (this.failNext) { this.failNext = false; throw new Error("Quota exceeded"); }
    this.saves++;
    this.data = structuredClone(data);
  }
}

