"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { ShieldCheck, Clock, Upload, Loader2, EyeOff, Trash2, CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  activatePlanAction,
  createVideoUploadAction,
  deleteVideoAction,
  endPlanAction,
  grantAdminAction,
  revokeAdminAction,
  saveVideoAction,
  setSeatsAction,
  setVideoStateAction,
  type AdminActionState,
} from "@/lib/admin-actions";
import { formatDate } from "@/lib/format";

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
  }[];
  videos: { id: string; title: string; category: string; state: "draft" | "published"; minutes: number; created: string; viewers: number }[];
  categories: { id: string; name: string }[];
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
};

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
                  {a.name || a.email} {a.userId === live.meId && <span className="text-sm font-normal text-navy-900/50">（{t("you")}）</span>}
                </p>
                <p className="truncate text-sm text-navy-900/55">
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
      <span className="text-xs text-navy-900/55 tabular-nums">{t("seatsUsedShort", { used })}</span>
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
        <span className="text-xs text-navy-900/60">{planEnd ? t("planUntil", { date: formatDate(planEnd, locale) }) : ""}</span>
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
            <p className="mt-1 text-sm text-navy-900/60">{t("videoAddBody")}</p>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="v-file" className="text-sm font-medium">{t("videoFile")}</label>
            <input id="v-file" name="file" type="file" accept="video/mp4,video/webm,video/quicktime" className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:font-semibold file:text-white" />
            <p className="mt-1.5 text-xs text-navy-900/55">{t("videoFileHint")}</p>
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
          <p className="text-navy-900/60">{t("noVideos")}</p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-navy-900/55">
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
                      <p className="font-semibold">{v.title}</p>
                      <p className="text-xs text-navy-900/50">
                        {formatDate(v.created, locale)} · {v.minutes ? tc("minutes", { count: v.minutes }) : "—"}
                      </p>
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

