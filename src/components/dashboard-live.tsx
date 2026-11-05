"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Mail } from "lucide-react";
import { inviteEmployeeAction, updateProfileAction, type ActionState } from "@/lib/member-actions";
import { localeNames, locales } from "@/i18n/routing";
import { formatDate } from "@/lib/format";

/** Real account data passed from the server when Supabase is configured. */
export interface LiveMember {
  id: string;
  name: string;
  email: string;
  locale: string;
  memberRole: "owner" | "employee";
  org: { name: string; kind: "individual" | "company"; seatLimit: number };
  people: { id: string; name: string; email: string; role: "owner" | "employee"; joined: string }[];
  invitations: { email: string; expires: string }[];
}

export function LiveCompany({ live }: { live: LiveMember }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteEmployeeAction, undefined);
  const used = live.people.length + live.invitations.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
          <h2 className="text-lg font-bold">{t("seats")}</h2>
          <p className="mt-2 font-serif text-3xl font-bold tabular-nums">{t("seatsUsed", { used, total: live.org.seatLimit })}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky-100" aria-hidden>
            <div className="h-full rounded-full bg-sun-500" style={{ width: `${Math.min(100, (used / live.org.seatLimit) * 100)}%` }} />
          </div>
        </section>
        <form action={action} noValidate className="rounded-2xl border border-navy-900/10 bg-white p-6">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-lg font-bold">{t("inviteTitle")}</h2>
          <p className="mt-2 text-sm text-navy-900/65">{t("inviteBody")}</p>
          <label htmlFor="invite-email" className="mt-5 block text-sm font-medium">
            {t("inviteEmail")}
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(state?.error) || undefined}
            aria-describedby="invite-msg"
            className="mt-2 h-12 w-full rounded-xl border border-navy-900/20 px-4 focus:border-navy-700 focus:outline-none"
            placeholder="name@company.co.jp"
          />
          <p id="invite-msg" role="status" className={clsx("mt-2 min-h-5 text-sm", state?.ok ? "text-leaf" : "text-seal")}>
            {state?.ok ? t("inviteSentLive", { email: state.email ?? "" }) : state?.error ? t(state.error) : ""}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
          >
            <Mail size={18} aria-hidden />
            {t("inviteSend")}
          </button>
        </form>
      </div>
      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <h2 className="mb-5 text-lg font-bold">{t("employee")}</h2>
        <ul className="divide-y divide-navy-900/8">
          {live.people.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-navy-700" aria-hidden>
                {p.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.name} {p.id === live.id && <span className="text-sm font-normal text-navy-900/50">（{t("you")}）</span>}
                </p>
                <p className="truncate text-sm text-navy-900/55">{p.email}</p>
              </div>
              <span className="shrink-0 text-xs text-navy-900/55">{p.role === "owner" ? t("roleOwner") : t("roleEmployee")}</span>
            </li>
          ))}
          {live.invitations.map((i) => (
            <li key={i.email} className="flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-200/60 text-sun-700" aria-hidden>
                <Mail size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.email}</p>
                <p className="text-sm text-navy-900/55">
                  {t("pendingInvites")} · {formatDate(i.expires, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {live.people.length <= 1 && live.invitations.length === 0 && <p className="mt-4 text-sm text-navy-900/60">{t("noEmployees")}</p>}
      </section>
    </div>
  );
}

export function LiveProfile({ live }: { live: LiveMember }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfileAction, undefined);
  const field = "mt-2 h-12 w-full rounded-xl border border-navy-900/20 px-4 focus:border-navy-700 focus:outline-none";
  return (
    <form action={action} className="max-w-xl space-y-5 rounded-2xl border border-navy-900/10 bg-white p-6">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="p-name" className="text-sm font-medium">{t("profileName")}</label>
        <input id="p-name" name="displayName" autoComplete="name" defaultValue={live.name} className={field} />
      </div>
      <div>
        <label htmlFor="p-email" className="text-sm font-medium">{t("profileEmail")}</label>
        <input id="p-email" type="email" value={live.email} readOnly className={clsx(field, "bg-sky-50 text-navy-900/70")} />
      </div>
      <div>
        <label htmlFor="p-company" className="text-sm font-medium">{t("profileCompany")}</label>
        <input id="p-company" value={live.org.name} readOnly className={clsx(field, "bg-sky-50 text-navy-900/70")} />
      </div>
      <div>
        <label htmlFor="p-lang" className="text-sm font-medium">{t("profileLang")}</label>
        <select id="p-lang" name="profileLocale" defaultValue={live.locale} className={field}>
          {locales.map((l) => (
            <option key={l} value={l}>{localeNames[l]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-3d disabled:opacity-60">{tc("save")}</button>
        <p role="status" className={clsx("text-sm", state?.error ? "text-seal" : "text-leaf")}>
          {state?.ok ? t("profileSavedLive") : state?.error ? t(state.error) : ""}
        </p>
      </div>
    </form>
  );
}
