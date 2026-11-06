import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "contact" }))("title") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-navy-900/70">{t("lead")}</p>
        <div className="relative mt-10">
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
