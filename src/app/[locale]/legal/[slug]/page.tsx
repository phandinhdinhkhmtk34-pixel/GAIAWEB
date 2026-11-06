import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { loadPublishedSiteContent } from "@/lib/site-content-server";
import { LEGAL_SLUGS, type LegalSlug } from "@/lib/site-content";
import { LEGAL_TEMPLATES } from "@/lib/legal-templates";
import { renderLegal as render } from "@/components/legal-render";

export const revalidate = 300;

const TITLES: Record<LegalSlug, string> = {
  tokushoho: "特定商取引法に基づく表記",
  privacy: "プライバシーポリシー",
  terms: "利用規約",
};

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: TITLES[slug as LegalSlug] ?? "" };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!(LEGAL_SLUGS as readonly string[]).includes(slug)) notFound();
  const content = await loadPublishedSiteContent();
  const own = content.legal[slug as LegalSlug];
  const text = own.trim() ? own : LEGAL_TEMPLATES[slug as LegalSlug];
  const unfinished = !own.trim() || text.includes("【要入力】");
  return (
    <>
      <SiteHeader />
      <main id="main" lang="ja" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {unfinished && (
          <p role="note" className="mb-8 flex gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-sun-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            この内容は作成中のひな形です。【要入力】の部分は正式な情報に差し替えてください。
          </p>
        )}
        <article className="text-navy-900">{render(text)}</article>
      </main>
      <SiteFooter />
    </>
  );
}
