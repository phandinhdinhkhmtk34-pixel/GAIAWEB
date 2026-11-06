"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Check, Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { quote, DEFAULT_PRICES, type Billing, type PriceConfig } from "@/lib/pricing";
import { formatYen } from "@/lib/format";

export function Pricing({ prices = DEFAULT_PRICES }: { prices?: PriceConfig }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const features = t.raw("planFeatures") as string[];
  const yen = (n: number) => formatYen(n, locale);
  const monthly = quote(1, "monthly", prices);
  const annual = quote(1, "annual", prices);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <PlanCard
          billing="monthly"
          name={t("planMonthly")}
          desc={t("planMonthlyDesc")}
          price={yen(monthly.base)}
          unit={tc("perMonth")}
          seat={t("planSeat", { price: `${yen(monthly.seat)}${tc("perMonth")}` })}
          features={features}
          cta={tc("register")}
          includes={t("planIncludes")}
          tax={tc("taxIncluded")}
        />
        <PlanCard
          billing="annual"
          featured
          badge={t("planAnnualBadge")}
          name={t("planAnnual")}
          desc={t("planAnnualDesc")}
          price={yen(annual.base)}
          unit={tc("perYear")}
          seat={t("planSeat", { price: `${yen(annual.seat)}${tc("perYear")}` })}
          features={features}
          cta={tc("register")}
          includes={t("planIncludes")}
          tax={tc("taxIncluded")}
        />
        <div className="flex flex-col rounded-3xl border border-navy-900/10 bg-white/60 p-8">
          <Building2 className="text-navy-700" size={28} aria-hidden />
          <h3 className="mt-5 font-serif text-2xl font-bold">{t("planEnterprise")}</h3>
          <p className="mt-3 text-navy-900/70">{t("planEnterpriseDesc")}</p>
          <p className="mt-8 font-serif text-3xl font-bold text-navy-900">{t("planEnterprisePrice")}</p>
          <a href="mailto:info@example.com" className="btn-ghost mt-auto translate-y-0 text-navy-900 hover:bg-navy-900 hover:text-white lg:mt-auto">
            {t("planContact")}
          </a>
        </div>
      </div>
      <Calculator prices={prices} />
    </div>
  );
}

function PlanCard(props: {
  name: string;
  desc: string;
  price: string;
  unit: string;
  seat: string;
  features: string[];
  cta: string;
  includes: string;
  tax: string;
  featured?: boolean;
  badge?: string;
  billing: Billing;
}) {
  const { featured } = props;
  return (
    <div
      className={clsx(
        "relative flex flex-col rounded-3xl p-8",
        featured
          ? "bg-navy-900 text-white shadow-[0_30px_60px_-24px_rgb(13_26_58/0.55)] ring-1 ring-sun-400/40 lg:-my-4 lg:py-12"
          : "border border-navy-900/10 bg-white",
      )}
    >
      {props.badge && (
        <span className="absolute -top-3.5 left-8 rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-navy-950">{props.badge}</span>
      )}
      <h3 className="font-serif text-2xl font-bold">{props.name}</h3>
      <p className={clsx("mt-3", featured ? "text-white/70" : "text-navy-900/70")}>{props.desc}</p>
      <p className="mt-8 flex items-baseline gap-1.5">
        <span className={clsx("font-serif text-[2.6rem] leading-none font-bold tabular-nums", featured && "text-sun-300")}>{props.price}</span>
        <span className={featured ? "text-white/70" : "text-navy-900/60"}>{props.unit}</span>
      </p>
      <p className={clsx("mt-2 text-sm", featured ? "text-white/60" : "text-navy-900/55")}>
        {props.tax} · {props.includes}
      </p>
      <p className={clsx("mt-1 text-sm font-medium", featured ? "text-sun-200" : "text-sun-700")}>{props.seat}</p>
      <ul className="mt-7 mb-9 space-y-3 text-[15px]">
        {props.features.map((f) => (
          <li key={f} className="flex gap-3">
            <Check size={18} className={clsx("mt-1 shrink-0", featured ? "text-sun-300" : "text-leaf")} aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <Link href={{ pathname: "/signup", query: { plan: props.billing, seats: 1 } }} className="btn-3d mt-auto w-full">
        {props.cta}
      </Link>
    </div>
  );
}

function Calculator({ prices }: { prices: PriceConfig }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [users, setUsers] = useState(5);
  const [billing, setBilling] = useState<Billing>("monthly");
  const q = quote(users, billing, prices);
  const sliderId = useId();
  const yen = (n: number) => formatYen(n, locale);

  return (
    <div id="calculator" className="mt-16 grid gap-8 rounded-3xl border border-navy-900/10 bg-white p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
      <div>
        <h3 className="font-serif text-2xl font-bold">{t("calcTitle")}</h3>
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <label htmlFor={sliderId} className="font-medium">
              {t("calcUsers")}
            </label>
            <output htmlFor={sliderId} className="font-serif text-2xl font-bold tabular-nums">
              {t("calcPeople", { count: users })}
            </output>
          </div>
          <input
            id={sliderId}
            type="range"
            min={1}
            max={50}
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="mt-4 h-11 w-full cursor-pointer accent-[#E2A030]"
          />
          <div className="flex justify-between text-xs text-navy-900/50">
            <span>1</span>
            <span>50</span>
          </div>
        </div>
        <fieldset className="mt-8">
          <legend className="font-medium">{t("calcBilling")}</legend>
          <div className="mt-3 inline-flex rounded-xl bg-sky-100 p-1">
            {(["monthly", "annual"] as const).map((b) => (
              <label
                key={b}
                className={clsx(
                  "cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400",
                  billing === b ? "bg-white text-navy-900 shadow-sm" : "text-navy-900/60",
                )}
              >
                <input type="radio" name="billing" value={b} checked={billing === b} onChange={() => setBilling(b)} className="sr-only" />
                {b === "monthly" ? t("calcMonthly") : t("calcAnnual")}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="rounded-2xl bg-navy-900 p-8 text-white" aria-live="polite">
        <p className="text-sm text-white/65">{t("calcTotal")}</p>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="font-serif text-5xl font-bold text-sun-300 tabular-nums">{yen(q.total)}</span>
          <span className="text-white/65">{billing === "monthly" ? tc("perMonth") : tc("perYear")}</span>
        </p>
        <p className="mt-1 text-sm text-white/55">{tc("taxIncluded")}</p>
        <p className="mt-6 border-t border-white/10 pt-5 text-sm text-white/75">
          {t("calcBreakdown", { base: yen(q.base), extra: q.extra, seat: yen(q.seat) })}
        </p>
        <Link href={{ pathname: "/signup", query: { plan: billing, seats: users } }} className="btn-3d mt-7 w-full">
          {tc("register")}
        </Link>
      </div>
    </div>
  );
}
