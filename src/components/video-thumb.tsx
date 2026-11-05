import clsx from "clsx";

/** Generated thumbnail art (no external images) so the prototype stays self-contained. */
export function VideoThumb({ hue, character, className, cover = false }: { hue: number; character: string; className?: string; cover?: boolean }) {
  const id = `t-${hue}-${character}`;
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio={cover ? "xMidYMid slice" : undefined} className={clsx("block h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 55% 22%)`} />
          <stop offset="0.65" stopColor={`hsl(${(hue + 25) % 360} 60% 40%)`} />
          <stop offset="1" stopColor="#F0BC55" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-bg)`} />
      <circle cx="248" cy="132" r="54" fill="#FFF1C9" opacity="0.85" />
      <path d="M0 150 Q160 128 320 146 V180 H0Z" fill="#070F26" opacity="0.85" />
      <g fill="#070F26">
        <circle cx="96" cy="78" r="16" />
        <path d="M70 152 C70 112, 80 98, 96 98 C112 98, 122 112, 122 152 Z" />
      </g>
      <text x="20" y="40" fill="#FFF" fillOpacity="0.85" fontSize="15" fontWeight="600" letterSpacing="0.5">
        {character}
      </text>
    </svg>
  );
}
