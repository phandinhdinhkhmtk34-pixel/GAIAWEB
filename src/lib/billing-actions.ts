"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { getViewer } from "./auth";
import { createAdminClient } from "./supabase/admin";
import { siteUrl } from "./supabase/config";
import { ADMIN_NOTIFY, sendEmail } from "./email";
import {
  currentSubscription,
  getStripe,
  loadPrices,
  newOrderCode,
  planAmount,
  proratedSeatAmount,
  applyVerifiedBankPayment,
  type Period,
} from "./billing";

export type BillingState = { error?: string; ok?: string } | undefined;

function localeOf(fd: FormData) {
  const l = String(fd.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}
const periodOf = (fd: FormData): Period => (fd.get("period") === "annual" ? "annual" : "monthly");
const intIn = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** Only the organization's manager buys or changes the plan. */
async function requireOwner() {
  const v = await getViewer();
  if (!v || v.memberRole !== "owner") return null;
  return v;
}

/* ----------------------------------------------------------- new plan: card */

export async function startCardCheckoutAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireOwner();
  if (!me) return { error: "notOwner" };
  const stripe = getStripe();
  if (!stripe) return { error: "cardDisabled" };
  const locale = localeOf(fd);
  const period = periodOf(fd);
  const seats = me.org.kind === "individual" ? 1 : intIn(fd.get("seats"), 1, 500);
  if (!seats) return { error: "seatsInvalid" };
  const existing = await currentSubscription(me.org.id);
  if (existing && existing.status !== "pending_payment") return { error: "alreadyActive" };

  const p = (await loadPrices())[period];
  const interval = period === "annual" ? "year" : "month";
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("stripe_customer_id, name").eq("id", me.org.id).maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    locale: locale === "ja" ? "ja" : locale === "vi" ? "vi" : locale === "id" ? "id" : "en",
    client_reference_id: me.org.id,
    ...(org?.stripe_customer_id ? { customer: org.stripe_customer_id } : { customer_email: me.email }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: p.base,
          recurring: { interval },
          product_data: { name: "GAIA LEARNING 基本プラン（1アカウント込み・税込）" },
        },
      },
      ...(seats > p.included
        ? [
            {
              quantity: seats - p.included,
              price_data: {
                currency: "jpy" as const,
                unit_amount: p.seat,
                recurring: { interval: interval as "month" | "year" },
                product_data: { name: "GAIA LEARNING 追加アカウント（税込）" },
              },
            },
          ]
        : []),
    ],
    subscription_data: { metadata: { org_id: me.org.id, org_name: org?.name ?? "" } },
    metadata: { org_id: me.org.id },
    success_url: `${siteUrl()}/${locale}/dashboard?checkout=success`,
    cancel_url: `${siteUrl()}/${locale}/checkout?period=${period}&seats=${seats}`,
  });
  if (!session.url) return { error: "generic" };
  redirect(session.url);
}

/* ---------------------------------------------- bank transfer: new / renew */

