"use client";

import { useLocale, useTranslations } from "next-intl";
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
import { Fragment } from "react";
import { pickText, type HomeSectionId, type SiteContent } from "@/lib/site-content";
import type { HomeCatalog } from "@/lib/site-content-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Editable, EditableImage, useEdit } from "./edit-context";
import { AdminEditButton } from "./admin-edit-button";
import { responsive } from "@/lib/img";

const FEATURE_ICONS = [BookOpenCheck, Languages, LineChart, ShieldCheck];

/** The homepage, rendered from site content (published for visitors, draft in the admin preview). */
export function HomeView({ content, catalog, preview = false }: { content: SiteContent; catalog?: HomeCatalog | null; preview?: boolean }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const features = t.raw("features") as { title: string; body: string }[];
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  // Real catalogue when the site is connected; the demo set only in prototype mode.
  const live = isSupabaseConfigured;
  const featured = catalog
    ? catalog.videos.slice(0, 4)
    : live
      ? []
      : videos.filter((v) => v.isNew || v.progress === undefined).slice(0, 4).map((v) => ({
          id: v.id,
          title: pick(v.title, locale),
          categorySlug: v.category,
          categoryName: pick(catMap[v.category]!.name, locale),
          minutes: v.minutes,
          character: v.character,
          thumbnailUrl: null as string | null,
        }));
  const categoryList = catalog
    ? catalog.categories
    : categories.map((c) => ({ slug: c.id, name: pick(c.name, locale), count: videos.filter((v) => v.category === c.id).length }));
  const avgMinutes = catalog ? catalog.avgMinutes : 10;
  const editing = Boolean(useEdit());
  const ta = useTranslations("admin");

  const introSection = (
        <section className="border-y border-navy-900/8 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div>
              <Editable as="h2" path="introTitle" label={ta("cmsIntroTitle")} value={pickText(content.introTitle, locale) ?? t("introTitle")} className="block font-serif text-3xl leading-snug font-bold sm:text-4xl" />
              <Editable as="p" multiline path="introBody" label={ta("cmsIntroBody")} value={pickText(content.introBody, locale) ?? t("introBody")} className="mt-6 block max-w-xl text-lg leading-relaxed whitespace-pre-line text-navy-900/75" />
            </div>
            <div className="space-y-4 self-end">
            <dl className="grid grid-cols-3 gap-4">
              {[
                { v: String(categoryList.length), l: t("introStat1") },
                { v: "7", l: t("introStat2") },
                ...(avgMinutes ? [{ v: tc("minutes", { count: avgMinutes }), l: t("introStat3") }] : []),
              ].map((s) => (
                <div key={s.l} className="border-l-2 border-sun-400 pl-4">
                  <dt className="text-sm text-navy-900/70">{s.l}</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold tabular-nums sm:text-4xl">{s.v}</dd>
                </div>
              ))}
            </dl>
            {!live && <DemoTag />}
            </div>
          </div>
        </section>
  );
  const featuresSection = (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          {/* The features speak for themselves; the heading is kept for screen readers only. */}
          <h2 className="sr-only">{t("featuresTitle")}</h2>
          <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? BookOpenCheck;
              return (
                <li key={f.title} className="border-t-2 border-navy-900 pt-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-sun-300">
                    <Icon size={24} aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy-900/70">{f.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
  );
  const charactersSection = (
        <section className="border-t border-navy-900/8 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">{t("charactersTitle")}</h2>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {content.characters.map((c, i) => (
                <li key={i} className="overflow-hidden rounded-2xl border border-navy-900/10 bg-sky-50">
                  <EditableImage path={`characters.${i}.imageUrl`} label={ta("cmsCharacterN", { n: i + 1 })} kind="character">
                  <div className="relative aspect-[3/4] bg-gradient-to-b from-navy-700 via-dusk to-sun-300">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img {...responsive(c.imageUrl, [384, 640])} sizes="(min-width: 640px) 25vw, 50vw" alt={c.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 120 160" className="absolute inset-0 h-full w-full" aria-hidden>
                        <circle cx="60" cy="62" r="18" fill="#0B1533" />
                        <path d="M30 160 C30 110, 42 88, 60 88 C78 88, 90 110, 90 160 Z" fill="#0B1533" />
                      </svg>
                    )}
                  </div>
                  </EditableImage>
                  <div className="p-4">
                    <Editable as="p" path={`characters.${i}.name`} label={ta("cmsCharacterName")} value={c.name} className="block font-semibold" />
                    {(editing || pickText(c.role, locale)) && (
                      <Editable as="p" path={`characters.${i}.role`} label={ta("cmsCharacterRole")} value={pickText(c.role, locale) ?? ""} className="mt-1 block min-h-5 text-sm text-navy-900/70" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
  );
  const featuredSection = (
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
                      {v.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img {...responsive(v.thumbnailUrl, [384, 640])} sizes="(min-width: 1024px) 25vw, 50vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      ) : (
                        <VideoThumb hue={catMap[v.categorySlug]?.hue ?? 220} character={v.character} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                      )}
                      {(
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-navy-950/75 px-2.5 py-1 text-xs backdrop-blur">
                          <Lock size={12} aria-hidden />
                          {tc("locked")}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-sun-300">{v.categoryName}</p>
                    <h3 className="mt-1 text-lg font-semibold group-hover:underline">{v.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65">
                      <Clock size={14} aria-hidden />
                      {tc("minutes", { count: v.minutes })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
  );
  const categoriesSection = (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">{t("categoriesTitle")}</h2>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryList.map((c) => {
              return (
                <li key={c.slug}>
                  <Link
                    href={`/library?c=${c.slug}`}
                    className="group flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-navy-900/10 bg-white px-5 py-5 transition-colors hover:border-navy-900/30"
                  >
                    <span>
                      <span className="block text-lg font-bold">{c.name}</span>
                      <span className="text-sm text-navy-900/70">{t("videoCount", { count: c.count })}</span>
                    </span>
                    <span
                      aria-hidden
                      className="h-10 w-10 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, hsl(${catMap[c.slug]?.hue ?? 220} 55% 30%), #F0BC55)` }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
  );
  const pricingSection = (
        <section id="pricing" className="scroll-mt-20 border-t border-navy-900/8 bg-gradient-to-b from-white to-sky-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-bold sm:text-5xl">{t("pricingTitle")}</h2>
              <p className="mt-5 text-lg text-navy-900/70">{t("pricingLead")}</p>
            </div>
            <div className="mt-14">
              <Pricing prices={content.prices} />
            </div>
          </div>
        </section>
  );
  const byId: Record<HomeSectionId, React.ReactNode> = {
    intro: introSection,
    features: featuresSection,
    characters: charactersSection,
    featured: featured.length ? featuredSection : null,
    categories: categoriesSection,
    pricing: pricingSection,
  };

  return (
    <>
      {!preview && !live && <DemoBanner />}
      {!preview && <AdminEditButton />}
      <SiteHeader />
      <main id="main">
                <Hero content={content} />
        {content.sections
          .filter((sec) => sec.visible)
          .map((sec) => (
            <Fragment key={sec.id}>{byId[sec.id]}</Fragment>
          ))}
      </main>
      <SiteFooter />
    </>
  );
}

/** Banner in one of three layouts chosen in Admin. "overlay" needs an uploaded image; without one it shows text-left. */
function Hero({ content }: { content: SiteContent }) {
  const locale = useLocale();
  const title = pickText(content.heroTitle, locale) ?? undefined;
  const lead = pickText(content.heroLead, locale) ?? undefined;
  const tagline = pickText(content.heroTagline, locale) ?? undefined;
  const video = content.introVideoUrl;
  const layout = content.heroLayout === "overlay" && !content.heroImageUrl ? "textLeft" : content.heroLayout;
  const align = content.heroAlign;

  if (layout === "overlay") {
    return (
      <section className="relative isolate overflow-hidden bg-navy-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...responsive(content.heroImageUrl!, [828, 1200, 1920])} sizes="100vw" alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden className={align === "center" ? "absolute inset-0 -z-10 bg-navy-950/60" : "absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/90 via-navy-950/60 to-navy-950/10"} />
        <div className={`mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:min-h-[640px] lg:px-8 ${align === "center" ? "justify-center" : ""}`}>
          <div className={align === "center" ? "max-w-3xl" : "max-w-2xl"}>
            <HeroIntro title={title} lead={lead} tagline={tagline} video={video} align={align} onDark />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgb(247_213_138/0.55),transparent_65%)]"
      />
      <div className={`relative mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-20 sm:px-6 lg:items-center lg:gap-14 lg:px-8 lg:pt-20 lg:pb-28 ${layout === "imageLeft" ? "lg:grid-cols-[1.08fr_1fr]" : "lg:grid-cols-[1fr_1.08fr]"}`}>
        <div className={layout === "imageLeft" ? "lg:order-2" : ""}>
          <HeroIntro title={title} lead={lead} tagline={tagline} video={video} align={align} />
        </div>
        <HeroArt />
      </div>
    </section>
  );
}
