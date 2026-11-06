"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Mail, CheckCircle2, Lock, Clock, PlayCircle, Heart, Landmark, CreditCard } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { inviteEmployeeAction, updateProfileAction, type ActionState } from "@/lib/member-actions";
import { localeNames, locales } from "@/i18n/routing";
import { formatDate, formatYen } from "@/lib/format";

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
  plan: { status: "active" | "cancelled"; period: "monthly" | "annual"; end: string; seats: number } | null;
  learning: {
    minutesThisMonth: number;
    completed: number;
    history: { id: string; title: string; minutes: number; progress: number }[];
    favorites: { id: string; title: string; minutes: number }[];
  };
  payments: { date: string; code: string; amount: number; method: "card" | "bank_transfer"; status: string }[];
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
          {used >= live.org.seatLimit && <p className="mt-4 text-sm text-navy-900/70">{t("seatsHowTo")}</p>}
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

function LivePlanCard({ live }: { live: LiveMember }) {
  const t = useTranslations("dashboard");
  const th = useTranslations("home");
  const locale = useLocale();
  const p = live.plan;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white sm:p-8">
      <div aria-hidden className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(240_188_85/0.45),transparent_65%)]" />
      <p className="relative text-sm text-white/60">{t("subStatus")}</p>
      {p ? (
        <>
          <p className="relative mt-2 inline-flex items-center gap-2 text-2xl font-bold">
            <CheckCircle2 className="text-sun-300" size={24} aria-hidden />
            {p.status === "cancelled" ? t("cancelled") : t("active")}
          </p>
          <dl className="relative mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-white/55">{t("plan")}</dt>
              <dd className="mt-1 font-semibold">{p.period === "annual" ? th("planAnnual") : th("planMonthly")}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/55">{t("validUntil")}</dt>
              <dd className="mt-1 font-semibold">{formatDate(p.end, locale)}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/55">{t("seats")}</dt>
              <dd className="mt-1 font-semibold">{t("seatsUsed", { used: live.people.length, total: live.org.seatLimit })}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p className="relative mt-2 inline-flex items-center gap-2 text-2xl font-bold">
            <Lock className="text-sun-300" size={22} aria-hidden />
            {t("noPlan")}
          </p>
          <p className="relative mt-3 max-w-lg text-sm text-white/70">{live.memberRole === "owner" ? t("noPlanOwner") : t("noPlanEmployee")}</p>
          {live.memberRole === "owner" && (
            <Link href="/#pricing" className="btn-3d relative mt-6">{th("pricingTitle")}</Link>
          )}
        </>
      )}
    </section>
  );
}

function LiveList({ items, empty, icon }: { items: { id: string; title: string; minutes: number; progress?: number }[]; empty: string; icon: "history" | "fav" }) {
  const tc = useTranslations("common");
  if (!items.length) return <p className="text-sm text-navy-900/60">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((v) => (
        <li key={v.id}>
          <Link href={`/library?v=${v.id}`} className="flex items-center gap-4 rounded-xl p-2 -m-2 hover:bg-sky-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-sun-300" aria-hidden>
              {icon === "history" ? <PlayCircle size={18} /> : <Heart size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{v.title}</span>
              <span className="text-sm text-navy-900/55">{tc("minutes", { count: v.minutes })}</span>
              {v.progress !== undefined && (
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sky-100" aria-hidden>
                  <span className="block h-full bg-sun-500" style={{ width: `${v.progress}%` }} />
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LiveOverview({ live }: { live: LiveMember }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const box = "rounded-2xl border border-navy-900/10 bg-white p-6";
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <LivePlanCard live={live} />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <dt className="flex items-center gap-2 text-sm text-navy-900/60"><Clock size={16} className="text-sun-700" aria-hidden />{t("watchTime")}</dt>
            <dd className="mt-2 font-serif text-3xl font-bold tabular-nums">{tc("minutes", { count: live.learning.minutesThisMonth })}</dd>
          </div>
          <div className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <dt className="flex items-center gap-2 text-sm text-navy-900/60"><CheckCircle2 size={16} className="text-sun-700" aria-hidden />{t("completed")}</dt>
            <dd className="mt-2 font-serif text-3xl font-bold tabular-nums">{live.learning.completed}</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-6">
        <section className={box}>
          <h2 className="mb-5 text-lg font-bold">{t("history")}</h2>
          <LiveList items={live.learning.history} empty={t("noHistory")} icon="history" />
        </section>
        <section className={box}>
          <h2 className="mb-5 text-lg font-bold">{t("favorites")}</h2>
          <LiveList items={live.learning.favorites} empty={t("noFavorites")} icon="fav" />
        </section>
      </div>
    </div>
  );
}

export function LiveBilling({ live }: { live: LiveMember }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <LivePlanCard live={live} />
      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <h2 className="mb-5 text-lg font-bold">{t("paymentHistory")}</h2>
        {live.payments.length === 0 ? (
          <p className="text-sm text-navy-900/60">{t("noPayments")}</p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-navy-900/55">
                <tr className="border-b border-navy-900/10">
                  <th className="py-3 font-medium">{t("date")}</th>
                  <th className="py-3 font-medium">{t("orderCode")}</th>
                  <th className="py-3 font-medium">{t("method")}</th>
                  <th className="py-3 text-right font-medium">{t("amount")}</th>
                  <th className="py-3 font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {live.payments.map((p) => (
                  <tr key={p.code} className="border-b border-navy-900/6 last:border-0">
                    <td className="py-3.5 whitespace-nowrap">{formatDate(p.date, locale)}</td>
                    <td className="py-3.5 font-mono text-xs">{p.code}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        {p.method === "card" ? <CreditCard size={15} aria-hidden /> : <Landmark size={15} aria-hidden />}
                        {t(p.method === "card" ? "card" : "bank")}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums">{formatYen(p.amount, locale)}</td>
                    <td className="py-3.5">
                      <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", p.status === "verified" ? "bg-leaf/10 text-leaf" : "bg-sun-200 text-sun-700")}>
                        {p.status === "verified" ? t("paid") : t("awaiting")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-navy-900/50">{t("receiptLater")}</p>
      </section>
    </div>
  );
}
