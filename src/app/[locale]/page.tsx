import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BookOpenCheck, Languages, LineChart, ShieldCheck, ArrowRight, Lock, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DemoBanner, DemoTag } from "@/components/demo-banner";
import { HeroArt } from "@/components/hero-art";
import { HeroIntro } from "@/components/hero-intro";
import { Pricing } from "@/components/pricing";
import { VideoThumb } from "@/components/video-thumb";
import { categories, videos, pick } from "@/lib/demo-data";

const FEATURE_ICONS = [BookOpenCheck, Languages, LineChart, ShieldCheck];

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Home />;
}

function Home() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const features = t.raw("features") as { title: string; body: string }[];
  const featured = videos.filter((v) => v.isNew || v.progress === undefined).slice(0, 4);
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgb(247_213_138/0.55),transparent_65%)]"
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-14 lg:px-8 lg:pt-20 lg:pb-28">
            <HeroIntro />
            <HeroArt />
          </div>
        </section>

        {/* INTRO */}
        <section className="border-y border-navy-900/8 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div>
              <h2 className="font-serif text-3xl leading-snug font-bold sm:text-4xl">{t("introTitle")}</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-900/75">{t("introBody")}</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 self-end">
              {[
                { v: String(categories.length), l: t("introStat1") },
                { v: "7", l: t("introStat2") },
                { v: tc("minutes", { count: 10 }), l: t("introStat3") },
              ].map((s) => (
                <div key={s.l} className="border-l-2 border-sun-400 pl-4">
                  <dt className="text-sm text-navy-900/60">{s.l}</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold tabular-nums sm:text-4xl">{s.v}</dd>
                </div>
              ))}
              <div className="col-span-3">
                <DemoTag />
              </div>
            </dl>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="font-serif text-3xl leading-snug font-bold sm:text-4xl lg:sticky lg:top-28 lg:self-start">{t("featuresTitle")}</h2>
            <ul className="divide-y divide-navy-900/10">
              {features.map((f, i) => {
                const Icon = FEATURE_ICONS[i] ?? BookOpenCheck;
                return (
                  <li key={f.title} className="flex gap-6 py-8 first:pt-0">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-sun-300">
                      <Icon size={26} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold">{f.title}</h3>
                      <p className="mt-2 max-w-xl text-navy-900/70">{f.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* FEATURED VIDEOS — a slice of the dark library, previewing where members go next */}
        <section className="bg-navy-950 py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">{t("featuredTitle")}</h2>
              <Link href="/library" className="inline-flex items-center gap-2 font-semibold text-sun-300 hover:text-sun-200">
                {t("featuredAll")}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((v) => (
                <li key={v.id}>
                  <Link href={`/library?v=${v.id}`} className="group block">
                    <div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-white/10">
                      <VideoThumb
                        hue={catMap[v.category]?.hue ?? 220}
                        character={v.character}
                        className="transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      {(
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-navy-950/75 px-2.5 py-1 text-xs backdrop-blur">
                          <Lock size={12} aria-hidden />
                          {tc("locked")}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-sun-300">{pick(catMap[v.category]!.name, locale)}</p>
                    <h3 className="mt-1 text-lg font-semibold group-hover:underline">{pick(v.title, locale)}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/55">
                      <Clock size={14} aria-hidden />
                      {tc("minutes", { count: v.minutes })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">{t("categoriesTitle")}</h2>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => {
              const count = videos.filter((v) => v.category === c.id).length;
              return (
                <li key={c.id}>
                  <Link
                    href={`/library?c=${c.id}`}
                    className="group flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-navy-900/10 bg-white px-5 py-5 transition-colors hover:border-navy-900/30"
                  >
                    <span>
                      <span className="block text-lg font-bold">{pick(c.name, locale)}</span>
                      <span className="text-sm text-navy-900/55">{count}</span>
                    </span>
                    <span
                      aria-hidden
                      className="h-10 w-10 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, hsl(${c.hue} 55% 30%), #F0BC55)` }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* PRICING */}
        <section id="pricing" className="scroll-mt-20 border-t border-navy-900/8 bg-gradient-to-b from-white to-sky-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-bold sm:text-5xl">{t("pricingTitle")}</h2>
              <p className="mt-5 text-lg text-navy-900/70">{t("pricingLead")}</p>
            </div>
            <div className="mt-14">
              <Pricing />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
