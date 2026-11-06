import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { routing } from "@/i18n/routing";
import { notoSans, notoSerif, notoSansJP, notoSerifJP, scriptFonts } from "../fonts";
import { SiteProvider } from "@/components/site-context";
import { loadPublishedSiteContent } from "@/lib/site-content-server";
import "../globals.css";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: `%s | ${t("title")}` },
    description: t("description"),
    robots: { index: false, follow: false }, // prototype: keep out of search engines
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [messages, site] = await Promise.all([getMessages(), loadPublishedSiteContent()]);

  return (
    <html
      lang={locale}
      className={clsx(notoSans.variable, notoSerif.variable, notoSansJP.variable, notoSerifJP.variable, ...scriptFonts)}
    >
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider messages={messages}>
          <SiteProvider value={site}>{children}</SiteProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
