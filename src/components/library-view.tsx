"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Search, Lock, Play, Clock, Heart, X, Subtitles, FlaskConical, Loader2, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { categories as demoCategories, videos as demoVideos, pick } from "@/lib/demo-data";
import { VideoThumb } from "./video-thumb";

/** One video as the library shows it, whether it comes from demo data or the database. */
export interface LibItem {
  id: string;
  category: string; // slug
  categoryName: string;
  title: string;
  summary: string;
  character: string;
  minutes: number;
  durationSeconds: number;
  subtitles: string[];
  progress?: number; // 0-100
  isNew?: boolean;
}

/** Real catalogue + the viewer's access, passed by the server when Supabase is configured. */
export interface LibraryLive {
  signedIn: boolean;
  canWatch: boolean;
  categories: { slug: string; name: string }[];
  items: LibItem[];
  favorites: string[];
}

type Access = "visitor" | "active" | "pending";

const hueOf = (slug: string) => demoCategories.find((c) => c.id === slug)?.hue ?? 220;

function demoItems(locale: string): LibItem[] {
  return demoVideos.map((v) => ({
    id: v.id,
    category: v.category,
    categoryName: pick(demoCategories.find((c) => c.id === v.category)!.name, locale),
    title: pick(v.title, locale),
    summary: pick(v.summary, locale),
    character: v.character,
    minutes: v.minutes,
    durationSeconds: v.minutes * 60,
    subtitles: v.subtitles,
    progress: v.progress,
    isNew: v.isNew,
  }));
}

