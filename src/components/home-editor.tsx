"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Loader2, Save, Send, X, ImagePlus, PencilLine } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { publishSiteAction, saveSiteDraftAction } from "@/lib/admin-actions";
import type { SiteContent } from "@/lib/site-content";
import { SiteProvider } from "./site-context";
import { EditProvider, uploadSiteImage } from "./edit-context";
import { HomeView } from "./home-view";

const LOCALIZED = new Set(["heroTitle", "heroLead", "heroTagline", "introTitle", "introBody", "footerAbout"]);

/** Write `value` at a dotted path; text fields that differ per language are written for `locale`. */
function setAt(c: SiteContent, path: string, value: string | null, locale: string): SiteContent {
  const next = structuredClone(c) as unknown as Record<string, unknown>;
  const parts = path.split(".");
  if (parts.length === 1 && LOCALIZED.has(path)) {
    next[path] = { ...(next[path] as object), [locale]: value ?? "" };
    return next as unknown as SiteContent;
  }
  let node = next as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] as Record<string, unknown>;
  const last = parts[parts.length - 1];
  // characters.N.role is localized too
  if (last === "role") node[last] = { ...(node[last] as object), [locale]: value ?? "" };
  else node[last] = value;
  return next as unknown as SiteContent;
}

export function HomeEditor({ initial }: { initial: SiteContent }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "publish" | "logo">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const set = useCallback(
    (path: string, value: string | null) => {
      setC((prev) => setAt(prev, path, value, locale));
      setDirty(true);
      setMsg(null);
    },
    [locale],
  );

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function run(kind: "save" | "publish") {
    (document.activeElement as HTMLElement | null)?.blur(); // commit the field being typed in
    await new Promise((r) => setTimeout(r, 50)); // let that edit reach state before saving
    setBusy(kind);
    const res = kind === "save" ? await saveSiteDraftAction({ content: cRef.current, locale }) : await publishSiteAction({ content: cRef.current, locale });
    setBusy(null);
    if ("error" in res) return setMsg({ ok: false, text: res.error === "pricesSuperOnly" ? t("pricesSuperOnly") : t("errGeneric") });
    setDirty(false);
    setMsg({ ok: true, text: kind === "save" ? t("draftSavedLive") : t("publishedLive") });
    return true;
  }
  // Always read the newest state when saving right after a blur.
  const cRef = useRef(c);
  cRef.current = c;

  async function switchLanguage(l: Locale) {
    if (dirty && !(await run("save"))) return;
    router.replace("/admin/edit", { locale: l });
  }

  return (
    <SiteProvider value={c}>
      <EditProvider value={{ set }}>
        <div className="pb-28">
          <HomeView content={c} preview />
        </div>
      </EditProvider>

      <div
        role="toolbar"
        aria-label={t("editMode")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-navy-900/10 bg-white/95 px-[max(16px,env(safe-area-inset-left,0px))] pt-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_-15px_rgb(13_26_58/0.35)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <PencilLine size={18} className="text-sun-700" aria-hidden />
            {t("editMode")}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-navy-900/70">{t("editingLanguage")}</span>
            <select
              value={locale}
              onChange={(e) => switchLanguage(e.target.value as Locale)}
              className="h-10 rounded-lg border border-navy-900/20 bg-white px-2 text-sm"
            >
              {locales.filter((l) => ["ja", "vi", "en"].includes(l)).map((l) => (
                <option key={l} value={l}>{localeNames[l]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            disabled={busy !== null}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-navy-900/20 px-3 text-sm font-semibold hover:bg-sky-100"
          >
            {busy === "logo" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
            {t("editLogo")}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-navy-900/70">{t("cmsLogoSize")}</span>
            <input
              type="range"
              min={28}
              max={80}
              step={2}
              value={c.logoHeight}
              onChange={(e) => {
                setC((prev) => ({ ...prev, logoHeight: Number(e.target.value) }));
                setDirty(true);
              }}
              className="h-10 w-28 cursor-pointer accent-[#16264F]"
            />
          </label>
          <input
            ref={logoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy("logo");
              const res = await uploadSiteImage(f, "logo");
              setBusy(null);
              if ("error" in res) return setMsg({ ok: false, text: t("videoUploadFailed") });
              set("logoUrl", res.url);
            }}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {msg ? (
              <span role="status" className={clsx("text-sm", msg.ok ? "text-leaf" : "text-seal")}>{msg.text}</span>
            ) : (
              dirty && <span className="text-sm text-sun-700">{t("unsaved")}</span>
            )}
            <button type="button" onClick={() => run("save")} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-navy-900/20 px-4 text-sm font-semibold hover:bg-sky-100 disabled:opacity-60">
              {busy === "save" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
              {t("saveDraft")}
            </button>
            <button type="button" onClick={() => run("publish")} disabled={busy !== null} className="btn-3d min-h-11 disabled:opacity-60">
              {busy === "publish" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
              {t("publish")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (dirty && !window.confirm(t("leaveUnsaved"))) return;
                setDirty(false);
                router.push("/admin");
              }}
              aria-label={t("editExit")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy-900/20 hover:bg-sky-100"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <p className="basis-full text-xs text-navy-900/70">{t("editHint")}</p>
        </div>
      </div>
    </SiteProvider>
  );
}
