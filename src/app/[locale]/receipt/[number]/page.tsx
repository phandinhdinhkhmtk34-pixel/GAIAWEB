import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/print-button";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "領収書", robots: { index: false } };

const yen = (n: number) => `¥${new Intl.NumberFormat("ja-JP").format(n)}`;
const jpDate = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(iso));

/** 領収書: always in Japanese, the language of the document. Viewable by the paying organization's manager and billing admins. */
export default async function ReceiptPage({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  if (!isSupabaseConfigured) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login`);
  const t = await getTranslations("billing");

  const db = createAdminClient();
  const { data: pay } = await db
    .from("payments")
    .select("receipt_number, amount_jpy, method, kind, period, seats, verified_at, status, subscription_id")
    .eq("receipt_number", number)
    .maybeSingle();
  if (!pay || pay.status !== "verified") notFound();
  const { data: sub } = await db.from("subscriptions").select("org_id").eq("id", pay.subscription_id).maybeSingle();
  const isBillingAdmin = (viewer.adminRole === "super" || viewer.adminRole === "accounting") && viewer.aal === "aal2";
  const isOwner = viewer.memberRole === "owner" && sub?.org_id === viewer.org.id;
  if (!sub || (!isOwner && !isBillingAdmin)) notFound();

  const [{ data: org }, { data: s }] = await Promise.all([
    db.from("organizations").select("name, kind").eq("id", sub.org_id).maybeSingle(),
    db.from("billing_settings").select("issuer_name, issuer_address, issuer_phone, invoice_reg_no").eq("id", 1).maybeSingle(),
  ]);
  const tax = Math.floor((pay.amount_jpy * 10) / 110); // 内消費税（10%）
  const what =
    pay.kind === "seats"
      ? `GAIA LAB 追加アカウント（${pay.seats ?? ""}名）利用料として`
      : `GAIA LAB ${pay.period === "annual" ? "年額" : "月額"}プラン利用料として`;

  return (
    <main className="min-h-dvh bg-sky-50 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[720px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={isOwner ? "/dashboard" : "/admin"} className="font-semibold text-navy-700 underline-offset-4 hover:underline">
          ← {t("back")}
        </Link>
        <PrintButton label={t("printPdf")} />
      </div>
      <article
        lang="ja"
        className="mx-auto max-w-[720px] bg-white p-10 text-navy-950 shadow-[0_20px_50px_-30px_rgb(13_26_58/0.5)] ring-1 ring-navy-900/10 print:shadow-none print:ring-0 sm:p-14"
      >
        <header className="flex items-start justify-between gap-6">
          <h1 className="font-serif text-4xl font-bold tracking-[0.4em]">領収書</h1>
          <dl className="text-right text-sm">
            <div><dt className="inline">No. </dt><dd className="inline font-mono">{pay.receipt_number}</dd></div>
            <div className="mt-1"><dt className="inline">発行日 </dt><dd className="inline">{jpDate(pay.verified_at)}</dd></div>
          </dl>
        </header>

        <p className="mt-12 border-b-2 border-navy-950 pb-2 text-xl font-semibold">
          {org?.name} {org?.kind === "company" ? "御中" : "様"}
        </p>

        <div className="mt-10 border-y-2 border-navy-950 py-5 text-center">
          <span className="mr-6 text-sm">金額</span>
          <span className="font-serif text-4xl font-bold tabular-nums">{yen(pay.amount_jpy)}-</span>
          <span className="ml-3 text-sm">（税込）</span>
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex gap-4"><dt className="w-24 shrink-0 text-navy-900/70">但し</dt><dd>{what}</dd></div>
          <div className="flex gap-4"><dt className="w-24 shrink-0 text-navy-900/70">内訳</dt><dd>10%対象 {yen(pay.amount_jpy)}（内消費税 {yen(tax)}）</dd></div>
          <div className="flex gap-4"><dt className="w-24 shrink-0 text-navy-900/70">お支払方法</dt><dd>{pay.method === "card" ? "クレジットカード" : "銀行振込"}</dd></div>
        </dl>
        <p className="mt-6 text-sm">上記正に領収いたしました。</p>

        <footer className="mt-14 flex justify-end">
          <div className="text-right text-sm leading-relaxed">
            <p className="text-base font-semibold">{s?.issuer_name}</p>
            <p>{s?.issuer_address}</p>
            {s?.issuer_phone && <p>TEL {s.issuer_phone}</p>}
            {s?.invoice_reg_no && <p>登録番号 {s.invoice_reg_no}</p>}
          </div>
        </footer>
        <p className="mt-10 text-xs text-navy-900/70">※ 本領収書は電子的に発行しているため、収入印紙の貼付はありません。</p>
      </article>
    </main>
  );
}