export function LibraryView({ live }: { live?: LibraryLive }) {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const locale = useLocale();
  const params = useSearchParams();

  const items = useMemo(() => live?.items ?? demoItems(locale), [live, locale]);
  const cats = useMemo(
    () => live?.categories ?? demoCategories.map((c) => ({ slug: c.id, name: pick(c.name, locale) })),
    [live, locale],
  );

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(params.get("c") ?? "all");
  const [subLang, setSubLang] = useState<string>("any");
  const [demoAccess, setDemoAccess] = useState<Access>("active");
  const [openId, setOpenId] = useState<string | null>(params.get("v"));
  const [favorites, setFavorites] = useState<string[]>(live?.favorites ?? ["v03", "v07"]);

  // Every video is paid: playable only with a verified subscription.
  const canWatch = live ? live.canWatch : demoAccess === "active";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      if (category !== "all" && v.category !== category) return false;
      if (subLang !== "any" && !v.subtitles.includes(subLang)) return false;
      if (!q) return true;
      return [v.title, v.summary, v.character, v.categoryName].join(" ").toLowerCase().includes(q);
    });
  }, [items, query, category, subLang]);

  const filtering = query.trim() !== "" || category !== "all" || subLang !== "any";
  const hero = items.find((v) => v.isNew) ?? items[0];
  const open = openId ? items.find((v) => v.id === openId) ?? null : null;

  const toggleFav = useCallback(
    async (id: string) => {
      const on = !favorites.includes(id);
      setFavorites((f) => (on ? [...f, id] : f.filter((x) => x !== id)));
      if (!live?.signedIn) return;
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      if (on) await supabase.from("favorites").insert({ user_id: data.user.id, video_id: id });
      else await supabase.from("favorites").delete().eq("user_id", data.user.id).eq("video_id", id);
    },
    [favorites, live],
  );

  if (live && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
        <p className="mt-4 text-white/70">{t("emptyCatalog")}</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {!live && (
        <div className="border-b border-white/10 bg-navy-900/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
            <FlaskConical size={15} className="text-sun-300" aria-hidden />
            <span id="viewer-label" className="text-white/70">{t("viewerState")}</span>
            <div role="radiogroup" aria-labelledby="viewer-label" className="inline-flex rounded-lg bg-white/5 p-0.5">
              {(["visitor", "active", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={demoAccess === s}
                  onClick={() => setDemoAccess(s)}
                  className={clsx("rounded-md px-3 py-1.5 font-medium", demoAccess === s ? "bg-sun-400 text-navy-950" : "text-white/70 hover:text-white")}
                >
                  {t(s === "visitor" ? "stateVisitor" : s === "active" ? "stateActive" : "statePending")}
                </button>
              ))}
            </div>
            <span className="text-xs text-white/45">{t("stateNote")}</span>
          </div>
        </div>
      )}

      {live && !canWatch && (
        <div className="border-b border-sun-400/30 bg-sun-400/10">
          <p className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm text-sun-200 sm:px-6 lg:px-8">
            <Lock size={15} aria-hidden />
            {live.signedIn ? t("bannerNoPlan") : t("bannerSignIn")}
            <Link href={live.signedIn ? "/#pricing" : "/login"} className="font-semibold text-sun-300 underline-offset-4 hover:underline">
              {live.signedIn ? t("lockedCta") : tc("signIn")}
            </Link>
          </p>
        </div>
      )}

      {hero && (
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-60">
            <VideoThumb hue={hueOf(hero.category)} character="" cover />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/20" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-navy-950 to-transparent" />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-sm font-medium text-sun-300">{hero.categoryName}</p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight font-bold sm:text-6xl">{hero.title}</h1>
            {hero.summary && <p className="mt-5 max-w-xl text-lg text-white/75">{hero.summary}</p>}
            <p className="mt-4 flex items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Clock size={15} aria-hidden />
                {tc("minutes", { count: hero.minutes })}
              </span>
              {hero.subtitles.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Subtitles size={15} aria-hidden />
                  {hero.subtitles.length}
                </span>
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setOpenId(hero.id)} className="btn-3d">
                {canWatch ? <Play size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
                {canWatch ? t("play") : tc("locked")}
              </button>
              {(!live || live.signedIn) && (
                <button type="button" onClick={() => toggleFav(hero.id)} aria-pressed={favorites.includes(hero.id)} className="btn-ghost text-white hover:bg-white/10">
                  <Heart size={18} aria-hidden className={favorites.includes(hero.id) ? "fill-sun-400 text-sun-400" : ""} />
                  {favorites.includes(hero.id) ? t("removeFavorite") : t("addFavorite")}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

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
            {[{ slug: "all", name: t("allCategories") }, ...cats].map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                aria-pressed={category === c.slug}
                className={clsx(
                  "h-10 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  category === c.slug ? "bg-white text-navy-950" : "bg-white/8 text-white/75 hover:bg-white/15",
                )}
              >
                {c.name}
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
                <option key={l} value={l}>{localeNames[l as Locale]}</option>
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
                  <Card v={v} canWatch={canWatch} onOpen={setOpenId} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/70">{t("noResults")}</p>
          )
        ) : (
          <>
            <Row title={t("continue")} items={items.filter((v) => v.progress && v.progress < 100)} canWatch={canWatch} onOpen={setOpenId} />
            <Row title={t("newest")} items={items.filter((v) => v.isNew)} canWatch={canWatch} onOpen={setOpenId} />
            {cats.map((c) => (
              <Row key={c.slug} title={c.name} items={items.filter((v) => v.category === c.slug)} canWatch={canWatch} onOpen={setOpenId} />
            ))}
          </>
        )}
      </div>

      {open && (
        <PlayerDialog
          v={open}
          canWatch={canWatch}
          live={live}
          fav={favorites.includes(open.id)}
          onFav={() => toggleFav(open.id)}
          onClose={() => setOpenId(null)}
          locale={locale}
        />
      )}
    </div>
  );
}

function Row(props: { title: string; items: LibItem[]; canWatch: boolean; onOpen: (id: string) => void }) {
  if (!props.items.length) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold">{props.title}</h2>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {props.items.map((v) => (
          <li key={v.id} className="w-[72vw] shrink-0 snap-start sm:w-[300px]">
            <Card v={v} canWatch={props.canWatch} onOpen={props.onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ v, canWatch, onOpen }: { v: LibItem; canWatch: boolean; onOpen: (id: string) => void }) {
  const tc = useTranslations("common");
  return (
    <button type="button" onClick={() => onOpen(v.id)} className="group block w-full text-left">
      <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10 transition-shadow group-hover:ring-sun-400/60">
        <VideoThumb hue={hueOf(v.category)} character={v.character} className={clsx("transition-transform duration-500 group-hover:scale-[1.04]", !canWatch && "opacity-70")} />
        {!canWatch && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-navy-950/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <Lock size={11} aria-hidden />
            {tc("locked")}
          </span>
        )}
        {v.progress !== undefined && v.progress > 0 && v.progress < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" role="progressbar" aria-valuenow={v.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-sun-400" style={{ width: `${v.progress}%` }} />
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-sun-300">{v.categoryName}</p>
      <h3 className="mt-0.5 font-semibold group-hover:underline">{v.title}</h3>
      <p className="mt-1 text-sm text-white/55">{tc("minutes", { count: v.minutes })}</p>
    </button>
  );
}

function PlayerDialog(props: {
  v: LibItem;
  canWatch: boolean;
  live?: LibraryLive;
  fav: boolean;
  onFav: () => void;
  onClose: () => void;
  locale: string;
}) {
  const { v, canWatch, live } = props;
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

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
      <div className="relative aspect-video bg-black">
        {canWatch && live ? (
          <RealPlayer videoId={v.id} durationSeconds={v.durationSeconds} startPercent={v.progress} />
        ) : (
          <>
            <VideoThumb hue={hueOf(v.category)} character={v.character} className={canWatch ? "" : "opacity-40 blur-[2px]"} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-950/40 p-6 text-center">
              {canWatch ? (
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
                  <p className="max-w-md text-sm text-white/75">{live && !live.signedIn ? t("lockedSignIn") : t("lockedBody")}</p>
                  <Link href={live && !live.signedIn ? "/login" : "/#pricing"} className="btn-3d mt-2">
                    {live && !live.signedIn ? <LogIn size={18} aria-hidden /> : null}
                    {live && !live.signedIn ? tc("signIn") : t("lockedCta")}
                  </Link>
                </>
              )}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={tc("close")}
          className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-navy-950/70 hover:bg-navy-950"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div className="min-w-0">
          <p className="text-sm text-sun-300">{v.categoryName}</p>
          <h2 id="player-title" className="mt-1 font-serif text-2xl font-bold">{v.title}</h2>
          {v.summary && <p className="mt-3 text-white/75">{v.summary}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-1">
          <div>
            <dt className="text-white/50">{t("duration")}</dt>
            <dd>{tc("minutes", { count: v.minutes })}</dd>
          </div>
          {v.subtitles.length > 0 && (
            <div>
              <dt className="text-white/50">{t("subtitles")}</dt>
              <dd>{v.subtitles.map((s) => localeNames[s as Locale]).join(", ")}</dd>
            </div>
          )}
          {(!live || live.signedIn) && (
            <div className="col-span-2 sm:col-span-1">
              <button type="button" onClick={props.onFav} aria-pressed={props.fav} className="inline-flex min-h-11 items-center gap-2 text-sun-300 hover:text-sun-200">
                <Heart size={17} aria-hidden className={props.fav ? "fill-sun-400" : ""} />
                {props.fav ? t("removeFavorite") : t("addFavorite")}
              </button>
            </div>
          )}
        </dl>
      </div>
    </dialog>
  );
}

/** Fetches a short-lived playback link from the server, plays it, and saves progress every 10 seconds. */
function RealPlayer({ videoId, durationSeconds, startPercent }: { videoId: string; durationSeconds: number; startPercent?: number }) {
  const t = useTranslations("library");
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);
  const retried = useRef(false);

  const load = useCallback(async () => {
    setFailed(null);
    const res = await fetch(`/api/videos/${videoId}/play`, { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return setFailed(body.error === "locked" ? "playLocked" : "playError");
    }
    setSrc(((await res.json()) as { url: string }).url);
  }, [videoId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (force = false) => {
      const el = videoRef.current;
      if (!el || !Number.isFinite(el.duration)) return;
      const now = Math.floor(el.currentTime);
      if (!force && Math.abs(now - lastSaved.current) < 10) return;
      lastSaved.current = now;
      const { createClient } = await import("@/lib/supabase/browser");
      await createClient().rpc("record_progress", { p_video: videoId, p_seconds: now, p_duration: Math.floor(el.duration) });
    },
    [videoId],
  );

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-white/80">{t(failed)}</p>
        <button type="button" onClick={load} className="btn-ghost text-white hover:bg-white/10">{t("retry")}</button>
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-sun-300" size={32} aria-label={t("loading")} />
      </div>
    );
  }
  return (
    <video
      ref={videoRef}
      src={src}
      controls
      autoPlay
      playsInline
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="h-full w-full"
      onLoadedMetadata={async (e) => {
        const el = e.currentTarget;
        if (startPercent && startPercent < 95 && Number.isFinite(el.duration)) el.currentTime = (el.duration * startPercent) / 100;
        if (durationSeconds === 0 && Number.isFinite(el.duration)) {
          const { createClient } = await import("@/lib/supabase/browser");
          await createClient().rpc("set_video_duration", { p_video: videoId, p_duration: Math.round(el.duration) });
        }
      }}
      onTimeUpdate={() => save()}
      onPause={() => save(true)}
      onEnded={() => save(true)}
      // A link can expire during a long session: fetch a fresh one once, then show the error.
      onError={() => {
        if (retried.current) return setFailed("playError");
        retried.current = true;
        load();
      }}
    />
  );
}
