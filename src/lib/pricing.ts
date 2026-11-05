/**
 * Pricing rules confirmed with the client (all prices JPY, tax included / 税込).
 * - One base subscription includes 1 account (individual and company pay the same).
 * - Each extra account adds a per-seat fee.
 * - Annual billing = 10 months of the monthly price (2 months free), for base and seats.
 * In production these values come from the `pricing_plans` table, editable in Admin.
 */
export type Billing = "monthly" | "annual";

export interface PriceConfig {
  baseMonthly: number;
  seatMonthly: number;
  annualMonths: number;
}

export const DEFAULT_PRICES: PriceConfig = {
  baseMonthly: 30000,
  seatMonthly: 3000,
  annualMonths: 10,
};

export function quote(users: number, billing: Billing, cfg: PriceConfig = DEFAULT_PRICES) {
  const seats = Math.max(1, Math.floor(users));
  const extra = seats - 1;
  const factor = billing === "annual" ? cfg.annualMonths : 1;
  const base = cfg.baseMonthly * factor;
  const seat = cfg.seatMonthly * factor;
  return { seats, extra, base, seat, total: base + extra * seat };
}
