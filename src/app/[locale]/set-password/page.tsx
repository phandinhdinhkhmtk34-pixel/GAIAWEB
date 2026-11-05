import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/auth-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("setPasswordTitle") };
}

// Reached from an invitation or password-reset link; middleware requires the session that link created.
export default async function SetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("setPasswordTitle")} lead={t("setPasswordLead")}>
      <SetPasswordForm />
    </AuthShell>
  );
}
