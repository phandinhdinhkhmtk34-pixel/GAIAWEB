import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";

/* All amounts are JPY, consumption tax included (税込). JPY has no minor unit, so Stripe amounts are yen. */

export type Period = "monthly" | "annual";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}
export const cardPaymentsEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

export interface Prices {
  base: number; // per period, includes `included` accounts
  seat: number; // per extra account per period
  included: number;
}

/** Prices from the pricing_plans table (editable in Admin), with the confirmed defaults as fallback. */
export async function loadPrices(): Promise<Record<Period, Prices>> {
  const db = createAdminClient();
  const { data } = await db.from("pricing_plans").select("period, base_price_jpy, seat_price_jpy, included_seats");
  const row = (p: Period) => data?.find((r) => r.period === p);
  const make = (p: Period, base: number, seat: number): Prices => ({
    base: row(p)?.base_price_jpy ?? base,
    seat: row(p)?.seat_price_jpy ?? seat,
    included: row(p)?.included_seats ?? 1,
  });
  return { monthly: make("monthly", 30000, 3000), annual: make("annual", 300000, 30000) };
}

export function planAmount(p: Prices, seats: number) {
  return p.base + Math.max(0, seats - p.included) * p.seat;
}

/** Extra seats bought mid-period by bank transfer pay only for the time left in the period. */
export function proratedSeatAmount(p: Prices, added: number, start: Date, end: Date, now = new Date()) {
  const total = end.getTime() - start.getTime();
  const left = Math.max(0, end.getTime() - now.getTime());
  const share = total > 0 ? left / total : 1;
  return Math.max(1, Math.round(p.seat * added * share));
}

