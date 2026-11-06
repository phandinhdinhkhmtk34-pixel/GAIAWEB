"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { ShieldCheck, Clock, Upload, Loader2, EyeOff, Trash2, CheckCircle2, ImagePlus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  activatePlanAction,
  createThumbnailUploadAction,
  createVideoUploadAction,
  deleteVideoAction,
  endPlanAction,
  grantAdminAction,
  revokeAdminAction,
  saveVideoAction,
  setSeatsAction,
  setThumbnailAction,
  setInquiryStatusAction,
  setOrgSuspendedAction,
  deleteOrgAction,
  setVideoStateAction,
  type AdminActionState,
} from "@/lib/admin-actions";
import { formatDate, formatYen } from "@/lib/format";
import { confirmBankPaymentAction, rejectBankPaymentAction, saveBillingSettingsAction, type BillingState } from "@/lib/billing-actions";
import { Link } from "@/i18n/navigation";

export interface LiveAdmin {
  role: "super" | "accounting" | "editor";
  meId: string;
  serviceRole: boolean;
  counts: { users: number; companies: number };
  members: {
    id: string;
    name: string;
    type: "company" | "individual";
    seats: number;
    used: number;
    status: "active" | "pending" | "cancelled" | "expired" | "none";
    since: string;
    planEnd: string | null;
    planPeriod: "monthly" | "annual" | null;
    suspended: boolean;
  }[];
  videos: { id: string; title: string; category: string; state: "draft" | "published"; minutes: number; created: string; viewers: number; thumbnailUrl: string | null }[];
  categories: { id: string; name: string }[];
  billing: {
    pending: { id: string; code: string; org: string; amount: number; kind: string; seats: number | null; created: string }[];
    recent: { code: string; org: string; amount: number; method: string; receipt: string | null; date: string }[];
    settings: Record<string, string>;
  };
  site: import("@/lib/site-content").SiteContent | null;
  inquiries: { id: string; name: string; email: string; company: string; topic: string; message: string; status: "new" | "done"; created: string }[];
  kpis: { paid: number; activeSubs: number; mrr: number; total: number; pending: number; videos: number; views: number } | null;
  charts: { revenue: { label: string; revenue: number }[]; views: { name: string; views: number }[] } | null;
  admins: { userId: string | null; email: string; name: string; role: "super" | "accounting" | "editor"; pending: boolean }[];
  audit: { who: string; what: string; when: string }[];
}

const ERR: Record<string, string> = {
  forbidden: "errForbidden",
  self: "errSelf",
  emailFormat: "errEmail",
  generic: "errGeneric",
  seatsInvalid: "seatsInvalid",
  videoType: "videoType",
  videoSize: "videoSize",
  videoMissingFile: "videoMissingFile",
  videoMissingTitle: "videoMissingTitle",
  upload: "videoUploadFailed",
  imageType: "imageType",
  imageSize: "imageSize",
};

