"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, Flame, Mail, Receipt, UserPlus, Users, CreditCard, Landmark } from "lucide-react";
import { categories, demoEmployees, demoMember, demoPayments, videos, weeklyMinutes, pick } from "@/lib/demo-data";
import { quote } from "@/lib/pricing";
import { formatDate, formatYen } from "@/lib/format";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { DemoTag } from "./demo-banner";
import { VideoThumb } from "./video-thumb";
import { LiveBilling, LiveCompany, LiveOverview, LiveProfile, type LiveMember } from "./dashboard-live";

const TABS = ["overview", "learning", "billing", "company", "profile"] as const;
type Tab = (typeof TABS)[number];
const TAB_KEY: Record<Tab, string> = {
  overview: "tabOverview",
  learning: "tabLearning",
  billing: "tabBilling",
  company: "tabCompany",
  profile: "tabProfile",
};

export function DashboardView({ live }: { live?: LiveMember }) {
  const t = useTranslations("dashboard");
  const [tab, setTab] = useState<Tab>("overview");
  // Only company managers manage employees.
  const tabs = TABS.filter((id) => id !== "company" || !live || (live.memberRole === "owner" && live.org.kind === "company"));
  const roleLabel = !live
    ? t("roleOwner")
    : live.org.kind === "individual"
      ? t("roleIndividual")
      : live.memberRole === "owner"
        ? t("roleOwner")
        : t("roleEmployee");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-navy-900/60">{live ? live.org.name : demoMember.company}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{t("greeting", { name: live ? live.name : demoMember.name })}</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1.5 text-sm text-white">
          <Users size={15} aria-hidden />
          {roleLabel}
        </span>
      </div>

      <div role="tablist" aria-label={t("title")} className="no-scrollbar mt-8 -mx-4 flex gap-1 overflow-x-auto border-b border-navy-900/10 px-4 sm:mx-0 sm:px-0">
        {tabs.map((id) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={clsx(
              "-mb-px min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors",
              tab === id ? "border-sun-500 text-navy-900" : "border-transparent text-navy-900/55 hover:text-navy-900",
            )}
          >
            {t(TAB_KEY[id])}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-8">
        {tab === "overview" && (live ? <LiveOverview live={live} /> : <Overview onGo={tabs.includes("company") ? setTab : undefined} />)}
        {tab === "learning" && (live ? <LiveOverview live={live} /> : <Learning />)}
        {tab === "billing" && (live ? <LiveBilling live={live} /> : <Billing />)}
        {tab === "company" && (live ? <LiveCompany live={live} /> : <Company />)}
        {tab === "profile" && (live ? <LiveProfile live={live} /> : <Profile />)}
      </div>
    </div>
  );
}

function Panel({ title, children, className, tag = true }: { title: string; children: React.ReactNode; className?: string; tag?: boolean }) {
  return (
    <section className={clsx("rounded-2xl border border-navy-900/10 bg-white p-6", className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {tag && <DemoTag />}
      </div>
      {children}
    </section>
  );
}

function SubscriptionCard({ onGo }: { onGo?: (t: Tab) => void }) {
  const t = useTranslations("dashboard");
  const th = useTranslations("home");
  const locale = useLocale();
  const used = demoEmployees.length + 1;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white sm:p-8">
      <div aria-hidden className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(240_188_85/0.45),transparent_65%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/60">{t("subStatus")}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold">
            <CheckCircle2 className="text-sun-300" size={24} aria-hidden />
            {t("active")}
          </p>
        </div>
        <DemoTag />
      </div>
      <dl className="relative mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-white/55">{t("plan")}</dt>
          <dd className="mt-1 font-semibold">{th("planMonthly")}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/55">{t("nextRenewal")}</dt>
          <dd className="mt-1 font-semibold">{formatDate(demoMember.renewsAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/55">{t("seats")}</dt>
          <dd className="mt-1 font-semibold">{t("seatsUsed", { used, total: demoMember.seatsTotal })}</dd>
        </div>
      </dl>
      <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-sun-400" style={{ width: `${(used / demoMember.seatsTotal) * 100}%` }} />
      </div>
      {onGo && (
        <button type="button" onClick={() => onGo("company")} className="relative mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-sun-300 hover:text-sun-200">
          <UserPlus size={18} aria-hidden />
          {t("inviteTitle")}
        </button>
      )}
    </section>
  );
}

function Stats() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const items = [
    { icon: Clock, label: t("watchTime"), value: tc("minutes", { count: demoMember.watchMinutes }) },
    { icon: CheckCircle2, label: t("completed"), value: String(demoMember.completed) },
    { icon: Flame, label: t("streak"), value: t("days", { count: demoMember.streak }) },
  ];
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl border border-navy-900/10 bg-white p-5">
          <dt className="flex items-center gap-2 text-sm text-navy-900/60">
            <Icon size={16} className="text-sun-700" aria-hidden />
            {label}
          </dt>
          <dd className="mt-2 font-serif text-3xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WeeklyChart() {
  const t = useTranslations("dashboard");
  return (
    <Panel title={t("weeklyChart")}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyMinutes} margin={{ left: -18, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="wk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F0BC55" stopOpacity={0.55} />
                <stop offset="1" stopColor="#F0BC55" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#0D1A3A14" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#0D1A3A99", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#0D1A3A99", fontSize: 12 }} />
            <Tooltip cursor={{ stroke: "#0D1A3A33" }} contentStyle={{ borderRadius: 12, border: "1px solid #0D1A3A1A" }} />
            <Area type="monotone" dataKey="minutes" stroke="#C88A1E" strokeWidth={2.5} fill="url(#wk)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function VideoList({ ids }: { ids: string[] }) {
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ul className="space-y-3">
      {ids.map((id) => {
        const v = videos.find((x) => x.id === id)!;
        const hue = categories.find((c) => c.id === v.category)?.hue ?? 220;
        return (
          <li key={id} className="flex items-center gap-4">
            <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-lg">
              <VideoThumb hue={hue} character={v.character} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{pick(v.title, locale)}</p>
              <p className="text-sm text-navy-900/55">{tc("minutes", { count: v.minutes })}</p>
              {v.progress !== undefined && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sky-100" aria-hidden>
                  <div className="h-full bg-sun-500" style={{ width: `${v.progress}%` }} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Overview({ onGo }: { onGo?: (t: Tab) => void }) {
  const t = useTranslations("dashboard");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <SubscriptionCard onGo={onGo} />
        <Stats />
        <WeeklyChart />
      </div>
      <div className="space-y-6">
        <Panel title={t("history")}>
          <VideoList ids={demoMember.history} />
        </Panel>
        <Panel title={t("favorites")}>
          <VideoList ids={demoMember.favorites} />
        </Panel>
      </div>
    </div>
  );
}

function Learning() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Stats />
        <WeeklyChart />
      </div>
      <Panel title={t("completedCourses")}>
        <ul className="space-y-5">
          {demoMember.completedCourses.map((c) => {
            const cat = categories.find((x) => x.id === c.id)!;
            const pct = Math.round((c.done / c.total) * 100);
            return (
              <li key={c.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{pick(cat.name, locale)}</span>
                  <span className="tabular-nums text-navy-900/60">
                    {c.done}/{c.total}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={pick(cat.name, locale)}>
                  <div className="h-full rounded-full bg-navy-700" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function Billing() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [toast, setToast] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  return (
    <div className="space-y-6">
      <SubscriptionCard />
      <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm text-navy-900/70">
            {cancelled ? t("cancelled") + " — " : ""}
            {t("cancelNote", { date: formatDate(demoMember.renewsAt, locale) })}
          </p>
          <button
            type="button"
            disabled={cancelled}
            onClick={() => setCancelled(true)}
            className="min-h-11 rounded-xl border border-navy-900/20 px-4 text-sm font-semibold hover:bg-sky-100 disabled:opacity-50"
          >
            {t("cancelPlan")}
          </button>
        </div>
      </section>
      <Panel title={t("paymentHistory")}>
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-navy-900/55">
              <tr className="border-b border-navy-900/10">
                <th className="py-3 font-medium">{t("date")}</th>
                <th className="py-3 font-medium">{t("description")}</th>
                <th className="py-3 font-medium">{t("method")}</th>
                <th className="py-3 text-right font-medium">{t("amount")}</th>
                <th className="py-3 font-medium">{t("status")}</th>
                <th className="py-3 font-medium">{t("receipt")}</th>
              </tr>
            </thead>
            <tbody>
              {demoPayments.map((p) => (
                <tr key={p.id} className="border-b border-navy-900/6 last:border-0">
                  <td className="py-3.5 whitespace-nowrap">{formatDate(p.date, locale)}</td>
                  <td className="py-3.5">{pick(p.desc, locale)}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1.5">
                      {p.method === "card" ? <CreditCard size={15} aria-hidden /> : <Landmark size={15} aria-hidden />}
                      {t(p.method === "card" ? "card" : "bank")}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-semibold tabular-nums">{formatYen(p.amount, locale)}</td>
                  <td className="py-3.5">
                    <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">{t("paid")}</span>
                  </td>
                  <td className="py-3.5">
                    <button
                      type="button"
                      onClick={() => setToast(t("receiptSent", { email: demoMember.email }))}
                      className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-navy-700 hover:underline"
                    >
                      <Receipt size={15} aria-hidden />
                      {t("receiptSend")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p role="status" className="mt-3 min-h-5 text-sm text-leaf">
          {toast}
        </p>
      </Panel>
    </div>
  );
}

function Company() {
  const t = useTranslations("dashboard");
  const th = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [employees, setEmployees] = useState(demoEmployees.map((e) => ({ ...e })));
  const [seats, setSeats] = useState(demoMember.seatsTotal);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const used = employees.length + 1;
  const monthly = quote(seats, "monthly");

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg({ ok: false, text: t("inviteInvalid") });
    if (used >= seats) return setMsg({ ok: false, text: t("inviteFull") });
    setEmployees((list) => [...list, { name: "—", email, progress: 0, last: "", invited: true }]);
    setMsg({ ok: true, text: t("inviteSent", { email }) });
    setEmail("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
          <h2 className="text-lg font-bold">{t("seats")}</h2>
          <p className="mt-2 font-serif text-3xl font-bold tabular-nums">{t("seatsUsed", { used, total: seats })}</p>
          <p className="mt-1 text-sm text-navy-900/60">
            {formatYen(monthly.total, locale)}
            {tc("perMonth")} · {tc("taxIncluded")}
          </p>
          <button type="button" onClick={() => setSeats((s) => s + 1)} className="btn-3d mt-5 w-full">
            {t("addSeats")} (+{formatYen(3000, locale)}
            {tc("perMonth")})
          </button>
          <p className="mt-2 text-xs text-navy-900/50">{th("planSeat", { price: formatYen(3000, locale) })}</p>
        </section>
        <form onSubmit={invite} noValidate className="rounded-2xl border border-navy-900/10 bg-white p-6">
          <h2 className="text-lg font-bold">{t("inviteTitle")}</h2>
          <p className="mt-2 text-sm text-navy-900/65">{t("inviteBody")}</p>
          <label htmlFor="invite-email" className="mt-5 block text-sm font-medium">
            {t("inviteEmail")}
          </label>
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={msg?.ok === false}
            aria-describedby="invite-msg"
            className="mt-2 h-12 w-full rounded-xl border border-navy-900/20 px-4 focus:border-navy-700 focus:outline-none"
            placeholder="name@company.co.jp"
          />
          <p id="invite-msg" role="status" className={clsx("mt-2 min-h-5 text-sm", msg?.ok ? "text-leaf" : "text-seal")}>
            {msg?.text}
          </p>
          <button type="submit" className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800">
            <Mail size={18} aria-hidden />
            {t("inviteSend")}
          </button>
        </form>
      </div>
      <Panel title={t("employee")}>
        <ul className="divide-y divide-navy-900/8">
          {employees.map((e) => (
            <li key={e.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-navy-700" aria-hidden>
                {e.invited ? <Mail size={16} /> : e.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.invited ? e.email : e.name}</p>
                <p className="truncate text-sm text-navy-900/55">{e.invited ? t("invited") : e.email}</p>
              </div>
              {!e.invited && (
                <div className="w-full sm:w-44">
                  <div className="flex justify-between text-xs text-navy-900/55">
                    <span>{t("progress")}</span>
                    <span className="tabular-nums">{e.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sky-100" aria-hidden>
                    <div className="h-full rounded-full bg-sun-500" style={{ width: `${e.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-navy-900/45">
                    {t("lastActive")}: {formatDate(e.last, locale)}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Profile() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const [saved, setSaved] = useState(false);
  const field = "mt-2 h-12 w-full rounded-xl border border-navy-900/20 px-4 focus:border-navy-700 focus:outline-none";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      className="max-w-xl space-y-5 rounded-2xl border border-navy-900/10 bg-white p-6"
    >
      <div>
        <label htmlFor="p-name" className="text-sm font-medium">{t("profileName")}</label>
        <input id="p-name" autoComplete="name" defaultValue={demoMember.name} className={field} />
      </div>
      <div>
        <label htmlFor="p-email" className="text-sm font-medium">{t("profileEmail")}</label>
        <input id="p-email" type="email" autoComplete="email" defaultValue={demoMember.email} className={field} />
      </div>
      <div>
        <label htmlFor="p-company" className="text-sm font-medium">{t("profileCompany")}</label>
        <input id="p-company" autoComplete="organization" defaultValue={demoMember.company} className={field} />
      </div>
      <div>
        <label htmlFor="p-lang" className="text-sm font-medium">{t("profileLang")}</label>
        <select id="p-lang" defaultValue={locale} className={field}>
          {locales.map((l) => (
            <option key={l} value={l}>{localeNames[l]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn-3d">{tc("save")}</button>
        <p role="status" className="text-sm text-leaf">{saved ? t("profileSaved") : ""}</p>
      </div>
    </form>
  );
}
