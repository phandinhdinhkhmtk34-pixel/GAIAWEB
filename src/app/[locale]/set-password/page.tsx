import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("setPasswordTitle") };
}

// Reached from an invitation or password-reset link; middleware requires the session that link created.
export default async function SetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const user = isSupabaseConfigured ? (await (await createClient()).auth.getUser()).data.user : null;
  const needsTerms = Boolean(user) && !user?.user_metadata?.terms_agreed_at;
  return (
    <AuthShell title={t("setPasswordTitle")} lead={t("setPasswordLead")}>
      <SetPasswordForm needsTerms={needsTerms} />
    </AuthShell>
  );
}
