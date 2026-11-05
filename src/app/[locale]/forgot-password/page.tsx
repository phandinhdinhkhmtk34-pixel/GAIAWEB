import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("forgotTitle") };
}

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("forgotTitle")} lead={t("forgotLead")}>
      <ForgotForm />
    </AuthShell>
  );
}
