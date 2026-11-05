import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = useTranslations();
  const col = "space-y-2.5 text-sm text-white/65";
  return (
    <footer className="bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Logo dark />
          <p className="mt-5 text-sm leading-relaxed text-white/65">{t("home.footerAbout")}</p>
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
            <li>{t("home.footerCompanyName")}</li>
            <li>{t("home.footerAddress")}</li>
            <li><a className="hover:text-white" href="mailto:info@example.com">{t("home.footerContact")}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-sun-300">{t("home.footerLegal")}</h2>
          <ul className={col}>
            <li><a className="hover:text-white" href="#">{t("home.footerTerms")}</a></li>
            <li><a className="hover:text-white" href="#">{t("home.footerPrivacy")}</a></li>
            <li><a className="hover:text-white" href="#">{t("home.footerTokushoho")}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/45 sm:px-6 lg:px-8">{t("home.footerCopy")}</p>
      </div>
    </footer>
  );
}