export async function createBankOrderAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireOwner();
  if (!me) return { error: "notOwner" };
  const locale = localeOf(fd);
  const mode = String(fd.get("mode") ?? "new");
  const db = createAdminClient();
  const prices = await loadPrices();
  const existing = await currentSubscription(me.org.id);
  const code = newOrderCode();

  if (mode === "new") {
    if (existing && existing.status !== "pending_payment") return { error: "alreadyActive" };
    const period = periodOf(fd);
    const seats = me.org.kind === "individual" ? 1 : intIn(fd.get("seats"), 1, 500);
    if (!seats) return { error: "seatsInvalid" };
    // Replace any earlier unpaid order so there is only one to pay.
    if (existing?.status === "pending_payment") {
      await db.from("payments").update({ status: "rejected", note: "replaced" }).eq("subscription_id", existing.id).eq("status", "awaiting");
      await db.from("subscriptions").update({ status: "expired" }).eq("id", existing.id);
    }
    const { data: sub, error } = await db
      .from("subscriptions")
      .insert({ org_id: me.org.id, period, seats, status: "pending_payment" })
      .select("id")
      .single();
    if (error || !sub) return { error: "generic" };
    await db.from("payments").insert({
      subscription_id: sub.id,
      order_code: code,
      method: "bank_transfer",
      amount_jpy: planAmount(prices[period], seats),
      status: "awaiting",
      kind: "plan",
      period,
      seats,
    });
  } else if (mode === "renew") {
    if (!existing || existing.stripeId || existing.status === "pending_payment") return { error: "generic" };
    await db.from("payments").insert({
      subscription_id: existing.id,
      order_code: code,
      method: "bank_transfer",
      amount_jpy: planAmount(prices[existing.period], existing.seats),
      status: "awaiting",
      kind: "renew",
      period: existing.period,
      seats: existing.seats,
    });
  } else if (mode === "seats") {
    const added = intIn(fd.get("added"), 1, 500);
    if (!added) return { error: "seatsInvalid" };
    if (!existing || existing.stripeId || existing.status === "pending_payment" || !existing.start || !existing.end) return { error: "generic" };
    await db.from("payments").insert({
      subscription_id: existing.id,
      order_code: code,
      method: "bank_transfer",
      amount_jpy: proratedSeatAmount(prices[existing.period], added, new Date(existing.start), new Date(existing.end)),
      status: "awaiting",
      kind: "seats",
      period: existing.period,
      seats: added,
    });
  } else return { error: "generic" };

  await db.from("audit_log").insert({ actor_id: me.id, action: "bank_order", target: code, details: { mode } });
  if (ADMIN_NOTIFY) {
    const { data: pay } = await db.from("payments").select("amount_jpy").eq("order_code", code).maybeSingle();
    await sendEmail(ADMIN_NOTIFY, `【GAIA】振込注文 ${code}`, [`${me.org.name} から振込注文がありました。`, `注文番号: ${code}`, `金額: ¥${(pay?.amount_jpy ?? 0).toLocaleString("ja-JP")}`], {
      href: `${siteUrl()}/ja/admin`,
      label: "入金確認を開く",
    });
  }
  redirect(`/${locale}/checkout?order=${code}`);
}

export async function cancelBankOrderAction(fd: FormData) {
  const me = await requireOwner();
  if (!me) return;
  const code = String(fd.get("code") ?? "");
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("id, subscription_id, kind, status").eq("order_code", code).maybeSingle();
  if (!pay || pay.status !== "awaiting") return;
  const { data: sub } = await db.from("subscriptions").select("org_id").eq("id", pay.subscription_id).maybeSingle();
  if (sub?.org_id !== me.org.id) return;
  await db.from("payments").update({ status: "rejected", note: "cancelled by customer" }).eq("id", pay.id);
  if (pay.kind === "plan") await db.from("subscriptions").update({ status: "expired" }).eq("id", pay.subscription_id);
  revalidatePath(`/${localeOf(fd)}/dashboard`);
  redirect(`/${localeOf(fd)}/dashboard`);
}

/* ------------------------------------------------------ seats on a card plan */

export async function addSeatsCardAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireOwner();
  if (!me) return { error: "notOwner" };
  const stripe = getStripe();
  if (!stripe) return { error: "cardDisabled" };
  const added = intIn(fd.get("added"), 1, 500);
  if (!added) return { error: "seatsInvalid" };
  const existing = await currentSubscription(me.org.id);
  if (!existing?.stripeId) return { error: "generic" };

  const s = await stripe.subscriptions.retrieve(existing.stripeId);
  const p = (await loadPrices())[existing.period];
  const baseItem = s.items.data.find((i) => i.metadata?.role === "base") ?? s.items.data[0];
  const seatItem = s.items.data.find((i) => i.id !== baseItem.id);
  const interval = existing.period === "annual" ? "year" : "month";
  // Tag items so seat counts never depend on price amounts (which Admin may change later).
  const items: { id?: string; quantity?: number; metadata?: Record<string, string>; price_data?: { currency: string; unit_amount: number; recurring: { interval: "month" | "year" }; product: string } }[] = [
    { id: baseItem.id, metadata: { role: "base" } },
  ];
  if (seatItem) items.push({ id: seatItem.id, quantity: (seatItem.quantity ?? 0) + added, metadata: { role: "seat" } });
  else {
    const productId = typeof baseItem.price.product === "string" ? baseItem.price.product : baseItem.price.product.id;
    items.push({ quantity: added, metadata: { role: "seat" }, price_data: { currency: "jpy", unit_amount: p.seat, recurring: { interval }, product: productId } });
  }
  // Charge the prorated difference now, on the saved card; the invoice.paid webhook records it.
  await stripe.subscriptions.update(existing.stripeId, { items, proration_behavior: "always_invoice", payment_behavior: "error_if_incomplete" });
  await createAdminClient().from("audit_log").insert({ actor_id: me.id, action: "add_seats_card", target: String(added) });
  revalidatePath(`/${localeOf(fd)}/dashboard`);
  return { ok: "seatsAdded" };
}

