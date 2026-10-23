export type BranchId = "b1" | "b2";
export type BranchFilter = BranchId | "all";
export type EntryType = "sale" | "expense";
/** How a category flows into the P&L statement. */
export type CategoryClass = "sales" | "cost_of_sales" | "operating" | "excluded";

export interface Entry {
  id: string;
  date: string; // ISO local date YYYY-MM-DD
  branchId: BranchId;
  type: EntryType;
  category: string;
  amountMinor: number; // integer minor units (e.g. paise)
  paymentMethod: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  branches: Record<BranchId, string>;
  currency: string;
}

export interface LedgerData {
  settings: Settings;
  entries: Entry[];
}

export const BRANCH_IDS: BranchId[] = ["b1", "b2"];

export const CATEGORIES: { name: string; type: EntryType; cls: CategoryClass }[] = [
  { name: "Product sales", type: "sale", cls: "sales" },
  { name: "Service sales", type: "sale", cls: "sales" },
  { name: "Other sales", type: "sale", cls: "sales" },
  { name: "Cost of goods sold", type: "expense", cls: "cost_of_sales" },
  { name: "Direct materials", type: "expense", cls: "cost_of_sales" },
  { name: "Direct labour", type: "expense", cls: "cost_of_sales" },
  { name: "Rent", type: "expense", cls: "operating" },
  { name: "Salaries", type: "expense", cls: "operating" },
  { name: "Utilities", type: "expense", cls: "operating" },
  { name: "Marketing", type: "expense", cls: "operating" },
  { name: "Maintenance", type: "expense", cls: "operating" },
  { name: "Supplies", type: "expense", cls: "operating" },
  { name: "Other operating", type: "expense", cls: "operating" },
  { name: "Owner withdrawal", type: "expense", cls: "excluded" },
  { name: "Transfer between branches", type: "expense", cls: "excluded" },
];

export const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank transfer", "Cheque", "Other"];

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];

export function categoryClass(category: string): CategoryClass | null {
  return CATEGORIES.find((c) => c.name === category)?.cls ?? null;
}

export function categoriesFor(type: EntryType) {
  return CATEGORIES.filter((c) => c.type === type);
}

export function defaultSettings(): Settings {
  return { branches: { b1: "76 Branch", b2: "Extention Branch" }, currency: "INR" };
}

export function emptyData(): LedgerData {
  return { settings: defaultSettings(), entries: [] };
}

