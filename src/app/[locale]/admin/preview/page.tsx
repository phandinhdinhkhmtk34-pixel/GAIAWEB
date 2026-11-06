import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye } from "lucide-react";
import { HomeView } from "@/components/home-view";
import { SiteProvider } from "@/components/site-context";
import { getViewer } from "@/lib/auth";
import { loadDraftSiteContent } from "@/lib/site-content-server";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

/** The homepage as it will look after publishing (admins only). */
export default async function PreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/admin/preview`);
  if (!viewer.adminRole || viewer.adminRole === "accounting") notFound();
  if (viewer.aal !== "aal2") redirect(`/${locale}/mfa`);
  const t = await getTranslations("admin");
  const draft = await loadDraftSiteContent();
  return (
    <SiteProvider value={draft}>
      <p className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-sun-400 px-4 py-2 text-sm font-semibold text-navy-950">
        <Eye size={16} aria-hidden />
        {t("previewBanner")}
      </p>
      <HomeView content={draft} preview />
    </SiteProvider>
  );
}
