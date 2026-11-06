"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { ImagePlus, Loader2, Trash2, ExternalLink, Save, Send } from "lucide-react";
import { createSiteImageUploadAction, publishSiteAction, saveSiteDraftAction } from "@/lib/admin-actions";
import type { L10nText, SiteContent } from "@/lib/site-content";

type Lang = "ja" | "vi" | "en";
const LANGS: { id: Lang; label: string }[] = [
  { id: "ja", label: "日本語" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
];

const field = "mt-1.5 w-full rounded-lg border border-navy-900/20 bg-white px-3 py-2.5 text-sm focus:border-navy-700 focus:outline-none";

/** Upload one image to the public site bucket and return its URL. */
async function uploadSiteImage(file: File): Promise<{ url: string } | { error: string }> {
  const ticket = await createSiteImageUploadAction({ type: file.type, size: file.size });
  if ("error" in ticket) return { error: ticket.error ?? "generic" };
  const { createClient } = await import("@/lib/supabase/browser");
  const { error } = await createClient().storage.from("site").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  return error ? { error: "upload" } : { url: ticket.publicUrl };
}

function ImageField({
  label,
  hint,
  url,
  onChange,
  aspect = "aspect-video",
}: {
  label: string;
  hint?: string;
  url: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
}) {
  const t = useTranslations("admin");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-navy-900/55">{hint}</p>}
      <div className="mt-2 flex items-end gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={`${t("imageChoose")}: ${label}`}
          className={clsx(
            "relative flex w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-navy-900/25 bg-sky-50 text-navy-900/50 hover:border-navy-900/50",
            aspect,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" /> : null}
          <span className={clsx("relative flex items-center justify-center rounded-full p-2", url && "bg-navy-950/55 text-white")}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ImagePlus size={18} aria-hidden />}
          </span>
        </button>
        {url && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 text-xs font-semibold text-seal hover:bg-seal/5">
            <Trash2 size={14} aria-hidden />
            {t("imageRemove")}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setErr(null);
          const res = await uploadSiteImage(f);
          setBusy(false);
          if ("error" in res) return setErr(res.error === "imageSize" ? t("imageSize") : res.error === "imageType" ? t("imageType") : t("videoUploadFailed"));
          onChange(res.url);
        }}
      />
      {err && <p role="alert" className="mt-1 text-xs text-seal">{err}</p>}
    </div>
  );
}

