/**
 * Pricing rules confirmed with the client (all prices JPY, tax included / 税込).
 * - One base subscription includes 1 account (individual and company pay the same).
 * - Each extra account adds a per-seat fee.
 * - Annual prices are set separately (default: 10 months of the monthly price, i.e. 2 months free).
 * Admin edits these in サイト編集; publishing also updates the pricing_plans table the server bills from.
 */
export type Billing = "monthly" | "annual";

export interface PriceConfig {
  baseMonthly: number;
  seatMonthly: number;
  baseAnnual: number;
  seatAnnual: number;
}

export const DEFAULT_PRICES: PriceConfig = {
  baseMonthly: 30000,
  seatMonthly: 3000,
  baseAnnual: 300000,
  seatAnnual: 30000,
};

export function quote(users: number, billing: Billing, cfg: PriceConfig = DEFAULT_PRICES) {
  const seats = Math.max(1, Math.floor(users));
  const extra = seats - 1;
  const base = billing === "annual" ? cfg.baseAnnual : cfg.baseMonthly;
  const seat = billing === "annual" ? cfg.seatAnnual : cfg.seatMonthly;
  return { seats, extra, base, seat, total: base + extra * seat };
}