/** One month or year later, clamped to the month's last day (Jan 31 → Feb 28/29, not Mar 3). */
export function addPeriod(from: Date, period: Period) {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  if (period === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

export function newOrderCode() {
  // 6 characters, no 0/O/1/I so it can be typed into a bank transfer name without mistakes.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "GL" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export interface CurrentSub {
  id: string;
  period: Period;
  seats: number;
  status: "active" | "cancelled" | "pending_payment";
  start: string | null;
  end: string | null;
  stripeId: string | null;
  cancelAtPeriodEnd: boolean;
}

/** The organization's live (or awaiting-payment) subscription, if any. */
export async function currentSubscription(orgId: string): Promise<CurrentSub | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("subscriptions")
    .select("id, period, seats, status, current_period_start, current_period_end, stripe_subscription_id, cancel_at_period_end, created_at")
    .eq("org_id", orgId)
    .in("status", ["active", "cancelled", "pending_payment"])
    .order("created_at", { ascending: false });
  const now = Date.now();
  const live = (data ?? []).find(
    (s) => s.status === "pending_payment" || (s.current_period_end && new Date(s.current_period_end).getTime() > now),
  );
  if (!live) return null;
  return {
    id: live.id,
    period: live.period,
    seats: live.seats,
    status: live.status,
    start: live.current_period_start,
    end: live.current_period_end,
    stripeId: live.stripe_subscription_id,
    cancelAtPeriodEnd: live.cancel_at_period_end,
  };
}

/** Keep the seat limit at the purchased number, but never below the people already using seats. */
async function setSeatLimit(orgId: string, seats: number) {
  const db = createAdminClient();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  await db.from("organizations").update({ seat_limit: Math.max(seats, count ?? 1, 1) }).eq("id", orgId);
}

async function issueReceiptNumber(): Promise<string> {
  const { data } = await createAdminClient().rpc("next_receipt_number");
  return String(data);
}

/* ------------------------------------------------------------------ Stripe */

function stripeStatus(s: Stripe.Subscription): "active" | "cancelled" | "pending_payment" | "expired" {
  if (s.status === "active" || s.status === "trialing") return s.cancel_at_period_end ? "cancelled" : "active";
  if (s.status === "past_due" || s.status === "incomplete") return "pending_payment";
  return "expired";
}

/** Bring our subscriptions row in line with Stripe (called from every subscription-related webhook). */
export async function syncStripeSubscription(stripe: Stripe, stripeSubId: string) {
  const s = await stripe.subscriptions.retrieve(stripeSubId);
  const orgId = s.metadata?.org_id;
  if (!orgId) return;
  const db = createAdminClient();
  const items = s.items.data;
  // Checkout creates the base plan as the first item; every other item is extra accounts.
  const base = items.find((i) => i.metadata?.role === "base") ?? items[0];
  const extra = items.filter((i) => i.id !== base?.id).reduce((n, i) => n + (i.quantity ?? 0), 0);
  const seats = 1 + extra;
  const period: Period = base?.price?.recurring?.interval === "year" ? "annual" : "monthly";
  const row = {
    org_id: orgId,
    period,
    seats,
    status: stripeStatus(s),
    current_period_start: base ? new Date(base.current_period_start * 1000).toISOString() : null,
    current_period_end: base ? new Date(base.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: s.cancel_at_period_end,
    stripe_subscription_id: s.id,
  };
  const { data: existing } = await db.from("subscriptions").select("id").eq("stripe_subscription_id", s.id).maybeSingle();
  if (existing) await db.from("subscriptions").update(row).eq("id", existing.id);
  else {
    // One live plan per organization: close older ones (e.g. a manual or bank plan) when a card plan starts.
    await db.from("subscriptions").update({ status: "expired", current_period_end: new Date().toISOString() })
      .eq("org_id", orgId).in("status", ["active", "cancelled", "pending_payment"]).is("stripe_subscription_id", null);
    await db.from("subscriptions").insert(row);
  }
  if (row.status !== "expired") await setSeatLimit(orgId, seats);
  if (typeof s.customer === "string") await db.from("organizations").update({ stripe_customer_id: s.customer }).eq("id", orgId);
}

/** A paid Stripe invoice becomes a verified payment with a receipt number (idempotent per invoice). */
export async function recordStripeInvoice(stripe: Stripe, invoice: Stripe.Invoice) {
  const subId = invoice.parent?.subscription_details?.subscription;
  const stripeSubId = typeof subId === "string" ? subId : subId?.id;
  if (!stripeSubId || !invoice.id || invoice.amount_paid <= 0) return;
  const db = createAdminClient();
  const { data: dup } = await db.from("payments").select("id").eq("stripe_invoice_id", invoice.id).maybeSingle();
  if (dup) return;
  await syncStripeSubscription(stripe, stripeSubId);
  const { data: sub } = await db.from("subscriptions").select("id, period, seats").eq("stripe_subscription_id", stripeSubId).maybeSingle();
  if (!sub) return;
  const kind = invoice.billing_reason === "subscription_create" ? "plan" : invoice.billing_reason === "subscription_cycle" ? "renew" : "seats";
  await db.from("payments").insert({
    subscription_id: sub.id,
    order_code: newOrderCode(),
    method: "card",
    amount_jpy: invoice.amount_paid,
    status: "verified",
    verified_at: new Date().toISOString(),
    receipt_number: await issueReceiptNumber(),
    kind,
    period: sub.period,
    seats: sub.seats,
    stripe_invoice_id: invoice.id,
  });
}

/* ------------------------------------------------------------ bank transfer */

/** Confirming a bank transfer applies what it paid for and issues the receipt. */
export async function applyVerifiedBankPayment(paymentId: string, adminId: string) {
  const db = createAdminClient();
  const { data: pay } = await db
    .from("payments")
    .select("id, status, kind, period, seats, subscription_id, method")
    .eq("id", paymentId)
    .maybeSingle();
  if (!pay || pay.status !== "awaiting" || pay.method !== "bank_transfer") return { error: "notPending" as const };
  const { data: sub } = await db
    .from("subscriptions")
    .select("id, org_id, period, seats, current_period_start, current_period_end")
    .eq("id", pay.subscription_id)
    .maybeSingle();
  if (!sub) return { error: "generic" as const };
  const now = new Date();
  const period = (pay.period ?? sub.period) as Period;

  if (pay.kind === "plan") {
    await db.from("subscriptions").update({
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: addPeriod(now, period).toISOString(),
      cancel_at_period_end: false,
    }).eq("id", sub.id);
    await setSeatLimit(sub.org_id, sub.seats);
  } else if (pay.kind === "renew") {
    const from = sub.current_period_end && new Date(sub.current_period_end) > now ? new Date(sub.current_period_end) : now;
    await db.from("subscriptions").update({
      status: "active",
      current_period_end: addPeriod(from, period).toISOString(),
      cancel_at_period_end: false,
    }).eq("id", sub.id);
  } else {
    const seats = sub.seats + (pay.seats ?? 0);
    await db.from("subscriptions").update({ seats }).eq("id", sub.id);
    await setSeatLimit(sub.org_id, seats);
  }
  await db.from("payments").update({
    status: "verified",
    verified_by: adminId,
    verified_at: now.toISOString(),
    receipt_number: await issueReceiptNumber(),
  }).eq("id", pay.id);
  return { ok: true as const };
}