export function SiteEditor({ initial, canEditPrices }: { initial: SiteContent; canEditPrices: boolean }) {
  const t = useTranslations("admin");
  const th = useTranslations("home");
  const locale = useLocale();
  const [c, setC] = useState<SiteContent>(initial);
  const [lang, setLang] = useState<Lang>("ja");
  const [busy, setBusy] = useState<null | "save" | "publish">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<SiteContent>) => {
    setC((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const text = (key: "heroTitle" | "heroLead" | "introTitle" | "introBody" | "footerAbout") => ({
    value: c[key][lang] ?? "",
    onChange: (v: string) => update({ [key]: { ...c[key], [lang]: v } as L10nText }),
  });
  // Built-in text shown as the placeholder, so editors see what an empty field falls back to.
  const fallback: Record<string, string> = {
    heroTitle: th("heroTitle"),
    heroLead: th("heroLead"),
    introTitle: th("introTitle"),
    introBody: th("introBody"),
    footerAbout: th("footerAbout"),
  };

  async function run(kind: "save" | "publish") {
    setBusy(kind);
    setMsg(null);
    const res = kind === "save" ? await saveSiteDraftAction({ content: c, locale }) : await publishSiteAction({ content: c, locale });
    setBusy(null);
    if ("error" in res) {
      return setMsg({ ok: false, text: res.error === "pricesSuperOnly" ? t("pricesSuperOnly") : t("errGeneric") });
    }
    setDirty(false);
    setMsg({ ok: true, text: kind === "save" ? t("draftSavedLive") : t("publishedLive") });
  }

  const section = "rounded-2xl border border-navy-900/10 bg-white p-6";
  // A plain render function (not a nested component) so the textarea keeps focus while typing.
  const textArea = (k: "heroTitle" | "heroLead" | "introTitle" | "introBody" | "footerAbout", rows: number, label: string) => {
    const f = text(k);
    return (
      <div>
        <label htmlFor={`cms-${k}`} className="text-sm font-medium">{label}</label>
        <textarea id={`cms-${k}`} rows={rows} value={f.value} placeholder={fallback[k]} onChange={(e) => f.onChange(e.target.value)} className={field} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-navy-900/10 bg-white/95 p-4 backdrop-blur">
        <div role="tablist" aria-label={t("textLanguage")} className="inline-flex rounded-lg bg-sky-100 p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={lang === l.id}
              onClick={() => setLang(l.id)}
              className={clsx("min-h-10 rounded-md px-3 text-sm font-semibold", lang === l.id ? "bg-navy-900 text-white" : "text-navy-900/65")}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-navy-900/55">{t("textLanguageHint")}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && <span className="text-xs text-sun-700">{t("unsaved")}</span>}
          <button type="button" onClick={() => run("save")} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-navy-900/20 px-4 text-sm font-semibold hover:bg-sky-100 disabled:opacity-60">
            {busy === "save" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
            {t("saveDraft")}
          </button>
          <a href={`/${locale}/admin/preview`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-navy-900/20 px-4 text-sm font-semibold hover:bg-sky-100">
            <ExternalLink size={16} aria-hidden />
            {t("preview")}
          </a>
          <button type="button" onClick={() => run("publish")} disabled={busy !== null} className="btn-3d min-h-11 disabled:opacity-60">
            {busy === "publish" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
            {t("publish")}
          </button>
        </div>
        {msg && <p role="status" className={clsx("basis-full text-sm", msg.ok ? "text-leaf" : "text-seal")}>{msg.text}</p>}
        <p className="basis-full text-xs text-navy-900/50">{t("previewHint")}</p>
      </div>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsBrand")}</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <ImageField label={t("cmsLogo")} hint={t("cmsLogoHint")} url={c.logoUrl} onChange={(logoUrl) => update({ logoUrl })} aspect="aspect-[3/1]" />
          <ImageField label={t("cmsHeroImage")} hint={t("cmsHeroImageHint")} url={c.heroImageUrl} onChange={(heroImageUrl) => update({ heroImageUrl })} />
        </div>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsHomeTexts")}</h2>
        <div className="mt-4 grid gap-4">
          {textArea("heroTitle", 2, t("fieldHeroTitle"))}
          {textArea("heroLead", 3, t("fieldHeroLead"))}
          {textArea("introTitle", 2, t("cmsIntroTitle"))}
          {textArea("introBody", 4, t("cmsIntroBody"))}
        </div>
        <p className="mt-3 text-xs text-navy-900/50">{t("cmsEmptyHint")}</p>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsCharacters")}</h2>
        <ul className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {c.characters.map((ch, i) => (
            <li key={i} className="space-y-3 rounded-xl bg-sky-50 p-4">
              <ImageField
                label={t("cmsCharacterN", { n: i + 1 })}
                url={ch.imageUrl}
                aspect="aspect-[3/4]"
                onChange={(imageUrl) => update({ characters: c.characters.map((x, j) => (j === i ? { ...x, imageUrl } : x)) })}
              />
              <div>
                <label htmlFor={`ch-name-${i}`} className="text-xs font-medium">{t("cmsCharacterName")}</label>
                <input id={`ch-name-${i}`} value={ch.name} onChange={(e) => update({ characters: c.characters.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={field} />
              </div>
              <div>
                <label htmlFor={`ch-role-${i}`} className="text-xs font-medium">{t("cmsCharacterRole")} ({LANGS.find((l) => l.id === lang)?.label})</label>
                <input id={`ch-role-${i}`} value={ch.role[lang] ?? ""} onChange={(e) => update({ characters: c.characters.map((x, j) => (j === i ? { ...x, role: { ...x.role, [lang]: e.target.value } } : x)) })} className={field} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsCompany")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["name", "phone", "email", "address"] as const).map((k) => (
            <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
              <label htmlFor={`co-${k}`} className="text-sm font-medium">{t(`cmsCompany_${k}`)}</label>
              <input id={`co-${k}`} value={c.company[k]} onChange={(e) => update({ company: { ...c.company, [k]: e.target.value } })} className={field} />
            </div>
          ))}
          <div className="sm:col-span-2">
            {textArea("footerAbout", 2, t("cmsFooterAbout"))}
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsPrices")}</h2>
        <p className="mt-1 text-sm text-navy-900/60">{canEditPrices ? t("cmsPricesHint") : t("pricesSuperOnly")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["baseMonthly", t("cmsBaseMonthly")],
              ["seatMonthly", t("cmsSeatMonthly")],
              ["baseAnnual", t("cmsBaseAnnual")],
              ["seatAnnual", t("cmsSeatAnnual")],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label htmlFor={`pr-${k}`} className="text-sm font-medium">{label}</label>
              <input
                id={`pr-${k}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                disabled={!canEditPrices}
                value={c.prices[k]}
                onChange={(e) => update({ prices: { ...c.prices, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) } })}
                className={clsx(field, "tabular-nums disabled:bg-sky-50 disabled:text-navy-900/50")}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