/* ------------------------------------------------------------ auto-renewal */

export async function setAutoRenewAction(fd: FormData) {
  const me = await requireOwner();
  if (!me) return;
  const on = fd.get("on") === "1";
  const existing = await currentSubscription(me.org.id);
  if (!existing || existing.status === "pending_payment") return;
  if (existing.stripeId) {
    const stripe = getStripe();
    if (!stripe) return;
    await stripe.subscriptions.update(existing.stripeId, { cancel_at_period_end: !on }); // webhook syncs our row
  } else {
    await createAdminClient()
      .from("subscriptions")
      .update({ cancel_at_period_end: !on, status: on ? "active" : "cancelled" })
      .eq("id", existing.id);
  }
  await createAdminClient().from("audit_log").insert({ actor_id: me.id, action: on ? "resume_plan" : "cancel_plan", target: me.org.name });
  revalidatePath(`/${localeOf(fd)}/dashboard`);
}

/* --------------------------------------------------------------- admin side */

async function requireBillingAdmin() {
  const v = await getViewer();
  if (!v || (v.adminRole !== "super" && v.adminRole !== "accounting") || v.aal !== "aal2") return null;
  return v;
}

export async function confirmBankPaymentAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireBillingAdmin();
  if (!me) return { error: "forbidden" };
  const id = String(fd.get("paymentId") ?? "");
  const res = await applyVerifiedBankPayment(id, me.id);
  if ("error" in res) return { error: res.error };
  // Tell the paying organization's manager, with a link to the receipt.
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("receipt_number, amount_jpy, subscription_id").eq("id", id).maybeSingle();
  const { data: sub } = pay ? await db.from("subscriptions").select("org_id").eq("id", pay.subscription_id).maybeSingle() : { data: null };
  const { data: owner } = sub ? await db.from("profiles").select("email, locale").eq("org_id", sub.org_id).eq("member_role", "owner").maybeSingle() : { data: null };
  if (owner?.email && pay?.receipt_number) {
    await sendEmail(owner.email, "【GAIA LEARNING】ご入金を確認しました", [
      "ご入金を確認しました。すべての研修動画をご利用いただけます。",
      `金額: ¥${pay.amount_jpy.toLocaleString("ja-JP")}（税込）`,
      `領収書番号: ${pay.receipt_number}`,
    ], { href: `${siteUrl()}/${owner.locale || "ja"}/receipt/${pay.receipt_number}`, label: "領収書を表示" });
  }
  await createAdminClient().from("audit_log").insert({ actor_id: me.id, action: "confirm_transfer", target: String(fd.get("code") ?? id) });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: "confirmed" };
}

export async function rejectBankPaymentAction(fd: FormData) {
  const me = await requireBillingAdmin();
  if (!me) return;
  const id = String(fd.get("paymentId") ?? "");
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("subscription_id, kind, status, order_code").eq("id", id).maybeSingle();
  if (!pay || pay.status !== "awaiting") return;
  await db.from("payments").update({ status: "rejected", verified_by: me.id, note: "rejected by admin" }).eq("id", id);
  if (pay.kind === "plan") await db.from("subscriptions").update({ status: "expired" }).eq("id", pay.subscription_id);
  await db.from("audit_log").insert({ actor_id: me.id, action: "reject_transfer", target: pay.order_code });
  revalidatePath(`/${localeOf(fd)}/admin`);
}

const SETTINGS_FIELDS = [
  "bank_name",
  "branch_name",
  "account_type",
  "account_number",
  "account_holder_kana",
  "issuer_name",
  "issuer_address",
  "issuer_phone",
  "invoice_reg_no",
  "transfer_note",
] as const;

export async function saveBillingSettingsAction(_: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireBillingAdmin();
  if (!me) return { error: "forbidden" };
  const row: Record<string, string> = {};
  for (const f of SETTINGS_FIELDS) row[f] = String(fd.get(f) ?? "").trim().slice(0, 300);
  if (row.invoice_reg_no && !/^T\d{13}$/.test(row.invoice_reg_no)) return { error: "invoiceRegNo" };
  const db = createAdminClient();
  const { error } = await db.from("billing_settings").update({ ...row, updated_at: new Date().toISOString(), updated_by: me.id }).eq("id", 1);
  if (error) return { error: "generic" };
  await db.from("audit_log").insert({ actor_id: me.id, action: "billing_settings", target: "billing_settings" });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: "settingsSaved" };
}
