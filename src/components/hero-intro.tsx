"use client";

import { useTranslations } from "next-intl";
import { ArrowDownRight, PlayCircle } from "lucide-react";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Editable, useEdit } from "./edit-context";

/** The page's single orchestrated entrance: headline, lead and actions rise in sequence. */
export function HeroIntro({
  title,
  lead,
  align = "left",
  onDark = false,
}: {
  title?: string;
  lead?: string;
  align?: "left" | "center";
  onDark?: boolean;
}) {
  const center = align === "center";
  const edit = useEdit();
  const ta = useTranslations("admin");
  const t = useTranslations("home");
  // One staggered entrance (CSS, disabled for reduced motion in globals.css).
  const item = (i: number) => ({ style: { animationDelay: `${0.1 + i * 0.12}s` } as React.CSSProperties });

  return (
    <div className={clsx(center && "text-center")}>
      <h1
        {...item(0)}
        className={clsx(
          "rise",
          "font-serif text-[2.35rem] leading-[1.25] font-bold sm:text-5xl lg:text-[3.6rem] lg:leading-[1.18]",
          onDark ? "text-white" : "text-navy-900",
        )}
      >
        {edit ? <Editable path="heroTitle" label={ta("fieldHeroTitle")} value={title ?? t("heroTitle")} /> : (title ?? t("heroTitle"))}
      </h1>
      <p {...item(1)} className={clsx("rise mt-6 max-w-[34rem] text-lg leading-relaxed", onDark ? "text-white/85" : "text-navy-900/75", center && "mx-auto")}>
        {edit ? <Editable path="heroLead" multiline label={ta("fieldHeroLead")} value={lead ?? t("heroLead")} /> : (lead ?? t("heroLead"))}
      </p>
      <div {...item(2)} className={clsx("rise mt-9 flex flex-wrap items-center gap-4", center && "justify-center")}>
        <Link href="/#pricing" className="btn-3d text-base">
          {t("heroPrimary")}
          <ArrowDownRight size={18} aria-hidden />
        </Link>
        <Link href="/library" className={clsx("btn-ghost", onDark ? "text-white hover:bg-white hover:text-navy-900" : "text-navy-900 hover:bg-navy-900 hover:text-white")}>
          <PlayCircle size={19} aria-hidden />
          {t("heroSecondary")}
        </Link>
      </div>
      <p {...item(3)} className={clsx("rise mt-5 text-sm", onDark ? "text-white/70" : "text-navy-900/70")}>
        {t("heroNote")}
      </p>
    </div>
  );
}
