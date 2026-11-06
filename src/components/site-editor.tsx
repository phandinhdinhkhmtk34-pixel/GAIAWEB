"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { ImagePlus, Loader2, Trash2, ExternalLink, Save, Send, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { createSiteImageUploadAction, publishSiteAction, saveSiteDraftAction } from "@/lib/admin-actions";
import type { HeroLayout, HomeSection, L10nText, LegalSlug, SiteContent } from "@/lib/site-content";
import { LEGAL_TEMPLATES } from "@/lib/legal-templates";

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
          <div className="space-y-4">
            <ImageField label={t("cmsLogo")} hint={t("cmsLogoHint")} url={c.logoUrl} onChange={(logoUrl) => update({ logoUrl })} aspect="aspect-[3/1]" />
            <div>
              <label htmlFor="logo-size" className="text-sm font-medium">
                {t("cmsLogoSize")}: <span className="tabular-nums">{c.logoHeight}px</span>
              </label>
              <input
                id="logo-size"
                type="range"
                min={28}
                max={80}
                step={2}
                value={c.logoHeight}
                onChange={(e) => update({ logoHeight: Number(e.target.value) })}
                className="mt-2 h-10 w-full max-w-xs cursor-pointer accent-[#16264F]"
              />
              {c.logoUrl && (
                <div className="mt-2 flex h-20 items-center rounded-xl border border-navy-900/10 bg-sky-50 px-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logoUrl} alt="" style={{ height: c.logoHeight }} className="w-auto max-w-[220px] object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <ImageField label={t("cmsHeroImage")} hint={t("cmsHeroImageHint")} url={c.heroImageUrl} onChange={(heroImageUrl) => update({ heroImageUrl })} />
            <fieldset>
              <legend className="text-sm font-medium">{t("cmsHeroFit")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["full", "crop"] as const).map((v) => (
                  <label key={v} className={clsx("cursor-pointer rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400", c.heroFit === v ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15")}>
                    <input type="radio" name="heroFit" value={v} checked={c.heroFit === v} onChange={() => update({ heroFit: v })} className="sr-only" />
                    {t(v === "full" ? "cmsHeroFitFull" : "cmsHeroFitCrop")}
                  </label>
                ))}
              </div>
            </fieldset>
            {c.heroFit === "crop" && (
              <fieldset>
                <legend className="text-sm font-medium">{t("cmsHeroFocus")}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["left", "center", "right"] as const).map((v) => (
                    <label key={v} className={clsx("cursor-pointer rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400", c.heroFocus === v ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15")}>
                      <input type="radio" name="heroFocus" value={v} checked={c.heroFocus === v} onChange={() => update({ heroFocus: v })} className="sr-only" />
                      {t(`cmsHeroFocus_${v}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {c.heroImageUrl && (
              <div className="max-w-sm overflow-hidden rounded-xl ring-1 ring-navy-900/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.heroImageUrl}
                  alt=""
                  className={c.heroFit === "crop" ? `block aspect-[840/520] w-full object-cover ${c.heroFocus === "left" ? "object-left" : c.heroFocus === "right" ? "object-right" : "object-center"}` : "block h-auto w-full"}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="text-lg font-bold">{t("cmsLayout")}</h2>
        <div className="mt-4">
          <LayoutEditor c={c} update={update} />
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
        <h2 className="text-lg font-bold">{t("cmsLegal")}</h2>
        <p className="mt-1 text-sm text-navy-900/60">{t("cmsLegalHint")}</p>
        <div className="mt-4 space-y-6">
          {(["tokushoho", "privacy", "terms"] as const satisfies readonly LegalSlug[]).map((k) => (
            <div key={k}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`legal-${k}`} className="text-sm font-medium">{t(`cmsLegal_${k}`)}</label>
                <div className="flex items-center gap-3">
                  <a href={`/${locale}/legal/${k}`} target="_blank" rel="noopener" className="text-xs font-semibold text-navy-700 hover:underline">{t("cmsLegalOpen")}</a>
                  {!c.legal[k].trim() && (
                    <button type="button" onClick={() => update({ legal: { ...c.legal, [k]: LEGAL_TEMPLATES[k] } })} className="min-h-9 rounded-lg border border-navy-900/20 px-3 text-xs font-semibold hover:bg-sky-100">
                      {t("cmsLegalTemplate")}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id={`legal-${k}`}
                rows={10}
                lang="ja"
                value={c.legal[k]}
                placeholder={LEGAL_TEMPLATES[k].slice(0, 160) + "…"}
                onChange={(e) => update({ legal: { ...c.legal, [k]: e.target.value } })}
                className={clsx(field, "font-mono text-[13px] leading-relaxed")}
              />
              {c.legal[k].includes("【要入力】") && <p className="mt-1 text-xs text-sun-700">{t("cmsLegalTodo")}</p>}
            </div>
          ))}
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

/** Small diagrams of the three banner layouts. */
function LayoutIcon({ kind }: { kind: HeroLayout }) {
  const text = <><rect x="6" y="12" width="26" height="4" rx="1" fill="currentColor" /><rect x="6" y="20" width="20" height="3" rx="1" fill="currentColor" opacity=".5" /><rect x="6" y="27" width="12" height="5" rx="1.5" fill="currentColor" opacity=".8" /></>;
  return (
    <svg viewBox="0 0 72 44" className="h-11 w-18" aria-hidden>
      <rect x=".5" y=".5" width="71" height="43" rx="5" fill="none" stroke="currentColor" opacity=".3" />
      {kind === "textLeft" && (<>{text}<rect x="40" y="8" width="26" height="28" rx="3" fill="currentColor" opacity=".35" /></>)}
      {kind === "imageLeft" && (<><rect x="6" y="8" width="26" height="28" rx="3" fill="currentColor" opacity=".35" /><g transform="translate(34 0)">{text}</g></>)}
      {kind === "overlay" && (<><rect x="2" y="2" width="68" height="40" rx="4" fill="currentColor" opacity=".25" />{text}</>)}
    </svg>
  );
}

export function LayoutEditor({ c, update }: { c: SiteContent; update: (patch: Partial<SiteContent>) => void }) {
  const t = useTranslations("admin");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= c.sections.length || from === to) return;
    const next = [...c.sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update({ sections: next });
  };
  const toggle = (i: number) => update({ sections: c.sections.map((x, j): HomeSection => (j === i ? { ...x, visible: !x.visible } : x)) });
  const choice = (on: boolean) =>
    clsx(
      "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400",
      on ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15 text-navy-900/70 hover:border-navy-900/40",
    );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <fieldset>
          <legend className="text-sm font-medium">{t("cmsHeroLayout")}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["textLeft", "imageLeft", "overlay"] as const).map((v) => (
              <label key={v} className={choice(c.heroLayout === v)}>
                <input type="radio" name="heroLayout" value={v} checked={c.heroLayout === v} onChange={() => update({ heroLayout: v })} className="sr-only" />
                <LayoutIcon kind={v} />
                {t(`cmsHeroLayout_${v}`)}
              </label>
            ))}
          </div>
          {c.heroLayout === "overlay" && !c.heroImageUrl && <p className="mt-2 text-xs text-sun-700">{t("cmsOverlayNeedsImage")}</p>}
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">{t("cmsHeroAlign")}</legend>
          <div className="mt-2 flex gap-2">
            {(["left", "center"] as const).map((v) => (
              <label key={v} className={clsx("cursor-pointer rounded-lg border px-4 py-2 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400", c.heroAlign === v ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15")}>
                <input type="radio" name="heroAlign" value={v} checked={c.heroAlign === v} onChange={() => update({ heroAlign: v })} className="sr-only" />
                {t(`cmsHeroAlign_${v}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <p className="text-sm font-medium">{t("cmsSections")}</p>
        <p className="mt-0.5 text-xs text-navy-900/55">{t("cmsSectionsHint")}</p>
        <ol className="mt-3 space-y-2">
          <li className="flex items-center gap-3 rounded-xl border border-dashed border-navy-900/20 px-3 py-2.5 text-sm text-navy-900/55">
            <span className="w-5" />
            {t("cmsSection_hero")} · {t("cmsAlwaysFirst")}
          </li>
          {c.sections.map((sec, i) => (
            <li
              key={sec.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={clsx(
                "flex items-center gap-3 rounded-xl border bg-white px-3 py-2 text-sm",
                dragIndex === i ? "border-sun-500 opacity-60" : "border-navy-900/15",
                !sec.visible && "bg-sky-50 text-navy-900/45",
              )}
            >
              <GripVertical size={18} className="shrink-0 cursor-grab text-navy-900/40" aria-hidden />
              <span className="min-w-0 flex-1 font-medium">{t(`cmsSection_${sec.id}`)}</span>
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`${t("moveUp")}: ${t(`cmsSection_${sec.id}`)}`} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sky-100 disabled:opacity-30">
                <ArrowUp size={16} aria-hidden />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === c.sections.length - 1} aria-label={`${t("moveDown")}: ${t(`cmsSection_${sec.id}`)}`} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sky-100 disabled:opacity-30">
                <ArrowDown size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={sec.visible}
                aria-label={`${sec.visible ? t("hideSection") : t("showSection")}: ${t(`cmsSection_${sec.id}`)}`}
                className={clsx("inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold", sec.visible ? "text-leaf hover:bg-leaf/10" : "text-navy-900/50 hover:bg-sky-100")}
              >
                {sec.visible ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                {sec.visible ? t("shown") : t("hidden")}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
