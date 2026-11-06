"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Users, BadgeCheck, Building2, Repeat, Wallet, PiggyBank, Hourglass, Film, Eye, Check, Undo2, FlaskConical, ShieldCheck, EyeOff,
} from "lucide-react";
import {
  adminKpis, adminMembers, auditLog, categories, monthlyRevenue, pendingTransfers, viewsByCategory, videos, pick,
} from "@/lib/demo-data";
import { DEFAULT_PRICES, quote } from "@/lib/pricing";
import { formatDate, formatDateTime, formatNumber, formatYen } from "@/lib/format";
import { DemoTag } from "./demo-banner";
import { SiteEditor } from "./site-editor";
import { LiveAdmins, LivePayments, PlanControls, SeatsEditor, VideoManager, type LiveAdmin } from "./admin-live";

export type { LiveAdmin };

type Role = "super" | "accounting" | "editor";
type Tab = "overview" | "payments" | "users" | "videos" | "content" | "audit" | "admins";

/** Same role → permission map the server will enforce in Phase 2 (RLS + route guards). */
const ACCESS: Record<Role, Tab[]> = {
  super: ["overview", "payments", "users", "videos", "content", "audit", "admins"],
  accounting: ["overview", "payments", "users", "audit"],
  editor: ["overview", "videos", "content"],
};
const TAB_KEY: Record<Tab, string> = {
  overview: "tabOverview",
  payments: "tabPayments",
  users: "tabUsers",
  videos: "tabVideos",
  content: "tabContent",
  audit: "tabAudit",
  admins: "tabAdmins",
};

export function AdminView({ live }: { live?: LiveAdmin }) {
  const t = useTranslations("admin");
  const [demoRole, setRole] = useState<Role>("super");
  const role: Role = live ? live.role : demoRole;
  const [tab, setTab] = useState<Tab>("overview");
  // The admins tab only exists once real accounts exist.
  const tabs = ACCESS[role].filter((id) => id !== "admins" || Boolean(live));
  const current = tabs.includes(tab) ? tab : "overview";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-navy-900/65">{t("subtitle")}</p>
        </div>
        {live ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3 py-1.5 text-sm text-white">
            <ShieldCheck size={15} className="text-sun-300" aria-hidden />
            {t(role === "super" ? "roleSuper" : role === "accounting" ? "roleAccounting" : "roleEditor")}
          </p>
        ) : (
        <div className="rounded-xl border border-dashed border-sun-500/60 bg-white p-3">
          <p id="role-label" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-sun-700">
            <FlaskConical size={13} aria-hidden />
            {t("role")}
          </p>
          <div role="radiogroup" aria-labelledby="role-label" className="inline-flex rounded-lg bg-sky-100 p-0.5">
            {(["super", "accounting", "editor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={clsx(
                  "min-h-10 rounded-md px-3 text-sm font-semibold",
                  role === r ? "bg-navy-900 text-white" : "text-navy-900/65 hover:text-navy-900",
                )}
              >
                {t(r === "super" ? "roleSuper" : r === "accounting" ? "roleAccounting" : "roleEditor")}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>

      <div role="tablist" aria-label={t("title")} className="no-scrollbar mt-8 -mx-4 flex gap-1 overflow-x-auto border-b border-navy-900/10 px-4 sm:mx-0 sm:px-0">
        {tabs.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={current === id}
            aria-controls="admin-panel"
            onClick={() => setTab(id)}
            className={clsx(
              "-mb-px min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold whitespace-nowrap",
              current === id ? "border-sun-500 text-navy-900" : "border-transparent text-navy-900/70 hover:text-navy-900",
            )}
          >
            {t(TAB_KEY[id])}
            {id === "payments" && (
              <span className="ml-2 rounded-full bg-seal px-1.5 py-0.5 text-[11px] text-white tabular-nums">{live ? live.billing.pending.length : pendingTransfers.length}</span>
            )}
          </button>
        ))}
      </div>

      <div id="admin-panel" role="tabpanel" className="pt-8">
        {current === "overview" && <Overview role={role} live={live} />}
        {current === "payments" && (live ? <LivePayments live={live} /> : <Payments />)}
        {current === "users" && <Members live={live} />}
        {current === "videos" && (live ? <VideoManager live={live} /> : <Videos />)}
        {current === "content" && (live?.site ? <SiteEditor initial={live.site} canEditPrices={live.role === "super"} /> : <Content />)}
        {current === "audit" && <Audit live={live} />}
        {current === "admins" && live && <LiveAdmins live={live} />}
      </div>
    </div>
  );
}

