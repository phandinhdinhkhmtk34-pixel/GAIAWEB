/**
 * Editable site content (Admin → サイト編集). Stored as JSON in site_content (key "site", locale "*"):
 * `draft` is what admins edit; `published` is what visitors see. Empty fields fall back to the built-in text.
 */
export type L10nText = { ja?: string; vi?: string; en?: string };

export interface SiteCharacter {
  name: string;
  imageUrl: string | null;
  role: L10nText;
}

export type HeroFit = "full" | "crop";
export type HeroFocus = "left" | "center" | "right";

export interface SiteContent {
  logoUrl: string | null;
  /** Logo height in the header, in pixels. */
  logoHeight: number;
  heroImageUrl: string | null;
  /** "full" shows the whole image at its own proportions; "crop" fills the frame and trims the edges. */
  heroFit: HeroFit;
  heroFocus: HeroFocus;
  heroTitle: L10nText;
  heroLead: L10nText;
  introTitle: L10nText;
  introBody: L10nText;
  footerAbout: L10nText;
  characters: SiteCharacter[];
  company: { name: string; address: string; email: string; phone: string };
  prices: { baseMonthly: number; seatMonthly: number; baseAnnual: number; seatAnnual: number };
}

export const DEFAULT_CHARACTER_NAMES = ["Hikari", "Sora", "Ren", "Aoi", "Kaito", "Mei", "Daichi", "Yui"];

export const emptySiteContent = (): SiteContent => ({
  logoUrl: null,
  logoHeight: 44,
  heroImageUrl: null,
  heroFit: "full",
  heroFocus: "center",
  heroTitle: {},
  heroLead: {},
  introTitle: {},
  introBody: {},
  footerAbout: {},
  characters: DEFAULT_CHARACTER_NAMES.map((name) => ({ name, imageUrl: null, role: {} })),
  company: { name: "", address: "", email: "", phone: "" },
  prices: { baseMonthly: 30000, seatMonthly: 3000, baseAnnual: 300000, seatAnnual: 30000 },
});

/** Merge stored JSON over the defaults, keeping types sane whatever was saved. */
export function normalizeSiteContent(raw: unknown): SiteContent {
  const d = emptySiteContent();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<SiteContent>;
  const text = (v: unknown): L10nText => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    return { ja: str(o.ja), vi: str(o.vi), en: str(o.en) };
  };
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 2000) : "");
  const url = (v: unknown) => (typeof v === "string" && /^https:\/\//.test(v) ? v : null);
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10_000_000 ? v : fallback);
  const chars = Array.isArray(r.characters) ? r.characters : [];
  return {
    logoUrl: url(r.logoUrl),
    logoHeight: typeof r.logoHeight === "number" && r.logoHeight >= 28 && r.logoHeight <= 80 ? Math.round(r.logoHeight) : d.logoHeight,
    heroImageUrl: url(r.heroImageUrl),
    heroFit: r.heroFit === "crop" ? "crop" : "full",
    heroFocus: r.heroFocus === "left" || r.heroFocus === "right" ? r.heroFocus : "center",
    heroTitle: text(r.heroTitle),
    heroLead: text(r.heroLead),
    introTitle: text(r.introTitle),
    introBody: text(r.introBody),
    footerAbout: text(r.footerAbout),
    characters: d.characters.map((def, i) => {
      const c = (chars[i] ?? {}) as Partial<SiteCharacter>;
      return { name: str(c.name) || def.name, imageUrl: url(c.imageUrl), role: text(c.role) };
    }),
    company: {
      name: str(r.company?.name),
      address: str(r.company?.address),
      email: str(r.company?.email),
      phone: str(r.company?.phone),
    },
    prices: {
      baseMonthly: num(r.prices?.baseMonthly, d.prices.baseMonthly),
      seatMonthly: num(r.prices?.seatMonthly, d.prices.seatMonthly),
      baseAnnual: num(r.prices?.baseAnnual, d.prices.baseAnnual),
      seatAnnual: num(r.prices?.seatAnnual, d.prices.seatAnnual),
    },
  };
}

/** The text in the viewer's language, or null so the caller uses its built-in translation. */
export function pickText(t: L10nText, locale: string): string | null {
  const v = (t as Record<string, string | undefined>)[locale];
  return v && v.trim() ? v : null;
}
