"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { CreditCard, Landmark, Copy, Check, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  addSeatsCardAction,
  cancelBankOrderAction,
  createBankOrderAction,
  setAutoRenewAction,
  startCardCheckoutAction,
  type BillingState,
} from "@/lib/billing-actions";
import { formatDate, formatYen } from "@/lib/format";

type Period = "monthly" | "annual";
type PriceSet = Record<Period, { base: number; seat: number; included: number }>;

export interface BankInfo {
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_number: string;
  account_holder_kana: string;
  transfer_note: string;
}

export interface CheckoutData {
  orgKind: "individual" | "company";
  orgName: string;
  prices: PriceSet;
  cardEnabled: boolean;
  bank: BankInfo;
  people: number;
  sub: { period: Period; seats: number; status: string; end: string | null; card: boolean; cancelAtPeriodEnd: boolean } | null;
  order: { code: string; amount: number; kind: "plan" | "renew" | "seats"; seats: number | null; period: Period | null; status: string; created: string } | null;
  pendingOrders: { code: string; amount: number; kind: string }[];
  initial: { period: Period; seats: number };
}

const total = (p: PriceSet[Period], seats: number) => p.base + Math.max(0, seats - p.included) * p.seat;

function ErrorText({ state }: { state: BillingState }) {
  const t = useTranslations("billing");
  if (!state?.error) return null;
  return <p role="alert" className="text-sm text-seal">{t(`errors.${state.error}`)}</p>;
}

export function CheckoutView({ data }: { data: CheckoutData }) {
  if (data.order) return <OrderDetails data={data} />;
  if (!data.sub || data.sub.status === "pending_payment") return <NewPlan data={data} />;
  return <ManagePlan data={data} />;
}

/* ---------------------------------------------------------------- new plan */

