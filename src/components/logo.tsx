"use client";

import { useId } from "react";
import { useSite } from "./site-context";
import clsx from "clsx";

/** Placeholder wordmark until the official GAIA logo file is supplied (Admin → site content). */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  // Unique per instance: a hidden copy of the logo must not own the gradient the visible one uses.
  const gid = `logo-sun-${useId().replace(/:/g, "")}`;
  const { logoUrl } = useSite();
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="GAIA LEARNING" className={clsx("block h-10 w-auto max-w-[180px] object-contain", className)} />;
  }
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7D58A" />
            <stop offset="1" stopColor="#E2A030" />
          </linearGradient>
        </defs>
        <rect width="34" height="34" rx="9" fill={dark ? "#16264F" : "#0D1A3A"} />
        <circle cx="17" cy="19" r="8" fill={`url(#${gid})`} />
        <rect x="5" y="20" width="24" height="9" fill={dark ? "#16264F" : "#0D1A3A"} />
        <path d="M6 20.5h22" stroke="#F7D58A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className={clsx("block font-serif text-[17px] font-bold tracking-wide", dark ? "text-white" : "text-navy-900")}>GAIA</span>
        <span className={clsx("block text-[10px] font-semibold tracking-[0.2em]", dark ? "text-sun-300" : "text-sun-700")}>LEARNING</span>
      </span>
    </span>
  );
}
