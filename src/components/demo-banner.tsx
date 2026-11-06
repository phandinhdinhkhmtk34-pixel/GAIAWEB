import { useLocale, useTranslations } from "next-intl";
import { FlaskConical, Languages } from "lucide-react";
import { draftLocales, type Locale } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Always-visible notice so nobody mistakes prototype numbers for production data. */
export function DemoBanner() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  // Connected to real data: no prototype notice (draft translations are still flagged).
  if (isSupabaseConfigured && !draftLocales.includes(locale)) return null;
  return (
    <div className="bg-navy-950 text-[13px] text-white/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        {!isSupabaseConfigured && (
          <p className="flex items-center gap-2">
            <FlaskConical size={15} className="shrink-0 text-sun-300" aria-hidden />
            {t("demoBanner")}
          </p>
        )}
        {draftLocales.includes(locale) && (
          <p className="flex items-center gap-2 text-sun-200">
            <Languages size={15} className="shrink-0" aria-hidden />
            {t("draftTranslation")}
          </p>
        )}
      </div>
    </div>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-dashed border-sun-500/70 bg-sun-200/50 px-1.5 py-0.5 text-[11px] font-semibold text-sun-700 ${className}`}
    >
      <FlaskConical size={11} aria-hidden />
      {t("demo")}
    </span>
  );
}
