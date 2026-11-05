import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { MfaForm } from "@/components/mfa-form";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("mfaTitle") };
}

export default async function MfaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/mfa`);
  const t = await getTranslations("auth");
  if (!viewer.adminRole) {
    return (
      <AuthShell title={t("mfaTitle")}>
        <p className="text-navy-900/75">{t("notAdmin")}</p>
      </AuthShell>
    );
  }
  if (viewer.aal === "aal2") redirect(`/${locale}/admin`);
  return (
    <AuthShell title={t("mfaTitle")} lead={viewer.hasVerifiedTotp ? undefined : t("mfaEnrollLead")}>
      <MfaForm enrolled={viewer.hasVerifiedTotp} />
    </AuthShell>
  );
}
