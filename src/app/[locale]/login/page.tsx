import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("loginTitle") };
}

const KNOWN_ERRORS = ["linkInvalid"];

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  setRequestLocale(locale);
  if (await getViewer()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/dashboard`);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("loginTitle")} lead={t("loginLead")}>
      <LoginForm next={next} initialError={error && KNOWN_ERRORS.includes(error) ? error : undefined} />
    </AuthShell>
  );
}
