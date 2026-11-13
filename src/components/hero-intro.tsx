"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownRight, PlayCircle, X } from "lucide-react";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { youtubeId } from "@/lib/site-content";
import { Editable, useEdit } from "./edit-context";

/**
 * A headline that breaks only between phrases: each line ("\n") becomes a block, and Japanese text
 * is split after 、。！？ so a line that does not fit wraps at a natural pause, never mid-word.
 */
function Phrased({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line.split(/(?<=[、。！？])/).map((seg, j) => (
            <span key={j} className="inline-block">{seg}</span>
          ))}
        </span>
      ))}
    </>
  );
}

/** The page's single orchestrated entrance: headline, tagline, lead and actions rise in sequence. */
export function HeroIntro({
  title,
  lead,
  tagline,
  video,
  align = "left",
  onDark = false,
}: {
  title?: string;
  lead?: string;
  tagline?: string;
  video?: string | null;
  align?: "left" | "center";
  onDark?: boolean;
}) {
  const center = align === "center";
  const edit = useEdit();
  const ta = useTranslations("admin");
  const t = useTranslations("home");
  // One staggered entrance (CSS, disabled for reduced motion in globals.css).
  const item = (i: number) => ({ style: { animationDelay: `${0.1 + i * 0.12}s` } as React.CSSProperties });
  const heading = title ?? t("heroTitle");
  const sub = tagline ?? t("heroTagline");
  const videoId = video ? youtubeId(video) : null;
  const ghost = clsx("btn-ghost", onDark ? "text-white hover:bg-white hover:text-navy-900" : "text-navy-900 hover:bg-navy-900 hover:text-white");

  return (
    <div className={clsx(center && "text-center")}>
      <h1
        {...item(0)}
        className={clsx(
          "rise",
          "font-serif text-[1.85rem] leading-[1.35] font-bold sm:text-[2.6rem] lg:text-[2.2rem] lg:leading-[1.45] xl:text-[2.3rem]",
          onDark ? "text-white" : "text-navy-900",
        )}
      >
        {edit ? (
          <Editable path="heroTitle" multiline label={ta("fieldHeroTitle")} value={heading} className="whitespace-pre-line" />
        ) : (
          <Phrased text={heading} />
        )}
      </h1>
      {(sub || edit) && (
        <p
          {...item(1)}
          className={clsx(
            "rise mt-5 font-serif text-xl font-bold sm:text-2xl",
            onDark ? "text-sun-300" : "text-sun-700",
          )}
        >
          {edit ? <Editable path="heroTagline" label={ta("fieldHeroTagline")} value={sub} /> : sub}
        </p>
      )}
      <p {...item(2)} className={clsx("rise mt-5 max-w-[34rem] text-lg leading-relaxed", onDark ? "text-white/85" : "text-navy-900/75", center && "mx-auto")}>
        {edit ? <Editable path="heroLead" multiline label={ta("fieldHeroLead")} value={lead ?? t("heroLead")} /> : (lead ?? t("heroLead"))}
      </p>
      <div {...item(3)} className={clsx("rise mt-9 flex flex-wrap items-center gap-4", center && "justify-center")}>
        <Link href="/#pricing" className="btn-3d text-base">
          {t("heroPrimary")}
          <ArrowDownRight size={18} aria-hidden />
        </Link>
        {videoId ? (
          <IntroVideo id={videoId} className={ghost} />
        ) : (
          <Link href="/library" className={ghost}>
            <PlayCircle size={19} aria-hidden />
            {t("heroSecondary")}
          </Link>
        )}
      </div>
      <p {...item(4)} className={clsx("rise mt-5 text-sm", onDark ? "text-white/70" : "text-navy-900/70")}>
        {t("heroNote")}
      </p>
    </div>
  );
}

/** Button that plays the YouTube intro in a modal; the player loads only once it is opened. */
function IntroVideo({ id, className }: { id: string; className: string }) {
  const t = useTranslations("home");
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => ref.current?.close();
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        <PlayCircle size={19} aria-hidden />
        {t("heroSecondary")}
      </button>
      <dialog
        ref={ref}
        aria-label={t("introVideoTitle")}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(960px,calc(100vw-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-navy-950/80 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <button
            type="button"
            onClick={close}
            className="absolute -top-12 right-0 flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
          >
            <X size={18} aria-hidden />
            {t("introVideoClose")}
          </button>
          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
            {open && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                title={t("introVideoTitle")}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
