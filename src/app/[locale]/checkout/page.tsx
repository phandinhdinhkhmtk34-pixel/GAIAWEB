import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutView, type BankInfo, type CheckoutData } from "@/components/checkout-view";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { cardPaymentsEnabled, currentSubscription, loadPrices } from "@/lib/billing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "billing" }))("title") };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; plan?: string; seats?: string; order?: string }>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("billing");
  if (!isSupabaseConfigured) redirect(`/${locale}#pricing`);
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/checkout`);

  let body: React.ReactNode;
  if (viewer.memberRole !== "owner") {
    body = <p className="rounded-2xl border border-navy-900/10 bg-white p-6 text-navy-900/75">{t("ownerOnly")}</p>;
  } else {
    const db = createAdminClient();
    const [prices, sub, { data: settings }, { count: people }, { data: orgSubs }] = await Promise.all([
      loadPrices(),
      currentSubscription(viewer.org.id),
      db.from("billing_settings").select("bank_name, branch_name, account_type, account_number, account_holder_kana, transfer_note").eq("id", 1).maybeSingle(),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
      db.from("subscriptions").select("id").eq("org_id", viewer.org.id),
    ]);
    const subIds = (orgSubs ?? []).map((s) => s.id);
    const { data: pays } = subIds.length
      ? await db
          .from("payments")
          .select("order_code, amount_jpy, kind, seats, period, status, created_at, method")
          .in("subscription_id", subIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] as never[] };
    const orderRow = q.order ? (pays ?? []).find((p) => p.order_code === q.order && p.method === "bank_transfer") : undefined;
    const period = (q.period ?? q.plan) === "annual" ? "annual" : "monthly";
    const data: CheckoutData = {
      orgKind: viewer.org.kind,
      orgName: viewer.org.name,
      prices,
      cardEnabled: cardPaymentsEnabled,
      bank: (settings as BankInfo | null) ?? { bank_name: "", branch_name: "", account_type: "", account_number: "", account_holder_kana: "", transfer_note: "" },
      people: people ?? 1,
      sub: sub
        ? { period: sub.period, seats: sub.seats, status: sub.status, end: sub.end, card: Boolean(sub.stripeId), cancelAtPeriodEnd: sub.cancelAtPeriodEnd }
        : null,
      order: orderRow
        ? {
            code: orderRow.order_code,
            amount: orderRow.amount_jpy,
            kind: orderRow.kind as "plan" | "renew" | "seats",
            seats: orderRow.seats,
            period: orderRow.period,
            status: orderRow.status,
            created: orderRow.created_at,
          }
        : null,
      pendingOrders: (pays ?? [])
        .filter((p) => p.status === "awaiting" && p.method === "bank_transfer")
        .map((p) => ({ code: p.order_code, amount: p.amount_jpy, kind: p.kind })),
      initial: { period, seats: Math.min(500, Math.max(1, Number.parseInt(q.seats ?? "1", 10) || 1)) },
    };
    body = <CheckoutView data={data} />;
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <h1 className="mb-8 font-serif text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        {body}
      </main>
      <SiteFooter />
    </>
  );
}
