/**
 * Number and date formatting.
 * Node's and the browser's ICU data differ for Burmese, Sinhala and Khmer (digits, month names),
 * which breaks React hydration. Those locales format with Latin digits in English style;
 * the others use their own conventions, which match between server and client.
 */
const FORMAT_LOCALE: Record<string, string> = {
  ja: "ja-JP",
  vi: "vi-VN",
  en: "en-US",
  id: "id-ID",
};

const fmt = (locale: string) => FORMAT_LOCALE[locale] ?? "en-US";

export function formatYen(amount: number, locale: string) {
  return new Intl.NumberFormat(fmt(locale), {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  }).format(amount);
}

export function formatNumber(n: number, locale: string) {
  return new Intl.NumberFormat(fmt(locale), { numberingSystem: "latn" }).format(n);
}

export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(fmt(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tokyo",
    numberingSystem: "latn",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(fmt(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
    numberingSystem: "latn",
  }).format(new Date(iso));
}
