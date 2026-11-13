import "server-only";
import { headers } from "next/headers";
import type { Viewer } from "./auth";
import { createAdminClient } from "./supabase/admin";
import { loadPublishedSiteContent } from "./site-content-server";
import { LEGAL_TEMPLATES } from "./legal-templates";

/** The contracting party as entered at checkout (prefilled from the account and the last contract). */
export interface ContractParty {
  name: string;
  address: string;
  representative: string;
  contact: string;
}

const clean = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Read the party fields; null when something required is missing. */
export function partyFromForm(fd: FormData, kind: "individual" | "company"): ContractParty | null {
  const p = {
    name: clean(fd.get("partyName"), 120),
    address: clean(fd.get("partyAddress"), 200),
    representative: kind === "company" ? clean(fd.get("partyRep"), 80) : "",
    contact: kind === "company" ? clean(fd.get("partyContact"), 80) : "",
  };
  if (!p.name || !p.address || (kind === "company" && !p.contact)) return null;
  return p;
}

/** Details from the organization's most recent contract, to prefill the next one. */
export async function lastParty(orgId: string): Promise<Partial<ContractParty>> {
  const { data, error } = await createAdminClient()
    .from("agreements")
    .select("customer_name, customer_address, representative, contact_name")
    .eq("org_id", orgId)
    .order("agreed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return {};
  return { name: data.customer_name, address: data.customer_address, representative: data.representative, contact: data.contact_name };
}

/**
 * Online contract: when an owner ticks "I agree" and submits an order, keep who agreed, when, from where,
 * to what exact text, for which plan and as which party. The row is the numbered contract document
 * (/contract/[contract_no]). Server-only table (migrations 0011/0012). A failure is logged but never
 * blocks the order, so a missing migration cannot stop sales.
 */
export async function recordAgreement(
  me: Viewer,
  party: ContractParty,
  order: { method: "card" | "bank_transfer"; period: string; seats: number; amount: number; subscriptionId?: string },
): Promise<string | null> {
  try {
    const legal = (await loadPublishedSiteContent()).legal;
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
    const { data, error } = await createAdminClient()
      .from("agreements")
      .insert({
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
        customer_kind: me.org.kind,
        customer_name: party.name,
        customer_address: party.address,
        representative: party.representative,
        contact_name: party.contact,
        subscription_id: order.subscriptionId ?? null,
      })
      .select("contract_no")
      .single();
    if (error) {
      console.error("recordAgreement", error.message);
      return null;
    }
    return data.contract_no as string;
  } catch (e) {
    console.error("recordAgreement", e);
    return null;
  }
}
