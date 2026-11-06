"use client";

import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";
import { useSite } from "./site-context";
import { EditableImage } from "./edit-context";

/**
 * Golden-hour scene standing in for the GAIA V8 key visual.
 * Eight backlit figures mark where the official characters go; swap via Admin later.
 */
const FIGURES = [
  { x: 150, h: 150, w: 44 },
  { x: 225, h: 172, w: 48 },
  { x: 305, h: 160, w: 46 },
  { x: 380, h: 184, w: 50 },
  { x: 460, h: 178, w: 50 },
  { x: 538, h: 158, w: 46 },
  { x: 612, h: 170, w: 48 },
  { x: 688, h: 148, w: 44 },
];

export function HeroArt() {
  const ta = useTranslations("admin");
  return (
    <EditableImage path="heroImageUrl" label={ta("cmsHeroImage")} className="rounded-[28px]">
      <HeroImage />
    </EditableImage>
  );
}

function HeroImage() {
  const t = useTranslations("common");
  const { heroImageUrl, heroFit, heroFocus } = useSite();
  if (heroImageUrl) {
    const focus = heroFocus === "left" ? "object-left" : heroFocus === "right" ? "object-right" : "object-center";
    return (
      <figure className="relative overflow-hidden rounded-[28px] bg-navy-900 shadow-[0_40px_80px_-30px_rgb(13_26_58/0.6)] ring-1 ring-navy-900/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImageUrl}
          alt="GAIA"
          fetchPriority="high"
          decoding="async"
          className={heroFit === "crop" ? `block aspect-[840/520] w-full object-cover ${focus}` : "block h-auto w-full"}
        />
      </figure>
    );
  }
  return (
    <figure className="relative overflow-hidden rounded-[28px] bg-navy-900 shadow-[0_40px_80px_-30px_rgb(13_26_58/0.6)] ring-1 ring-navy-900/10">
      <svg viewBox="0 0 840 520" className="block h-auto w-full" role="img" aria-label={t("placeholderArt")}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16264F" />
            <stop offset="0.38" stopColor="#4A4F86" />
            <stop offset="0.62" stopColor="#EE9A78" />
            <stop offset="0.8" stopColor="#F7D58A" />
          </linearGradient>
          <radialGradient id="glow" cx="0.5" cy="0.72" r="0.55">
            <stop offset="0" stopColor="#FFF4D6" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#F7D58A" stopOpacity="0.55" />
            <stop offset="1" stopColor="#F7D58A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16264F" />
            <stop offset="1" stopColor="#070F26" />
          </linearGradient>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F7D58A" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFE7AE" stopOpacity="0.9" />
            <stop offset="1" stopColor="#F7D58A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="840" height="520" fill="url(#sky)" />
        <rect width="840" height="520" fill="url(#glow)" />
        <circle cx="420" cy="372" r="92" fill="#FFF1C9" />
        {/* far city */}
        <path
          d="M0 372 h40 v-28 h22 v18 h30 v-40 h26 v50 h34 v-22 h28 v32 h40 v-56 h18 v-12 h14 v68 h44 v-26 h30 v26 h50 v-14 h36 v-38 h24 v52 h40 v-30 h30 v30 h46 v-48 h20 v48 h38 v-20 h34 v20 h30 v-34 h28 v34 h40 v-16 h40 V520 H0Z"
          fill="#2B3566"
          opacity="0.55"
        />
        {/* ridge */}
        <path d="M0 410 Q210 380 420 392 T840 404 V520 H0Z" fill="url(#ground)" />
        <path d="M0 410 Q210 380 420 392 T840 404" fill="none" stroke="url(#rim)" strokeWidth="2.5" />
        {FIGURES.map((f, i) => {
          const base = 398 + Math.abs(i - 3.5) * 2.2;
          const head = f.w * 0.36;
          return (
            <g key={i}>
              <path
                d={`M${f.x - f.w / 2} ${base} C${f.x - f.w / 2} ${base - f.h * 0.55}, ${f.x - f.w * 0.36} ${base - f.h + head * 2.2}, ${f.x} ${base - f.h + head * 2.1} C${f.x + f.w * 0.36} ${base - f.h + head * 2.2}, ${f.x + f.w / 2} ${base - f.h * 0.55}, ${f.x + f.w / 2} ${base} Z`}
                fill="#0B1533"
              />
              <circle cx={f.x} cy={base - f.h + head} r={head} fill="#0B1533" />
              <circle cx={f.x} cy={base - f.h + head} r={head} fill="none" stroke="#FFE7AE" strokeOpacity="0.55" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
      <figcaption className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-navy-950/70 px-3 py-1.5 text-[12px] text-white/85 backdrop-blur">
        <ImageIcon size={13} aria-hidden />
        {t("placeholderArt")}
      </figcaption>
    </figure>
  );
}
