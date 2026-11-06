import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "faq" }))("title") };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const items = t.raw("items") as { q: string; a: string }[];
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-navy-900/70">{t("lead")}</p>
        <div className="mt-10 divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10 bg-white">
          {items.map((it, i) => (
            <details key={i} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
                {it.q}
                <ChevronDown size={18} className="shrink-0 text-navy-900/50 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-5 leading-relaxed text-navy-900/75">{it.a}</p>
            </details>
          ))}
        </div>
        <Link href="/contact" className="btn-3d mt-10">{t("contactCta")}</Link>
      </main>
      <SiteFooter />
    </>
  );
}
