import "server-only";
import { headers } from "next/headers";
import type { Viewer } from "./auth";
import { createAdminClient } from "./supabase/admin";
import { loadPublishedSiteContent } from "./site-content-server";
import { LEGAL_TEMPLATES } from "./legal-templates";

/**
 * Online contract record: when an owner ticks "I agree" and submits an order, keep who agreed, when,
 * from where, to what exact text, and for which plan. Kept by the server only (see migration 0011).
 * A failure here is logged but does not block the order, so a missing migration never stops sales.
 */
export async function recordAgreement(
  me: Viewer,
  order: { method: "card" | "bank_transfer"; period: string; seats: number; amount: number },
) {
  try {
    const legal = (await loadPublishedSiteContent()).legal;
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
    const { error } = await createAdminClient().from("agreements").insert({
      org_id: me.org.id,
      user_id: me.id,
      org_name: me.org.name,
      email: me.email,
      method: order.method,
      period: order.period,
      seats: order.seats,
      amount_jpy: order.amount,
      terms_text: legal.terms.trim() || LEGAL_TEMPLATES.terms,
      contract_text: legal.contract.trim() || LEGAL_TEMPLATES.contract,
      ip: ip.slice(0, 100),
      user_agent: (h.get("user-agent") ?? "").slice(0, 500),
    });
    if (error) console.error("recordAgreement", error.message);
  } catch (e) {
    console.error("recordAgreement", e);
  }
}
