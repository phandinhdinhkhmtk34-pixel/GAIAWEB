import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

/** Fill keys missing from a draft translation with English so the UI never shows raw keys. */
function mergeDeep(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && baseValue && typeof baseValue === "object"
        ? mergeDeep(baseValue as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const own = (await import(`../../messages/${locale}.json`)).default as Messages;
  return {
    locale,
    messages: locale === "en" ? own : mergeDeep(en as Messages, own),
    timeZone: "Asia/Tokyo",
  };
});