/** Grab one frame (10% into the video, at most 5 s) from a local file as a JPEG, in the browser. */
async function captureFrame(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((ok, fail) => {
      video.onloadedmetadata = () => ok();
      video.onerror = () => fail(new Error("load"));
    });
    video.currentTime = Math.min(5, (video.duration || 10) * 0.1);
    await new Promise<void>((ok, fail) => {
      video.onseeked = () => ok();
      video.onerror = () => fail(new Error("seek"));
    });
    const w = Math.min(1280, video.videoWidth || 1280);
    const h = Math.round((w / (video.videoWidth || 16)) * (video.videoHeight || 9));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    // A browser that cannot decode the codec draws a flat frame: skip it rather than save a black cover.
    const px = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let sq = 0;
    let n = 0;
    for (let i = 0; i < px.length; i += 4 * 97) {
      const y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += y;
      sq += y * y;
      n++;
    }
    const mean = sum / n;
    if (Math.sqrt(Math.max(0, sq / n - mean * mean)) < 6) return null;
    return await new Promise((ok) => canvas.toBlob((b) => ok(b), "image/jpeg", 0.85));
  } catch {
    return null; // unsupported codec: the library falls back to generated art
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload an image (File or captured Blob) to the thumbnails bucket; returns its path. */
async function uploadThumbnail(original: Blob): Promise<{ path: string } | { error: string }> {
  const { optimizeImage, IMAGE_LIMITS } = await import("@/lib/image-optimize");
  const img = original instanceof File ? await optimizeImage(original, IMAGE_LIMITS.thumbnail) : original;
  const type = img.type || "image/jpeg";
  const ticket = await createThumbnailUploadAction({ type, size: img.size });
  if ("error" in ticket) return { error: ticket.error ?? "generic" };
  const { createClient } = await import("@/lib/supabase/browser");
  const { error } = await createClient().storage.from("thumbnails").uploadToSignedUrl(ticket.path, ticket.token, img, { contentType: type });
  return error ? { error: "upload" } : { path: ticket.path };
}

export function LiveAdmins({ live }: { live: LiveAdmin }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(grantAdminAction, undefined);
  const roleName = (r: string) => t(r === "super" ? "roleSuper" : r === "accounting" ? "roleAccounting" : "roleEditor");
  const field = "mt-2 h-12 w-full rounded-xl border border-navy-900/20 bg-white px-4 focus:border-navy-700 focus:outline-none";

  if (!live.serviceRole) return <p className="rounded-xl bg-sun-200/60 p-4 text-sm text-sun-700">{t("needsServiceRole")}</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form action={action} noValidate className="space-y-4 rounded-2xl border border-navy-900/10 bg-white p-6">
        <input type="hidden" name="locale" value={locale} />
        <h2 className="text-lg font-bold">{t("adminsTitle")}</h2>
        <p className="text-sm text-navy-900/65">{t("adminsBody")}</p>
        <div>
          <label htmlFor="a-email" className="text-sm font-medium">{t("adminEmail")}</label>
          <input id="a-email" name="email" type="email" autoComplete="off" className={field} aria-describedby="a-msg" />
        </div>
        <div>
          <label htmlFor="a-role" className="text-sm font-medium">{t("adminRole")}</label>
          <select id="a-role" name="role" defaultValue="editor" className={field}>
            <option value="editor">{t("roleEditor")}</option>
            <option value="accounting">{t("roleAccounting")}</option>
            <option value="super">{t("roleSuper")}</option>
          </select>
        </div>
        <p id="a-msg" role="status" className={clsx("min-h-5 text-sm", state?.ok ? "text-leaf" : "text-seal")}>
          {state?.ok ? t(state.ok, { email: state.email ?? "" }) : state?.error ? t(ERR[state.error] ?? "errGeneric") : ""}
        </p>
        <button type="submit" disabled={pending} className="btn-3d w-full disabled:opacity-60">{t("grant")}</button>
      </form>
      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <ul className="divide-y divide-navy-900/8">
          {live.admins.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", a.pending ? "bg-sun-200/60 text-sun-700" : "bg-navy-900 text-sun-300")} aria-hidden>
                {a.pending ? <Clock size={16} /> : <ShieldCheck size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {a.name || a.email} {a.userId === live.meId && <span className="text-sm font-normal text-navy-900/70">（{t("you")}）</span>}
                </p>
                <p className="truncate text-sm text-navy-900/70">
                  {a.email} · {roleName(a.role)}
                  {a.pending ? ` · ${t("pendingSignup")}` : ""}
                </p>
              </div>
              {a.userId !== live.meId && (
                <form action={revokeAdminAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="userId" value={a.userId ?? "pending"} />
                  <input type="hidden" name="email" value={a.email} />
                  <button type="submit" className="min-h-11 rounded-xl border border-navy-900/15 px-3 text-sm font-semibold hover:bg-sky-100">
                    {t("revoke")}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Seat editor for one company row (Super admin and Accounting). */
export function SeatsEditor({ orgId, seats, used }: { orgId: string; seats: number; used: number }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setSeatsAction, undefined);
  const id = `seats-${orgId}`;
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orgId" value={orgId} />
      <label htmlFor={id} className="sr-only">{t("seatsLabel")}</label>
      <span className="text-xs text-navy-900/70 tabular-nums">{t("seatsUsedShort", { used })}</span>
      <input
        id={id}
        name="seats"
        type="number"
        min={Math.max(1, used)}
        max={1000}
        defaultValue={seats}
        inputMode="numeric"
        className="h-10 w-20 rounded-lg border border-navy-900/20 px-2 text-right tabular-nums focus:border-navy-700 focus:outline-none"
      />
      <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
        {t("seatsSave")}
      </button>
      {state && (
        <span role="status" className={clsx("basis-full text-right text-xs", state.ok ? "text-leaf" : "text-seal")}>
          {state.ok ? t("seatsSaved") : state.error === "seatsBelowUsed" ? t("seatsBelowUsed", { used: state.email ?? "" }) : t(ERR[state.error ?? ""] ?? "errGeneric")}
        </span>
      )}
    </form>
  );
}

/** Activate / end the plan for one organization (stands in for payment confirmation until Phase 4). */
export function PlanControls({ orgId, status, planEnd }: { orgId: string; status: string; planEnd: string | null }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(activatePlanAction, undefined);
  const active = status === "active" || status === "cancelled";
  if (active) {
    return (
      <form action={endPlanAction} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="orgId" value={orgId} />
        <span className="text-xs text-navy-900/70">{planEnd ? t("planUntil", { date: formatDate(planEnd, locale) }) : ""}</span>
        <button type="submit" className="min-h-10 rounded-lg border border-navy-900/20 px-3 text-xs font-semibold hover:bg-sky-100">{t("planEnd")}</button>
      </form>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orgId" value={orgId} />
      <label htmlFor={`period-${orgId}`} className="sr-only">{t("planPeriod")}</label>
      <select id={`period-${orgId}`} name="period" defaultValue="monthly" className="h-10 rounded-lg border border-navy-900/20 bg-white px-2 text-xs">
        <option value="monthly">{t("planMonthlyShort")}</option>
        <option value="annual">{t("planAnnualShort")}</option>
      </select>
      <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-leaf px-3 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60">
        {t("planActivate")}
      </button>
      {state && (
        <span role="status" className={clsx("basis-full text-right text-xs", state.ok ? "text-leaf" : "text-seal")}>
          {state.ok ? t("planActivated") : t(ERR[state.error ?? ""] ?? "errGeneric")}
        </span>
      )}
    </form>
  );
}

/** Upload a video file straight to private storage, then save its details. */
export function VideoManager({ live }: { live: LiveAdmin }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const field = "mt-2 w-full rounded-xl border border-navy-900/20 bg-white px-4 py-3 focus:border-navy-700 focus:outline-none";
  const canEdit = live.role === "super" || live.role === "editor";

  async function submit(e: React.FormEvent<HTMLFormElement>, publish: boolean) {
    e.preventDefault();
    const form = formRef.current!;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setMsg({ ok: false, text: t("videoMissingFile") });
    if (!String(fd.get("title_ja") ?? "").trim()) return setMsg({ ok: false, text: t("videoMissingTitle") });
    setMsg(null);
    setBusy("uploading");
    const ticket = await createVideoUploadAction({ type: file.type, size: file.size });
    if ("error" in ticket) {
      setBusy("idle");
      return setMsg({ ok: false, text: t(ERR[ticket.error ?? ""] ?? "errGeneric") });
    }
    const { createClient } = await import("@/lib/supabase/browser");
    const { error } = await createClient().storage.from("videos").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) {
      setBusy("idle");
      return setMsg({ ok: false, text: t("videoUploadFailed") });
    }
    setBusy("saving");
    // Cover image: the one chosen, otherwise a frame captured from the video itself.
    const chosen = fd.get("thumb");
    const cover = chosen instanceof File && chosen.size > 0 ? chosen : await captureFrame(file);
    if (cover) {
      const up = await uploadThumbnail(cover);
      if ("path" in up) fd.set("thumbnailPath", up.path);
    }
    fd.delete("thumb");
    fd.delete("file");
    fd.set("storagePath", ticket.path);
    fd.set("publish", publish ? "1" : "0");
    fd.set("locale", locale);
    const res = await saveVideoAction(undefined, fd);
    setBusy("idle");
    if (res?.error) return setMsg({ ok: false, text: t(ERR[res.error] ?? "errGeneric") });
    form.reset();
    setMsg({ ok: true, text: t(res?.ok ?? "videoSaved") });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <form ref={formRef} onSubmit={(e) => submit(e, true)} className="grid gap-5 rounded-2xl border border-navy-900/10 bg-white p-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold">{t("videoAddTitle")}</h2>
            <p className="mt-1 text-sm text-navy-900/70">{t("videoAddBody")}</p>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="v-file" className="text-sm font-medium">{t("videoFile")}</label>
            <input id="v-file" name="file" type="file" accept="video/mp4,video/webm,video/quicktime" className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:font-semibold file:text-white" />
            <p className="mt-1.5 text-xs text-navy-900/70">{t("videoFileHint")}</p>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="v-thumb" className="text-sm font-medium">{t("thumbField")}</label>
            <input id="v-thumb" name="thumb" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:font-semibold file:text-navy-900" />
            <p className="mt-1.5 text-xs text-navy-900/70">{t("thumbHint")}</p>
          </div>
          <div>
            <label htmlFor="v-cat" className="text-sm font-medium">{t("videoCategory")}</label>
            <select id="v-cat" name="categoryId" className={field}>
              {live.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="v-char" className="text-sm font-medium">{t("videoCharacter")}</label>
            <input id="v-char" name="character" className={field} placeholder="Hikari" />
          </div>
          {(["ja", "vi", "en"] as const).map((l) => (
            <div key={l} className="grid gap-3 lg:col-span-2 lg:grid-cols-2">
              <div>
                <label htmlFor={`v-title-${l}`} className="text-sm font-medium">
                  {t("videoTitleField")} ({l === "ja" ? "日本語" : l === "vi" ? "Tiếng Việt" : "English"}){l === "ja" ? " *" : ""}
                </label>
                <input id={`v-title-${l}`} name={`title_${l}`} className={field} required={l === "ja"} />
              </div>
              <div>
                <label htmlFor={`v-desc-${l}`} className="text-sm font-medium">
                  {t("videoDescField")} ({l === "ja" ? "日本語" : l === "vi" ? "Tiếng Việt" : "English"})
                </label>
                <input id={`v-desc-${l}`} name={`desc_${l}`} className={field} />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button type="button" disabled={busy !== "idle"} onClick={(e) => submit(e as unknown as React.FormEvent<HTMLFormElement>, false)} className="min-h-12 rounded-xl border border-navy-900/20 px-5 font-semibold hover:bg-sky-100 disabled:opacity-60">
              {t("saveDraft")}
            </button>
            <button type="submit" disabled={busy !== "idle"} className="btn-3d disabled:opacity-60">
              {busy === "idle" ? <Upload size={18} aria-hidden /> : <Loader2 size={18} className="animate-spin" aria-hidden />}
              {busy === "uploading" ? t("videoUploading") : busy === "saving" ? t("videoSaving") : t("videoUploadPublish")}
            </button>
            <p role="status" className={clsx("text-sm", msg?.ok ? "text-leaf" : "text-seal")}>{msg?.text}</p>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">{t("videosTitle")}</h2>
        {live.videos.length === 0 ? (
          <p className="text-navy-900/70">{t("noVideos")}</p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-navy-900/70">
                <tr className="border-b border-navy-900/10">
                  <th className="py-3 font-medium">{t("videosTitle")}</th>
                  <th className="py-3 font-medium">{t("videoCategory")}</th>
                  <th className="py-3 font-medium">{t("published")}</th>
                  <th className="py-3 text-right font-medium">{t("viewers")}</th>
                  <th className="py-3 text-right font-medium"><span className="sr-only">{t("actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {live.videos.map((v) => (
                  <tr key={v.id} className="border-b border-navy-900/6 last:border-0">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <ThumbCell videoId={v.id} url={v.thumbnailUrl} title={v.title} canEdit={canEdit} />
                        <div className="min-w-0">
                      <p className="font-semibold">{v.title}</p>
                      <p className="text-xs text-navy-900/70">
                        {formatDate(v.created, locale)} · {v.minutes ? tc("minutes", { count: v.minutes }) : "—"}
                      </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">{v.category}</td>
                    <td className="py-3.5">
                      <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", v.state === "published" ? "bg-leaf/10 text-leaf" : "bg-sky-100 text-navy-700")}>
                        {v.state === "published" ? t("published") : t("draft")}
                      </span>
                    </td>
                    <td className="py-3.5 text-right tabular-nums">{v.viewers}</td>
                    <td className="py-3.5">
                      {canEdit && (
                        <div className="flex justify-end gap-2">
                          <form action={setVideoStateAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="videoId" value={v.id} />
                            <input type="hidden" name="publish" value={v.state === "published" ? "0" : "1"} />
                            <button type="submit" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 text-xs font-semibold hover:bg-sky-100">
                              {v.state === "published" ? <EyeOff size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
                              {v.state === "published" ? t("unpublish") : t("publish")}
                            </button>
                          </form>
                          <DeleteVideo id={v.id} title={v.title} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Two-step delete: the first press asks, the second deletes (browser confirm() is not used). */
function DeleteVideo({ id, title }: { id: string; title: string }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} aria-label={`${t("delete")}: ${title}`} className="inline-flex min-h-10 items-center rounded-lg border border-navy-900/15 px-3 text-seal hover:bg-seal/5">
        <Trash2 size={14} aria-hidden />
      </button>
    );
  }
  return (
    <form action={deleteVideoAction} className="flex gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="videoId" value={id} />
      <button type="submit" className="min-h-10 rounded-lg bg-seal px-3 text-xs font-semibold text-white">{t("deleteConfirm")}</button>
      <button type="button" onClick={() => setArmed(false)} className="min-h-10 rounded-lg border border-navy-900/15 px-3 text-xs">{t("cancel")}</button>
    </form>
  );
}


/** Cover image preview with a "change" control for existing videos. */
function ThumbCell({ videoId, url, title, canEdit }: { videoId: string; url: string | null; title: string; canEdit: boolean }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function change(file: File) {
    setBusy(true);
    setErr(null);
    const up = await uploadThumbnail(file);
    if ("error" in up) {
      setBusy(false);
      return setErr(t(ERR[up.error] ?? "errGeneric"));
    }
    const res = await setThumbnailAction({ videoId, path: up.path, locale });
    setBusy(false);
    if ("error" in res) return setErr(t("errGeneric"));
    router.refresh();
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={!canEdit || busy}
        onClick={() => input.current?.click()}
        aria-label={`${t("thumbChange")}: ${title}`}
        className="group relative block h-14 w-24 overflow-hidden rounded-lg bg-navy-900 ring-1 ring-navy-900/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
        {canEdit && (
          <span className="absolute inset-0 flex items-center justify-center bg-navy-950/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) change(f);
          e.target.value = "";
        }}
      />
      {err && <p role="alert" className="mt-1 max-w-24 text-[11px] text-seal">{err}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- payments */

function ConfirmButton({ id, code }: { id: string; code: string }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, action, pending] = useActionState<BillingState, FormData>(confirmBankPaymentAction, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="paymentId" value={id} />
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-leaf px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
        <CheckCircle2 size={16} aria-hidden />
        {t("approve")}
      </button>
      {state?.error && <span role="alert" className="text-xs text-seal">{t("errGeneric")}</span>}
    </form>
  );
}

export function LivePayments({ live }: { live: LiveAdmin }) {
  const t = useTranslations("admin");
  const tb = useTranslations("billing");
  const locale = useLocale();
  const [state, action, pending] = useActionState<BillingState, FormData>(saveBillingSettingsAction, undefined);
  const b = live.billing;
  const field = "mt-1.5 w-full rounded-lg border border-navy-900/20 bg-white px-3 py-2.5 text-sm focus:border-navy-700 focus:outline-none";
  const F = ({ name, label, wide }: { name: string; label: string; wide?: boolean }) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={`bs-${name}`} className="text-xs font-medium text-navy-900/70">{label}</label>
      <input id={`bs-${name}`} name={name} defaultValue={b.settings[name] ?? ""} className={field} />
    </div>
  );
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <h2 className="text-lg font-bold">{t("pendingTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-navy-900/65">{t("pendingBodyLive")}</p>
        {b.pending.length === 0 ? (
          <p className="mt-6 rounded-xl bg-sky-100 p-6 text-center text-navy-900/65">{t("noPending")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-navy-900/8">
            {b.pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
                <div className="min-w-32">
                  <p className="text-xs text-navy-900/70">{t("orderCode")}</p>
                  <p className="font-mono font-semibold">{p.code}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.org}</p>
                  <p className="text-sm text-navy-900/70">
                    {tb(`kind.${p.kind}`)}{p.seats ? ` · ${tb("seatsCount", { count: p.seats })}` : ""} · {formatDate(p.created, locale)}
                  </p>
                </div>
                <p className="font-serif text-xl font-bold tabular-nums">{formatYen(p.amount, locale)}</p>
                <div className="flex items-start gap-2">
                  <form action={rejectBankPaymentAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="paymentId" value={p.id} />
                    <button type="submit" className="min-h-11 rounded-xl border border-navy-900/15 px-3 text-sm font-semibold hover:bg-sky-100">{t("reject")}</button>
                  </form>
                  <ConfirmButton id={p.id} code={p.code} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">{t("recentPayments")}</h2>
        {b.recent.length === 0 ? (
          <p className="text-sm text-navy-900/70">{t("noRecent")}</p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-navy-900/70">
                <tr className="border-b border-navy-900/10">
                  <th className="py-3 font-medium">{t("requested")}</th>
                  <th className="py-3 font-medium">{t("customer")}</th>
                  <th className="py-3 font-medium">{tb("method")}</th>
                  <th className="py-3 text-right font-medium">{tb("amount")}</th>
                  <th className="py-3 font-medium">{tb("receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {b.recent.map((r) => (
                  <tr key={r.code} className="border-b border-navy-900/6 last:border-0">
                    <td className="py-3 whitespace-nowrap">{formatDate(r.date, locale)}</td>
                    <td className="py-3">{r.org}</td>
                    <td className="py-3">{r.method === "card" ? tb("methodCard") : tb("methodBank")}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{formatYen(r.amount, locale)}</td>
                    <td className="py-3">
                      {r.receipt ? <Link href={`/receipt/${r.receipt}`} className="font-semibold text-navy-700 hover:underline">{r.receipt}</Link> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={action} className="grid gap-4 rounded-2xl border border-navy-900/10 bg-white p-6 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <div className="sm:col-span-2">
          <h2 className="text-lg font-bold">{t("billingSettings")}</h2>
          <p className="mt-1 text-sm text-navy-900/70">{t("billingSettingsBody")}</p>
        </div>
        <F name="bank_name" label={tb("bankName")} />
        <F name="branch_name" label={tb("branchName")} />
        <F name="account_type" label={tb("accountType")} />
        <F name="account_number" label={tb("accountNumber")} />
        <F name="account_holder_kana" label={tb("accountHolder")} wide />
        <F name="transfer_note" label={t("transferNote")} wide />
        <F name="issuer_name" label={t("issuerName")} />
        <F name="issuer_phone" label={t("issuerPhone")} />
        <F name="issuer_address" label={t("issuerAddress")} wide />
        <F name="invoice_reg_no" label={t("invoiceRegNo")} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="btn-3d disabled:opacity-60">{t("saveSettings")}</button>
          <p role="status" className={clsx("text-sm", state?.ok ? "text-leaf" : "text-seal")}>
            {state?.ok ? t("settingsSaved") : state?.error === "invoiceRegNo" ? t("invoiceRegNoInvalid") : state?.error ? t("errGeneric") : ""}
          </p>
        </div>
      </form>
    </div>
  );
}

/** Suspend / resume and delete controls for one organization (Super admin). */
export function OrgControls({ orgId, suspended }: { orgId: string; suspended: boolean }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [armed, setArmed] = useState(false);
  const [state, del, pending] = useActionState<AdminActionState, FormData>(deleteOrgAction, undefined);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <form action={setOrgSuspendedAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="on" value={suspended ? "0" : "1"} />
        <button type="submit" className={clsx("min-h-9 rounded-lg border px-2.5 text-xs font-semibold", suspended ? "border-leaf/40 text-leaf hover:bg-leaf/5" : "border-navy-900/15 hover:bg-sky-100")}>
          {suspended ? t("resumeOrg") : t("suspendOrg")}
        </button>
      </form>
      {!armed ? (
        <button type="button" onClick={() => setArmed(true)} className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-seal hover:bg-seal/5">
          {t("delete")}
        </button>
      ) : (
        <form action={del} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orgId" value={orgId} />
          <button type="submit" disabled={pending} className="min-h-9 rounded-lg bg-seal px-2.5 text-xs font-semibold text-white">{t("deleteConfirm")}</button>
          <button type="button" onClick={() => setArmed(false)} className="min-h-9 rounded-lg px-2 text-xs">{t("cancel")}</button>
        </form>
      )}
      {state?.error && (
        <span role="alert" className="basis-full text-right text-xs text-seal">
          {state.error === "hasPayments" ? t("deleteHasPayments") : t(ERR[state.error] ?? "errGeneric")}
        </span>
      )}
    </div>
  );
}

export function LiveInquiries({ live }: { live: LiveAdmin }) {
  const t = useTranslations("admin");
  const tc = useTranslations("contact");
  const locale = useLocale();
  if (!live.inquiries.length) return <p className="rounded-2xl border border-navy-900/10 bg-white p-6 text-navy-900/70">{t("inquiriesEmpty")}</p>;
  return (
    <ul className="space-y-4">
      {live.inquiries.map((q) => (
        <li key={q.id} className={clsx("rounded-2xl border bg-white p-6", q.status === "new" ? "border-sun-500/50" : "border-navy-900/10 opacity-80")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">
                {q.name} {q.company && <span className="font-normal text-navy-900/70">· {q.company}</span>}
              </p>
              <p className="text-sm break-all text-navy-900/70 select-all">{q.email}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-sky-100 px-2 py-1">{tc(`topics.${q.topic}`)}</span>
              <span className={clsx("rounded-full px-2 py-1 font-semibold", q.status === "new" ? "bg-sun-200 text-sun-700" : "bg-leaf/10 text-leaf")}>
                {q.status === "new" ? t("statusNew") : t("statusDone")}
              </span>
              <span className="text-navy-900/70">{formatDate(q.created, locale)}</span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{q.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`mailto:${q.email}?subject=${encodeURIComponent("Re: GAIA LEARNING")}`} className="inline-flex min-h-10 items-center rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white hover:bg-navy-800">
              {t("replyByEmail")}
            </a>
            <form action={setInquiryStatusAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="status" value={q.status === "new" ? "done" : "new"} />
              <button type="submit" className="min-h-10 rounded-lg border border-navy-900/15 px-3 text-sm font-semibold hover:bg-sky-100">
                {q.status === "new" ? t("markDone") : t("markNew")}
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
