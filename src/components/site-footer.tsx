"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSite } from "./site-context";
import { pickText } from "@/lib/site-content";
import { Editable, useEdit } from "./edit-context";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const site = useSite();
  const about = pickText(site.footerAbout, locale) ?? t("home.footerAbout");
  const editing = Boolean(useEdit());
  const col = "space-y-2.5 text-sm text-white/65";
  return (
    <footer className="bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Logo dark />
          <Editable as="p" multiline path="footerAbout" label={t("admin.cmsFooterAbout")} value={about} className="mt-5 block text-sm leading-relaxed text-white/65" />
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-sun-300">{t("home.footerService")}</h2>
          <ul className={col}>
            <li><Link className="hover:text-white" href="/library">{t("nav.library")}</Link></li>
            <li><Link className="hover:text-white" href="/#pricing">{t("home.pricingTitle")}</Link></li>
            <li><Link className="hover:text-white" href="/dashboard">{t("nav.dashboard")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-sun-300">{t("home.footerCompany")}</h2>
          <ul className={col}>
            <li><Editable path="company.name" label={t("admin.cmsCompany_name")} value={site.company.name || (editing ? "" : t("home.footerCompanyName"))} className="inline-block min-w-24" /></li>
            <li><Editable path="company.address" label={t("admin.cmsCompany_address")} value={site.company.address || (editing ? "" : t("home.footerAddress"))} className="inline-block min-w-24" /></li>
            {(editing || site.company.phone) && <li>TEL <Editable path="company.phone" label={t("admin.cmsCompany_phone")} value={site.company.phone} className="inline-block min-w-24" /></li>}
            <li className="select-all">{site.company.email ? `${t("home.footerContact")}: ${site.company.email}` : t("home.footerContact")}</li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-sun-300">{t("home.footerLegal")}</h2>
          <ul className={col}>
            <li><Link className="hover:text-white" href="/legal/terms">{t("home.footerTerms")}</Link></li>
            <li><Link className="hover:text-white" href="/legal/privacy">{t("home.footerPrivacy")}</Link></li>
            <li><Link className="hover:text-white" href="/legal/tokushoho">{t("home.footerTokushoho")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/65 sm:px-6 lg:px-8">{t("home.footerCopy")}</p>
      </div>
    </footer>
  );
}
