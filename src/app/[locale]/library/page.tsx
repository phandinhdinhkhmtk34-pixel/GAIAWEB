import { Suspense, use } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LibraryView } from "@/components/library-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

export default function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <div className="min-h-dvh bg-navy-950 text-white">
      <DemoBanner />
      <SiteHeader tone="dark" />
      <main id="main">
        <Suspense>
          <LibraryView />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
