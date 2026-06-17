export interface Person {
  id: string;
  name: string;
}

export interface Currency {
  code: string;        // e.g. "USD", "EUR"
  rateToHKD: number;   // 1 unit of this currency = ? HKD
}

export interface SpendingLog {
  id: string;
  item: string;
  amount: number;
  currency: string;    // currency code
  paidBy: string;      // person id
  channel: string;     // payment channel (free text)
  involved: string[];  // list of person ids (if empty, treat as "all")
  shares?: Record<string, number>;  // personId -> amount (only for custom split)
}

// For CSV import/export
export interface LogCSVRow {
  item: string;
  amount: string;
  currency: string;
  paidBy: string;
  channel: string;
  involved: string;    // comma‑separated ids or "all"
}

export interface Settlement {
  from: string;   // person id who pays
  to: string;     // person id who receives
  amount: number; // in HKD
}