import { defineRouting } from "next-intl/routing";

export const locales = ["ja", "vi", "en", "my", "id", "si", "km"] as const;
export type Locale = (typeof locales)[number];

/** Locales whose UI text is an AI draft awaiting review by a native speaker. */
export const draftLocales: readonly Locale[] = ["my", "id", "si", "km"];

export const localeNames: Record<Locale, string> = {
  ja: "日本語",
  vi: "Tiếng Việt",
  en: "English",
  my: "မြန်မာ",
  id: "Bahasa Indonesia",
  si: "සිංහල",
  km: "ខ្មែរ",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "ja",
  localePrefix: "always",
});
