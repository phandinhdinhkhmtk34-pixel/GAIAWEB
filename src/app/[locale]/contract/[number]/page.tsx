import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContractDocument, type ContractRow } from "@/components/contract-document";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "サービス利用契約書", robots: { index: false } };



/**
 * サービス利用契約書: the customer's own contract, generated from what they agreed to at checkout.
 * Always in Japanese (the governing language). Viewable by the organization's manager and by admins.
 */
export default async function ContractPage({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  if (!isSupabaseConfigured) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login`);
  const t = await getTranslations("billing");

  const db = createAdminClient();
  const { data } = await db.from("agreements").select("*").eq("contract_no", number).maybeSingle();
  const a = data as ContractRow | null;
  if (!a) notFound();
  const isAdmin = Boolean(viewer.adminRole) && viewer.aal === "aal2";
  const isOwner = viewer.memberRole === "owner" && a.org_id === viewer.org.id;
  if (!isOwner && !isAdmin) notFound();

  // The plan this contract started: linked directly (bank transfer) or the first one after agreeing (card).
  const subQuery = db.from("subscriptions").select("status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id");
  const [{ data: sub }, { data: issuer }] = await Promise.all([
    a.subscription_id
      ? subQuery.eq("id", a.subscription_id).maybeSingle()
      : subQuery
          .eq("org_id", a.org_id ?? "")
          .gte("created_at", new Date(new Date(a.agreed_at).getTime() - 60_000).toISOString())
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
    db.from("billing_settings").select("issuer_name, issuer_address, issuer_phone, invoice_reg_no").eq("id", 1).maybeSingle(),
  ]);

  return (
    <ContractDocument
      a={a}
      sub={sub}
      issuer={issuer}
      backHref={isOwner ? "/dashboard" : "/admin"}
      backLabel={t("back")}
      printLabel={t("printPdf")}
    />
  );
}