function Overview({ role, live }: { role: Role; live?: LiveAdmin }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const money = role !== "editor";
  const n = (v: number) => formatNumber(v, locale);
  const k = live?.kpis;
  const kpis = [
    { icon: Users, label: t("kpiUsers"), value: n(live ? live.counts.users : adminKpis.users) },
    { icon: BadgeCheck, label: t("kpiPaid"), value: n(k ? k.paid : adminKpis.paid) },
    { icon: Building2, label: t("kpiCompanies"), value: n(live ? live.counts.companies : adminKpis.companies) },
    { icon: Repeat, label: t("kpiActiveSubs"), value: n(k ? k.activeSubs : adminKpis.activeSubs) },
    { icon: Wallet, label: t("kpiMrr"), value: formatYen(k ? k.mrr : adminKpis.mrr, locale), money: true, lead: true },
    { icon: PiggyBank, label: t("kpiTotal"), value: formatYen(k ? k.total : adminKpis.total, locale), money: true },
    { icon: Hourglass, label: t("kpiPending"), value: n(k ? k.pending : adminKpis.pending), money: true },
    { icon: Film, label: t("kpiVideos"), value: n(k ? k.videos : adminKpis.videos) },
    { icon: Eye, label: t("kpiViews"), value: n(k ? k.views : adminKpis.views) },
  ].filter((k) => money || !k.money);

  const revenue = live?.charts ? live.charts.revenue : monthlyRevenue.map((m) => ({ ...m, label: m.month }));
  const views = live?.charts
    ? live.charts.views
    : viewsByCategory.map((v) => ({ name: pick(categories.find((c) => c.id === v.id)!.name, locale), views: v.views }));

  return (
    <div className="space-y-6">
      {!live && (
        <div className="flex flex-wrap items-center gap-2">
          <DemoTag />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, lead }) => (
          <div
            key={label}
            className={clsx(
              "rounded-2xl p-5",
              lead ? "col-span-2 bg-navy-900 text-white md:col-span-1 xl:col-span-2" : "border border-navy-900/10 bg-white",
            )}
          >
            <dt className={clsx("flex items-center gap-2 text-sm", lead ? "text-white/65" : "text-navy-900/70")}>
              <Icon size={16} className={lead ? "text-sun-300" : "text-sun-700"} aria-hidden />
              {label}
            </dt>
            <dd className={clsx("mt-2 font-serif font-bold tabular-nums", lead ? "text-4xl text-sun-300" : "text-2xl sm:text-3xl")}>{value}</dd>
          </div>
        ))}
      </dl>
      {!money && (
        <p className="flex items-center gap-2 text-sm text-navy-900/70">
          <EyeOff size={15} aria-hidden />
          {t("kpiMrr")}, {t("kpiTotal")}: {t("roleHidden")}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {money && (
          <ChartPanel title={t("revenueChart")} demo={!live}>
            <BarChart data={revenue} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#0D1A3A14" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#0D1A3A99", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: "#0D1A3A99", fontSize: 12 }} tickFormatter={(v: number) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1000 ? `${v / 1000}k` : String(v))} />
              <Tooltip formatter={(v) => formatYen(Number(v), locale)} cursor={{ fill: "#0D1A3A0A" }} contentStyle={{ borderRadius: 12 }} />
              <Bar dataKey="revenue" fill="#16264F" radius={[8, 8, 0, 0]} activeBar={{ fill: "#E2A030" }} />
            </BarChart>
          </ChartPanel>
        )}
        <ChartPanel title={t("viewsChart")} demo={!live}>
          <BarChart data={views} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
            <CartesianGrid horizontal={false} stroke="#0D1A3A14" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#0D1A3A99", fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: "#0D1A3A", fontSize: 12 }} />
            <Tooltip formatter={(v) => formatNumber(Number(v), locale)} cursor={{ fill: "#0D1A3A0A" }} contentStyle={{ borderRadius: 12 }} />
            <Bar dataKey="views" fill="#E2A030" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({ title, children, demo = true }: { title: string; children: React.ReactElement; demo?: boolean }) {
  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {demo && <DemoTag />}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Payments() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [list, setList] = useState(pendingTransfers);
  const [toast, setToast] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t("pendingTitle")}</h2>
        <DemoTag />
      </div>
      <p className="mt-2 max-w-3xl text-sm text-navy-900/65">{t("pendingBody")}</p>
      {list.length ? (
        <ul className="mt-6 divide-y divide-navy-900/8">
          {list.map((p) => (
            <li key={p.code} className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
              <div className="min-w-40">
                <p className="text-xs text-navy-900/70">{t("orderCode")}</p>
                <p className="font-mono font-semibold">{p.code}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.customer}</p>
                <p className="text-sm text-navy-900/70">
                  {t("requested")}: {formatDate(p.date, locale)} · {p.seats}
                </p>
              </div>
              <p className="font-serif text-xl font-bold tabular-nums">{formatYen(p.amount, locale)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setList((l) => l.filter((x) => x.code !== p.code))}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-navy-900/15 px-3 text-sm font-semibold hover:bg-sky-100"
                >
                  <Undo2 size={16} aria-hidden />
                  {t("reject")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setList((l) => l.filter((x) => x.code !== p.code));
                    setToast(t("approved", { code: p.code }));
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-leaf px-4 text-sm font-semibold text-white hover:brightness-110"
                >
                  <Check size={16} aria-hidden />
                  {t("approve")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl bg-sky-100 p-6 text-center text-navy-900/65">{t("noPending")}</p>
      )}
      <p role="status" className="mt-4 min-h-5 text-sm font-medium text-leaf">
        {toast}
      </p>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-leaf/10 text-leaf",
  pending: "bg-sun-200 text-sun-700",
  cancelled: "bg-sky-100 text-navy-700",
  expired: "bg-seal/10 text-seal",
};

function Members({ live }: { live?: LiveAdmin }) {
  const t = useTranslations("admin");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("users")}</h2>
        {!live && <DemoTag />}
      </div>
      {live && <p className="mb-4 max-w-3xl text-sm text-navy-900/65">{t("seatsHelp")}</p>}
      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-navy-900/70">
            <tr className="border-b border-navy-900/10">
              <th className="py-3 font-medium">{t("customer")}</th>
              <th className="py-3 font-medium">{t("type")}</th>
              <th className="py-3 text-right font-medium">{td("seats")}</th>
              <th className="py-3 font-medium">{td("status")}</th>
              {live && live.role !== "editor" && <th className="py-3 text-right font-medium">{t("planColumn")}</th>}
              <th className="py-3 font-medium">{td("date")}</th>
            </tr>
          </thead>
          <tbody>
            {(live ? live.members : adminMembers).map((m, i) => (
              <tr key={`${m.name}-${i}`} className="border-b border-navy-900/6 last:border-0">
                <td className="py-3.5 font-semibold">{m.name}</td>
                <td className="py-3.5">{t(m.type === "company" ? "company" : "individual")}</td>
                <td className="py-3.5 text-right tabular-nums">
                  {live && live.role !== "editor" ? <SeatsEditor orgId={live.members[i].id} seats={m.seats} used={live.members[i].used} /> : m.seats}
                </td>
                <td className="py-3.5">
                  {m.status === "none" ? (
                    "—"
                  ) : (
                    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[m.status])}>{td(m.status)}</span>
                  )}
                </td>
                <td className="py-3.5 whitespace-nowrap">{formatDate(m.since, locale)}</td>
                {live && live.role !== "editor" && (
                  <td className="py-3.5">
                    <PlanControls orgId={live.members[i].id} status={live.members[i].status} planEnd={live.members[i].planEnd} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Videos() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("videosTitle")}</h2>
        <DemoTag />
      </div>
      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-navy-900/70">
            <tr className="border-b border-navy-900/10">
              <th className="py-3 font-medium">{t("videosTitle")}</th>
              <th className="py-3 font-medium">{tc("locked")}</th>
              <th className="py-3 font-medium">{t("published")}</th>
              <th className="py-3 text-right font-medium">{t("views")}</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v, i) => (
              <tr key={v.id} className="border-b border-navy-900/6 last:border-0">
                <td className="py-3.5">
                  <p className="font-semibold">{pick(v.title, locale)}</p>
                  <p className="text-xs text-navy-900/70">{pick(categories.find((c) => c.id === v.category)!.name, locale)}</p>
                </td>
                <td className="py-3.5">{v.premium ? <ShieldCheck size={17} className="text-navy-700" aria-label={tc("locked")} /> : "—"}</td>
                <td className="py-3.5">
                  <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", i === 7 ? "bg-sky-100 text-navy-700" : "bg-leaf/10 text-leaf")}>
                    {i === 7 ? t("draft") : t("published")}
                  </span>
                </td>
                <td className="py-3.5 text-right tabular-nums">{formatNumber(3200 - i * 211, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Content() {
  const t = useTranslations("admin");
  const th = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const initial = { title: th("heroTitle"), lead: th("heroLead"), base: DEFAULT_PRICES.baseMonthly, seat: DEFAULT_PRICES.seatMonthly };
  const [form, setForm] = useState(initial);
  const [published, setPublished] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(published);
  const q = quote(5, "monthly", { ...DEFAULT_PRICES, baseMonthly: form.base, seatMonthly: form.seat });
  const field = "mt-2 w-full rounded-xl border border-navy-900/20 px-4 py-3 focus:border-navy-700 focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPublished(form);
          setToast(t("publishedToast"));
        }}
        className="space-y-5 rounded-2xl border border-navy-900/10 bg-white p-6"
      >
        <div>
          <h2 className="text-lg font-bold">{t("contentTitle")}</h2>
          <p className="mt-1 text-sm text-navy-900/70">{t("contentBody")}</p>
        </div>
        <div>
          <label htmlFor="c-title" className="text-sm font-medium">{t("fieldHeroTitle")}</label>
          <input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
        </div>
        <div>
          <label htmlFor="c-lead" className="text-sm font-medium">{t("fieldHeroLead")}</label>
          <textarea id="c-lead" rows={4} value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-base" className="text-sm font-medium">{t("fieldPrice")}</label>
            <input id="c-base" type="number" min={0} step={100} inputMode="numeric" value={form.base} onChange={(e) => setForm({ ...form, base: Number(e.target.value) })} className={field} />
          </div>
          <div>
            <label htmlFor="c-seat" className="text-sm font-medium">{t("fieldSeat")}</label>
            <input id="c-seat" type="number" min={0} step={100} inputMode="numeric" value={form.seat} onChange={(e) => setForm({ ...form, seat: Number(e.target.value) })} className={field} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={() => setToast(t("draftToast"))} className="min-h-12 rounded-xl border border-navy-900/20 px-5 font-semibold hover:bg-sky-100">
            {t("saveDraft")}
          </button>
          <button type="submit" disabled={!dirty} className="btn-3d disabled:cursor-not-allowed disabled:opacity-50">
            {t("publish")}
          </button>
          {dirty && <span className="text-sm text-sun-700">{t("unsaved")}</span>}
        </div>
        <p role="status" className="min-h-5 text-sm font-medium text-leaf">{toast}</p>
      </form>

      <section aria-label={t("preview")} className="overflow-hidden rounded-2xl border border-navy-900/10 bg-sky-50">
        <p className="flex items-center justify-between border-b border-navy-900/10 bg-white px-5 py-3 text-sm font-semibold">
          {t("preview")}
          <DemoTag />
        </p>
        <div className="relative p-8">
          <div aria-hidden className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(247_213_138/0.6),transparent_65%)]" />
          <h3 className="relative font-serif text-3xl leading-snug font-bold">{form.title || "—"}</h3>
          <p className="relative mt-4 text-navy-900/75">{form.lead}</p>
          <div className="relative mt-8 rounded-2xl bg-navy-900 p-6 text-white">
            <p className="text-sm text-white/60">{th("planMonthly")}</p>
            <p className="mt-1 font-serif text-4xl font-bold text-sun-300 tabular-nums">
              {formatYen(form.base, locale)}
              <span className="ml-1 font-sans text-base font-normal text-white/60">{tc("perMonth")}</span>
            </p>
            <p className="mt-2 text-sm text-white/70">{th("planSeat", { price: formatYen(form.seat, locale) })}</p>
            <p className="mt-4 border-t border-white/10 pt-4 text-sm text-white/60">
              {th("calcPeople", { count: 5 })}: {formatYen(q.total, locale)}
              {tc("perMonth")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Audit({ live }: { live?: LiveAdmin }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("auditTitle")}</h2>
        {!live && <DemoTag />}
      </div>
      {live && live.audit.length === 0 && <p className="text-navy-900/70">{t("noAudit")}</p>}
      <ol className="space-y-4">
        {(live ? live.audit : auditLog).map((a, i) => (
          <li key={`${a.when}-${i}`} className="grid gap-1 border-l-2 border-navy-900/15 pl-4 sm:grid-cols-[180px_1fr_200px] sm:gap-4">
            <time dateTime={a.when} className="text-sm text-navy-900/70">
              {formatDateTime(a.when, locale)}
            </time>
            <span className="font-medium">{a.what}</span>
            <span className="text-sm text-navy-900/70">{a.who}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
