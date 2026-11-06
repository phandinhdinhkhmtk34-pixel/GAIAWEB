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
export type HeroLayout = "textLeft" | "imageLeft" | "overlay";
export type TextAlign = "left" | "center";

/** Homepage sections below the banner, in display order. The banner always comes first. */
export const HOME_SECTIONS = ["intro", "features", "characters", "featured", "categories", "pricing"] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];
export interface HomeSection {
  id: HomeSectionId;
  visible: boolean;
}
export type HeroFocus = "left" | "center" | "right";

export interface SiteContent {
  logoUrl: string | null;
  /** Logo height in the header, in pixels. */
  logoHeight: number;
  heroImageUrl: string | null;
  /** "full" shows the whole image at its own proportions; "crop" fills the frame and trims the edges. */
  heroFit: HeroFit;
  heroFocus: HeroFocus;
  heroLayout: HeroLayout;
  heroAlign: TextAlign;
  sections: HomeSection[];
  heroTitle: L10nText;
  heroLead: L10nText;
  introTitle: L10nText;
  introBody: L10nText;
  footerAbout: L10nText;
  characters: SiteCharacter[];
  company: { name: string; address: string; email: string; phone: string };
  prices: { baseMonthly: number; seatMonthly: number; baseAnnual: number; seatAnnual: number };
  /** Legal pages, written in Japanese (the governing language). Plain text: "## " starts a heading, "| a | b |" a table row. */
  legal: Record<LegalSlug, string>;
}

export const LEGAL_SLUGS = ["tokushoho", "privacy", "terms"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const DEFAULT_CHARACTER_NAMES = ["Hikari", "Sora", "Ren", "Aoi", "Kaito", "Mei", "Daichi", "Yui"];

export const emptySiteContent = (): SiteContent => ({
  logoUrl: null,
  logoHeight: 44,
  heroImageUrl: null,
  heroFit: "full",
  heroFocus: "center",
  heroLayout: "textLeft",
  heroAlign: "left",
  sections: HOME_SECTIONS.map((id) => ({ id, visible: true })),
  heroTitle: {},
  heroLead: {},
  introTitle: {},
  introBody: {},
  footerAbout: {},
  characters: DEFAULT_CHARACTER_NAMES.map((name) => ({ name, imageUrl: null, role: {} })),
  company: { name: "", address: "", email: "", phone: "" },
  prices: { baseMonthly: 30000, seatMonthly: 3000, baseAnnual: 300000, seatAnnual: 30000 },
  legal: { tokushoho: "", privacy: "", terms: "" },
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
    heroLayout: r.heroLayout === "imageLeft" || r.heroLayout === "overlay" ? r.heroLayout : "textLeft",
    heroAlign: r.heroAlign === "center" ? "center" : "left",
    sections: normalizeSections(r.sections),
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
    legal: {
      tokushoho: typeof r.legal?.tokushoho === "string" ? r.legal.tokushoho.slice(0, 40000) : "",
      privacy: typeof r.legal?.privacy === "string" ? r.legal.privacy.slice(0, 40000) : "",
      terms: typeof r.legal?.terms === "string" ? r.legal.terms.slice(0, 40000) : "",
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

/** Keep every known section exactly once, in the saved order, adding any new ones at the end. */
function normalizeSections(raw: unknown): HomeSection[] {
  const seen = new Set<string>();
  const out: HomeSection[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id === "string" && (HOME_SECTIONS as readonly string[]).includes(id) && !seen.has(id)) {
      seen.add(id);
      out.push({ id: id as HomeSectionId, visible: (item as { visible?: unknown }).visible !== false });
    }
  }
  for (const id of HOME_SECTIONS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}
