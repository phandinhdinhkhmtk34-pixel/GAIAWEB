"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Search, Lock, Play, Clock, Heart, X, Subtitles, FlaskConical } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { categories, videos, pick, type Video } from "@/lib/demo-data";
import { VideoThumb } from "./video-thumb";

type ViewerState = "visitor" | "active" | "pending";

/** Mirrors the production rule: premium plays only with a verified, unexpired subscription. */
function canWatch(v: Video, state: ViewerState) {
  return !v.premium || state === "active";
}

const hueOf = (id: string) => categories.find((c) => c.id === id)?.hue ?? 220;

export function LibraryView() {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const locale = useLocale();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(params.get("c") ?? "all");
  const [subLang, setSubLang] = useState<string>("any");
  const [viewer, setViewer] = useState<ViewerState>("active");
  const [openId, setOpenId] = useState<string | null>(params.get("v"));
  const [favorites, setFavorites] = useState<string[]>(["v03", "v07"]);

  const catName = (id: string) => pick(categories.find((c) => c.id === id)!.name, locale);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (category !== "all" && v.category !== category) return false;
      if (subLang !== "any" && !v.subtitles.includes(subLang)) return false;
      if (!q) return true;
      const hay = [pick(v.title, locale), pick(v.summary, locale), v.character, catName(v.category), v.title.ja, v.title.en]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, subLang, locale]);

  const filtering = query.trim() !== "" || category !== "all" || subLang !== "any";
  const hero = videos.find((v) => v.id === "v03")!;
  const open = openId ? videos.find((v) => v.id === openId) ?? null : null;

  const toggleFav = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <div className="pb-24">
      {/* Prototype-only viewer switch */}
      <div className="border-b border-white/10 bg-navy-900/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <FlaskConical size={15} className="text-sun-300" aria-hidden />
          <span id="viewer-label" className="text-white/70">
            {t("viewerState")}
          </span>
          <div role="radiogroup" aria-labelledby="viewer-label" className="inline-flex rounded-lg bg-white/5 p-0.5">
            {(["visitor", "active", "pending"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={viewer === s}
                onClick={() => setViewer(s)}
                className={clsx(
                  "rounded-md px-3 py-1.5 font-medium",
                  viewer === s ? "bg-sun-400 text-navy-950" : "text-white/70 hover:text-white",
                )}
              >
                {t(s === "visitor" ? "stateVisitor" : s === "active" ? "stateActive" : "statePending")}
              </button>
            ))}
          </div>
          <span className="text-xs text-white/45">{t("stateNote")}</span>
        </div>
      </div>

      {/* Featured */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60">
          <VideoThumb hue={hueOf(hero.category)} character="" cover />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/20" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-navy-950 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <p className="text-sm font-medium text-sun-300">{catName(hero.category)}</p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight font-bold sm:text-6xl">{pick(hero.title, locale)}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">{pick(hero.summary, locale)}</p>
          <p className="mt-4 flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Clock size={15} aria-hidden />
              {tc("minutes", { count: hero.minutes })}
            </span>
            <span className="flex items-center gap-1.5">
              <Subtitles size={15} aria-hidden />
              {hero.subtitles.length}
            </span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => setOpenId(hero.id)} className="btn-3d">
              {canWatch(hero, viewer) ? <Play size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
              {canWatch(hero, viewer) ? t("play") : tc("locked")}
            </button>
            <button
              type="button"
              onClick={() => toggleFav(hero.id)}
              aria-pressed={favorites.includes(hero.id)}
              className="btn-ghost text-white hover:bg-white/10"
            >
              <Heart size={18} aria-hidden className={favorites.includes(hero.id) ? "fill-sun-400 text-sun-400" : ""} />
              {favorites.includes(hero.id) ? t("removeFavorite") : t("addFavorite")}
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section aria-label={t("search")} className="sticky top-16 z-30 border-y border-white/10 bg-navy-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <label className="relative flex-1 lg:max-w-sm">
            <span className="sr-only">{t("search")}</span>
            <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/50" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchHint")}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pr-4 pl-10 text-white placeholder:text-white/40 focus:border-sun-400 focus:outline-none"
            />
          </label>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-1 lg:px-0">
            {[{ id: "all" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={clsx(
                  "h-10 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  category === c.id ? "bg-white text-navy-950" : "bg-white/8 text-white/75 hover:bg-white/15",
                )}
              >
                {c.id === "all" ? t("allCategories") : catName(c.id)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <Subtitles size={17} aria-hidden />
            <span className="whitespace-nowrap">{t("subtitleLang")}</span>
            <select
              value={subLang}
              onChange={(e) => setSubLang(e.target.value)}
              className="h-10 rounded-lg border border-white/15 bg-navy-900 px-2 text-white focus:border-sun-400 focus:outline-none"
            >
              <option value="any">{t("anyLang")}</option>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l as Locale]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {filtering ? (
          filtered.length ? (
            <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((v) => (
                <li key={v.id}>
                  <Card v={v} viewer={viewer} onOpen={setOpenId} catName={catName(v.category)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/70">{t("noResults")}</p>
          )
        ) : (
          <>
            <Row title={t("continue")} items={videos.filter((v) => v.progress && v.progress < 100)} viewer={viewer} onOpen={setOpenId} catName={catName} />
            <Row title={t("newest")} items={videos.filter((v) => v.isNew)} viewer={viewer} onOpen={setOpenId} catName={catName} />
            {categories.map((c) => (
              <Row key={c.id} title={catName(c.id)} items={videos.filter((v) => v.category === c.id)} viewer={viewer} onOpen={setOpenId} catName={catName} />
            ))}
          </>
        )}
      </div>

      {open && (
        <PlayerDialog
          v={open}
          viewer={viewer}
          fav={favorites.includes(open.id)}
          onFav={() => toggleFav(open.id)}
          onClose={() => setOpenId(null)}
          catName={catName(open.category)}
        />
      )}
    </div>
  );
}

function Row(props: { title: string; items: Video[]; viewer: ViewerState; onOpen: (id: string) => void; catName: (id: string) => string }) {
  if (!props.items.length) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold">{props.title}</h2>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {props.items.map((v) => (
          <li key={v.id} className="w-[72vw] shrink-0 snap-start sm:w-[300px]">
            <Card v={v} viewer={props.viewer} onOpen={props.onOpen} catName={props.catName(v.category)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ v, viewer, onOpen, catName }: { v: Video; viewer: ViewerState; onOpen: (id: string) => void; catName: string }) {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const locale = useLocale();
  const ok = canWatch(v, viewer);
  return (
    <button type="button" onClick={() => onOpen(v.id)} className="group block w-full text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10 transition-shadow group-hover:ring-sun-400/60">
        <VideoThumb hue={hueOf(v.category)} character={v.character} className={clsx("transition-transform duration-500 group-hover:scale-[1.04]", !ok && "opacity-70")} />
        <span
          className={clsx(
            "absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur",
            v.premium ? "bg-navy-950/75 text-white" : "bg-leaf/90 text-white",
          )}
        >
          {v.premium ? <Lock size={11} aria-hidden /> : null}
          {v.premium ? tc("locked") : t("free")}
        </span>
        {v.progress !== undefined && v.progress < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" role="progressbar" aria-valuenow={v.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-sun-400" style={{ width: `${v.progress}%` }} />
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-sun-300">{catName}</p>
      <h3 className="mt-0.5 font-semibold group-hover:underline">{pick(v.title, locale)}</h3>
      <p className="mt-1 text-sm text-white/55">{tc("minutes", { count: v.minutes })}</p>
    </button>
  );
}

function PlayerDialog(props: { v: Video; viewer: ViewerState; fav: boolean; onFav: () => void; onClose: () => void; catName: string }) {
  const { v, viewer } = props;
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const ok = canWatch(v, viewer);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={props.onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="player-title"
      className="m-auto w-[min(960px,calc(100vw-2rem))] overflow-hidden rounded-3xl bg-navy-900 p-0 text-white shadow-2xl backdrop:bg-navy-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative aspect-video">
        <VideoThumb hue={hueOf(v.category)} character={v.character} className={ok ? "" : "opacity-40 blur-[2px]"} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-950/40 p-6 text-center">
          {ok ? (
            <>
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-sun-400 text-navy-950 shadow-xl">
                <Play size={34} className="translate-x-0.5" aria-hidden />
              </span>
              <p className="max-w-md text-sm text-white/80">{t("playerDemo")}</p>
            </>
          ) : (
            <>
              <Lock size={36} className="text-sun-300" aria-hidden />
              <p className="font-serif text-2xl font-bold">{t("lockedTitle")}</p>
              <p className="max-w-md text-sm text-white/75">{t("lockedBody")}</p>
              <Link href="/#pricing" className="btn-3d mt-2">
                {t("lockedCta")}
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={tc("close")}
          className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-navy-950/70 hover:bg-navy-950"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <p className="text-sm text-sun-300">{props.catName}</p>
          <h2 id="player-title" className="mt-1 font-serif text-2xl font-bold">
            {pick(v.title, locale)}
          </h2>
          <p className="mt-3 text-white/75">{pick(v.summary, locale)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-1">
          <div>
            <dt className="text-white/50">{t("duration")}</dt>
            <dd>{tc("minutes", { count: v.minutes })}</dd>
          </div>
          <div>
            <dt className="text-white/50">{t("subtitles")}</dt>
            <dd>{v.subtitles.map((s) => localeNames[s as Locale]).join(", ")}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <button type="button" onClick={props.onFav} aria-pressed={props.fav} className="inline-flex min-h-11 items-center gap-2 text-sun-300 hover:text-sun-200">
              <Heart size={17} aria-hidden className={props.fav ? "fill-sun-400" : ""} />
              {props.fav ? t("removeFavorite") : t("addFavorite")}
            </button>
          </div>
        </dl>
      </div>
    </dialog>
  );
}
