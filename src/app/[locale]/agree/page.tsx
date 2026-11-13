import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { AgreeForm } from "@/components/auth-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("agreeTitle"), robots: { index: false } };
}

// Middleware sends signed-in people here before they use the service if they have not agreed yet.
export default async function AgreePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/dashboard`;
  return (
    <AuthShell title={t("agreeTitle")} lead={t("agreeLead")}>
      <AgreeForm next={safe} />
    </AuthShell>
  );
}