function NewPlan({ data }: { data: CheckoutData }) {
  const t = useTranslations("billing");
  const th = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>(data.initial.period);
  const [seats, setSeats] = useState(data.orgKind === "individual" ? 1 : Math.max(data.initial.seats, data.people));
  const [method, setMethod] = useState<"card" | "bank">(data.cardEnabled ? "card" : "bank");
  const [cardState, cardAction, cardPending] = useActionState<BillingState, FormData>(startCardCheckoutAction, undefined);
  const [bankState, bankAction, bankPending] = useActionState<BillingState, FormData>(createBankOrderAction, undefined);
  const p = data.prices[period];
  const amount = total(p, seats);

  return (
    <form action={method === "card" ? cardAction : bankAction} className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value="new" />
      <div className="space-y-8">
        {data.pendingOrders.length > 0 && (
          <p className="rounded-xl bg-sun-200/60 p-4 text-sm text-sun-700">
            {t("pendingExists")}{" "}
            <Link href={{ pathname: "/checkout", query: { order: data.pendingOrders[0].code } }} className="font-semibold underline">
              {data.pendingOrders[0].code}
            </Link>
          </p>
        )}
        <fieldset>
          <legend className="text-lg font-bold">{t("choosePeriod")}</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["monthly", "annual"] as const).map((v) => (
              <label
                key={v}
                className={clsx(
                  "cursor-pointer rounded-2xl border p-5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400",
                  period === v ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15 bg-white hover:border-navy-900/40",
                )}
              >
                <input type="radio" name="period" value={v} checked={period === v} onChange={() => setPeriod(v)} className="sr-only" />
                <span className="block font-semibold">{v === "annual" ? th("planAnnual") : th("planMonthly")}</span>
                <span className={clsx("mt-1 block font-serif text-2xl font-bold tabular-nums", period === v && "text-sun-300")}>
                  {formatYen(data.prices[v].base, locale)}
                  <span className="ml-1 font-sans text-sm font-normal opacity-70">{v === "annual" ? tc("perYear") : tc("perMonth")}</span>
                </span>
                {v === "annual" && <span className="mt-1 block text-xs opacity-75">{th("planAnnualBadge")}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {data.orgKind === "company" ? (
          <div>
            <label htmlFor="seats" className="text-lg font-bold">{t("chooseSeats")}</label>
            <p className="mt-1 text-sm text-navy-900/70">{t("seatsHint", { price: formatYen(p.seat, locale) })}</p>
            <input
              id="seats"
              name="seats"
              type="number"
              inputMode="numeric"
              min={Math.max(1, data.people)}
              max={500}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className="mt-3 h-12 w-32 rounded-xl border border-navy-900/20 px-4 text-lg tabular-nums focus:border-navy-700 focus:outline-none"
            />
          </div>
        ) : (
          <input type="hidden" name="seats" value="1" />
        )}

        <fieldset>
          <legend className="text-lg font-bold">{t("chooseMethod")}</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                { v: "card", icon: CreditCard, title: t("methodCard"), desc: t("methodCardDesc"), disabled: !data.cardEnabled },
                { v: "bank", icon: Landmark, title: t("methodBank"), desc: t("methodBankDesc"), disabled: false },
              ] as const
            ).map(({ v, icon: Icon, title, desc, disabled }) => (
              <label
                key={v}
                className={clsx(
                  "rounded-2xl border p-5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400",
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  method === v ? "border-navy-900 ring-2 ring-navy-900" : "border-navy-900/15 bg-white",
                )}
              >
                <input type="radio" name="method" value={v} checked={method === v} disabled={disabled} onChange={() => setMethod(v)} className="sr-only" />
                <Icon size={22} className="text-navy-700" aria-hidden />
                <span className="mt-2 block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-navy-900/65">{disabled ? t("cardSoon") : desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-3xl bg-navy-900 p-8 text-white lg:sticky lg:top-24" aria-live="polite">
        <p className="text-sm text-white/65">{t("summary")}</p>
        <p className="mt-2 font-semibold">{data.orgName}</p>
        <dl className="mt-6 space-y-2 text-sm text-white/80">
          <div className="flex justify-between gap-4"><dt>{t("baseLine", { included: p.included })}</dt><dd className="tabular-nums">{formatYen(p.base, locale)}</dd></div>
          {seats > p.included && (
            <div className="flex justify-between gap-4"><dt>{t("seatLine", { count: seats - p.included, price: formatYen(p.seat, locale) })}</dt><dd className="tabular-nums">{formatYen((seats - p.included) * p.seat, locale)}</dd></div>
          )}
        </dl>
        <p className="mt-6 border-t border-white/10 pt-5 text-sm text-white/65">{t("totalPer", { per: period === "annual" ? tc("perYear") : tc("perMonth") })}</p>
        <p className="font-serif text-4xl font-bold text-sun-300 tabular-nums">{formatYen(amount, locale)}</p>
        <p className="mt-1 text-xs text-white/65">{tc("taxIncluded")} · {t("taxNote", { tax: formatYen(Math.floor((amount * 10) / 110), locale) })}</p>
        <div className="mt-7 space-y-3">
          <ErrorText state={method === "card" ? cardState : bankState} />
          <button type="submit" disabled={cardPending || bankPending} className="btn-3d w-full disabled:opacity-60">
            {method === "card" ? t("payByCard") : t("orderByBank")}
          </button>
          <p className="flex items-start gap-2 text-xs text-white/65">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
            {method === "card" ? t("cardSafe") : t("bankAfter")}
          </p>
        </div>
      </aside>
    </form>
  );
}

/* ------------------------------------------------- bank order instructions */

function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("billing");
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy-900/8 py-3 last:border-0">
      <div className="min-w-0">
        <dt className="text-xs text-navy-900/70">{label}</dt>
        <dd className="font-semibold break-all select-all">{value || "—"}</dd>
      </div>
      {value && (
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(value).then(
              () => {
                setDone(true);
                setTimeout(() => setDone(false), 1500);
              },
              () => undefined,
            )
          }
          aria-label={`${t("copy")}: ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-navy-900/15 hover:bg-sky-100"
        >
          {done ? <Check size={16} className="text-leaf" aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
      )}
    </div>
  );
}

function OrderDetails({ data }: { data: CheckoutData }) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const o = data.order!;
  const b = data.bank;
  const paid = o.status === "verified";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl bg-navy-900 p-8 text-white">
        <p className="flex items-center gap-2 text-sm text-white/65">
          {paid ? <CheckCircle2 size={16} className="text-sun-300" aria-hidden /> : <Clock size={16} className="text-sun-300" aria-hidden />}
          {paid ? t("orderPaid") : o.status === "rejected" ? t("orderCancelled") : t("orderAwaiting")}
        </p>
        <p className="mt-4 text-sm text-white/65">{t("orderCode")}</p>
        <p className="font-mono text-3xl font-bold tracking-wider text-sun-300 select-all">{o.code}</p>
        <p className="mt-6 text-sm text-white/65">{t("amountToPay")}</p>
        <p className="font-serif text-4xl font-bold tabular-nums">{formatYen(o.amount, locale)}</p>
        <p className="mt-1 text-xs text-white/65">{t(`kind.${o.kind}`)}{o.seats ? ` · ${t("seatsCount", { count: o.seats })}` : ""}</p>
        {!paid && o.status === "awaiting" && <p className="mt-6 text-sm leading-relaxed text-white/80">{t("bankSteps")}</p>}
      </section>
      <section className="rounded-3xl border border-navy-900/10 bg-white p-8">
        <h2 className="text-lg font-bold">{t("bankAccount")}</h2>
        <dl className="mt-4">
          <CopyField label={t("bankName")} value={b.bank_name} />
          <CopyField label={t("branchName")} value={b.branch_name} />
          <CopyField label={t("accountType")} value={b.account_type} />
          <CopyField label={t("accountNumber")} value={b.account_number} />
          <CopyField label={t("accountHolder")} value={b.account_holder_kana} />
          <CopyField label={t("transferName")} value={`${o.code} `} />
        </dl>
        {b.transfer_note && <p className="mt-5 rounded-xl bg-sky-100 p-4 text-sm text-navy-900/75">{b.transfer_note}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn-ghost text-navy-900 hover:bg-sky-100">{t("toDashboard")}</Link>
          {o.status === "awaiting" && (
            <form action={cancelBankOrderAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="code" value={o.code} />
              <button type="submit" className="min-h-[52px] rounded-[14px] px-4 text-sm font-semibold text-seal hover:bg-seal/5">{t("cancelOrder")}</button>
            </form>
          )}
        </div>
        <p className="mt-4 text-xs text-navy-900/70">{formatDate(o.created, locale)}</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------ manage active plan */

function ManagePlan({ data }: { data: CheckoutData }) {
  const t = useTranslations("billing");
  const th = useTranslations("home");
  const locale = useLocale();
  const s = data.sub!;
  const p = data.prices[s.period];
  const [added, setAdded] = useState(1);
  const [cardState, cardAction, cardPending] = useActionState<BillingState, FormData>(addSeatsCardAction, undefined);
  const [bankState, bankAction, bankPending] = useActionState<BillingState, FormData>(createBankOrderAction, undefined);
  const [renewState, renewAction, renewPending] = useActionState<BillingState, FormData>(createBankOrderAction, undefined);
  const box = "rounded-2xl border border-navy-900/10 bg-white p-6";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl bg-navy-900 p-6 text-white sm:p-8 lg:col-span-2">
        <p className="text-sm text-white/60">{t("currentPlan")}</p>
        <p className="mt-2 text-2xl font-bold">
          {s.period === "annual" ? th("planAnnual") : th("planMonthly")} · {t("seatsCount", { count: s.seats })}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {s.card ? t("payingByCard") : t("payingByBank")} ·{" "}
          {s.end ? (s.cancelAtPeriodEnd ? t("endsOn", { date: formatDate(s.end, locale) }) : s.card ? t("renewsOn", { date: formatDate(s.end, locale) }) : t("validUntil", { date: formatDate(s.end, locale) })) : ""}
        </p>
      </section>

      {data.orgKind === "company" && (
        <form action={s.card ? cardAction : bankAction} className={box}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value="seats" />
          <h2 className="text-lg font-bold">{t("addSeats")}</h2>
          <p className="mt-1 text-sm text-navy-900/65">{s.card ? t("addSeatsCardHint") : t("addSeatsBankHint")}</p>
          <label htmlFor="added" className="mt-4 block text-sm font-medium">{t("addCount")}</label>
          <input id="added" name="added" type="number" min={1} max={500} value={added} onChange={(e) => setAdded(Math.max(1, Number(e.target.value) || 1))} className="mt-2 h-12 w-28 rounded-xl border border-navy-900/20 px-4 tabular-nums" />
          <p className="mt-3 text-sm text-navy-900/70">{t("seatPriceLine", { price: formatYen(p.seat, locale), count: added })}</p>
          <div className="mt-4 space-y-2">
            <ErrorText state={s.card ? cardState : bankState} />
            {cardState?.ok && <p role="status" className="text-sm text-leaf">{t("seatsAdded")}</p>}
            <button type="submit" disabled={cardPending || bankPending} className="btn-3d disabled:opacity-60">
              {s.card ? t("addSeatsPay") : t("addSeatsOrder")}
            </button>
          </div>
        </form>
      )}

      <section className={box}>
        <h2 className="text-lg font-bold">{t("renewal")}</h2>
        {s.card ? (
          <p className="mt-1 text-sm text-navy-900/65">{s.cancelAtPeriodEnd ? t("autoRenewOff") : t("autoRenewOn")}</p>
        ) : (
          <p className="mt-1 text-sm text-navy-900/65">{t("bankRenewHint")}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {!s.card && !s.cancelAtPeriodEnd && (
            <form action={renewAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="mode" value="renew" />
              <button type="submit" disabled={renewPending} className="btn-3d disabled:opacity-60">{t("renewOrder")}</button>
              <ErrorText state={renewState} />
            </form>
          )}
          <form action={setAutoRenewAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="on" value={s.cancelAtPeriodEnd ? "1" : "0"} />
            <button type="submit" className="min-h-[52px] rounded-[14px] border border-navy-900/20 px-5 text-sm font-semibold hover:bg-sky-100">
              {s.card ? (s.cancelAtPeriodEnd ? t("resume") : t("cancelPlan")) : s.cancelAtPeriodEnd ? t("bankResume") : t("bankCancel")}
            </button>
          </form>
        </div>
        {!s.cancelAtPeriodEnd && s.end && <p className="mt-3 text-xs text-navy-900/70">{t("cancelNote", { date: formatDate(s.end, locale) })}</p>}
      </section>
    </div>
  );
}
