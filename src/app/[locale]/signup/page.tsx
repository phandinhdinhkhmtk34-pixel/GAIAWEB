import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";
import { quote } from "@/lib/pricing";
import { formatYen } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("signupTitle") };
}

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; seats?: string }>;
}) {
  const { locale } = await params;
  const { plan, seats } = await searchParams;
  setRequestLocale(locale);
  if (await getViewer()) redirect(`/${locale}/dashboard`);
  const t = await getTranslations("auth");
  const th = await getTranslations("home");
  const tc = await getTranslations("common");
  // Plan chosen on the pricing section; payment itself arrives in Phase 4.
  const billing = plan === "annual" ? "annual" : plan === "monthly" ? "monthly" : null;
  const people = Math.min(50, Math.max(1, Number.parseInt(seats ?? "1", 10) || 1));
  const q = billing ? quote(people, billing) : null;
  return (
    <AuthShell title={t("signupTitle")} lead={t("signupLead")}>
      {billing && q && (
        <div className="mb-8 rounded-2xl bg-navy-900 p-5 text-white">
          <p className="text-sm text-white/65">{t("chosenPlan")}</p>
          <p className="mt-1 font-semibold">
            {billing === "annual" ? th("planAnnual") : th("planMonthly")} · {th("calcPeople", { count: people })}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-sun-300 tabular-nums">
            {formatYen(q.total, locale)}
            <span className="ml-1 font-sans text-sm font-normal text-white/65">
              {billing === "annual" ? tc("perYear") : tc("perMonth")} · {tc("taxIncluded")}
            </span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/60">{t("paymentLater")}</p>
        </div>
      )}
      <SignupForm />
    </AuthShell>
  );
}
