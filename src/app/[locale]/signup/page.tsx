import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("signupTitle") };
}

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getViewer()) redirect(`/${locale}/dashboard`);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("signupTitle")} lead={t("signupLead")}>
      <SignupForm />
    </AuthShell>
  );
}
