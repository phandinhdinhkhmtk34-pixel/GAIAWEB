import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/print-button";
import { renderLegal } from "@/components/legal-render";

const yen = (n: number) => `¥${new Intl.NumberFormat("ja-JP").format(n)}`;
const jpDate = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(iso));
const jpDateTime = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Tokyo",
  }).format(new Date(iso)) + "（日本時間）";

/** A short, readable device name from a user-agent string. */
function device(ua: string) {
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" / ") || "—";
}

export type ContractRow = {
  contract_no: string; org_id: string | null; org_name: string; email: string; method: string; period: string; seats: number;
  amount_jpy: number; terms_text: string; contract_text: string; ip: string; user_agent: string; agreed_at: string;
  customer_kind: string; customer_name: string; customer_address: string; representative: string; contact_name: string;
  subscription_id: string | null;
};

export type ContractSub = {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
} | null;
export type ContractIssuer = { issuer_name: string; issuer_address: string; issuer_phone: string; invoice_reg_no: string } | null;

/** The printable サービス利用契約書 (always Japanese). Data comes from the agreement row recorded at checkout. */
export function ContractDocument({
  a,
  sub,
  issuer,
  backHref,
  backLabel,
  printLabel,
}: {
  a: ContractRow;
  sub: ContractSub;
  issuer: ContractIssuer;
  backHref: "/dashboard" | "/admin";
  backLabel: string;
  printLabel: string;
}) {
  const company = a.customer_kind === "company";
  const annual = a.period === "annual";
  const card = a.method === "card";
  const per = annual ? "年" : "月";
  const extra = Math.max(0, a.seats - 1);
  const tax = Math.floor((a.amount_jpy * 10) / 110);
  const active = sub?.status === "active";
  const ended = sub && !active && sub.status !== "pending_payment";
  const status = active
    ? { label: "契約中", tone: "bg-leaf/12 text-leaf ring-leaf/30" }
    : ended
      ? { label: "契約終了", tone: "bg-navy-900/8 text-navy-900/70 ring-navy-900/15" }
      : { label: "お支払い確認待ち", tone: "bg-sun-200/70 text-sun-700 ring-sun-500/30" };
  const term =
    active && sub?.current_period_start && sub.current_period_end
      ? `${jpDate(sub.current_period_start)} 〜 ${jpDate(sub.current_period_end)}`
      : `お支払いの確認日から ${annual ? "12 か月" : "1 か月"}`;
  const party = company ? "御中" : "様";
  const provider = issuer?.issuer_name || "GAIA LAB 運営会社";

  const row = (label: string, value: React.ReactNode) => (
    <tr className="border-b border-navy-900/10 last:border-0">
      <th scope="row" className="w-40 bg-sky-50 px-4 py-3 text-left align-top text-[13px] font-semibold text-navy-900/80 print:bg-transparent">{label}</th>
      <td className="px-4 py-3 align-top">{value}</td>
    </tr>
  );
  const article = (n: number, title: string, body: React.ReactNode) => (
    <section className="mt-7 break-inside-avoid">
      <h2 className="font-bold">第{n}条（{title}）</h2>
      <div className="mt-2 leading-relaxed text-navy-950/90">{body}</div>
    </section>
  );

  return (
    <main className="min-h-dvh bg-sky-50 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="font-semibold text-navy-700 underline-offset-4 hover:underline">
          ← {backLabel}
        </Link>
        <PrintButton label={printLabel} />
      </div>

      <article
        lang="ja"
        className="mx-auto max-w-[820px] bg-white px-6 py-10 text-[15px] text-navy-950 shadow-[0_20px_50px_-30px_rgb(13_26_58/0.5)] ring-1 ring-navy-900/10 sm:px-14 sm:py-14 print:max-w-none print:px-0 print:py-0 print:text-[12.5px] print:shadow-none print:ring-0"
      >
        {/* Masthead */}
        <header className="border-b-2 border-navy-950 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-xs font-bold tracking-[0.3em] text-sun-700">GAIA LAB</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${status.tone} print:hidden`}>{status.label}</span>
          </div>
          <h1 className="mt-4 text-center font-serif text-3xl font-bold tracking-[0.25em] sm:text-4xl">サービス利用契約書</h1>
          <p className="mt-2 text-center text-xs tracking-widest text-navy-900/70">（電子契約）</p>
          <dl className="mt-6 flex flex-wrap justify-end gap-x-8 gap-y-1 text-sm">
            <div><dt className="inline text-navy-900/70">契約番号　</dt><dd className="inline font-mono font-semibold">{a.contract_no}</dd></div>
            <div><dt className="inline text-navy-900/70">締結日　</dt><dd className="inline">{jpDate(a.agreed_at)}</dd></div>
          </dl>
        </header>

        <p className="mt-8 leading-loose">
          {provider}（以下「甲」という。）と {a.customer_name}（以下「乙」という。）は、甲が提供する動画研修サービス「GAIA LAB」（以下「本サービス」という。）の利用について、次のとおり契約（以下「本契約」という。）を締結する。
        </p>

        {article(1, "契約の内容", (
          <>
            <p>甲は乙に対し、次の条件で本サービスを提供し、乙はその対価を支払う。</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse border-y border-navy-900/20 text-sm">
                <tbody>
                  {row("サービス名", "GAIA LAB（動画研修サービス）")}
                  {row("プラン", `${annual ? "年額" : "月額"}プラン`)}
                  {row("利用アカウント数", `${a.seats} アカウント${extra ? `（基本 1 ＋ 追加 ${extra}）` : ""}`)}
                  {row("利用料金", (
                    <>
                      <span className="font-serif text-lg font-bold tabular-nums">{yen(a.amount_jpy)}</span>
                      <span className="ml-1">／{per}（税込）</span>
                      <span className="mt-0.5 block text-xs text-navy-900/70">うち消費税（10%）{yen(tax)}</span>
                    </>
                  ))}
                  {row("お支払い方法", card ? "クレジットカード（Stripe による決済）" : "銀行振込")}
                  {row("契約期間", term)}
                  {row("更新", card ? `契約期間の満了時に自動更新（${per}ごと）` : "契約期間の満了までに次期間の料金を振り込むことにより更新")}
                </tbody>
              </table>
            </div>
          </>
        ))}

        {article(2, "適用される規定", (
          <p>本契約には、本契約書に添付する別紙1「利用規約」および別紙2「ご契約について」（いずれも乙が同意した時点の内容）が適用される。本契約書の記載と別紙の内容が異なる場合は、本契約書の記載が優先する。</p>
        ))}

        {article(3, "契約の成立", (
          <p>本契約は、乙が本サービスの申し込み画面において前条の規定に同意のうえ申し込みを行い、甲が利用料金の支払いを確認した時点で成立する。乙が法人の場合、申し込みを行った者は乙を代表して申し込む権限を有することを表明する。</p>
        ))}

        {article(4, "解約", (
          <p>乙は、マイページから自動更新を停止することにより、契約期間の満了をもって本契約を終了できる。契約期間中の利用料金の返金は、別紙1に定める場合を除き行わない。</p>
        ))}

        {article(5, "電子契約", (
          <p>甲および乙は、本契約を電磁的方法により締結し、末尾の電子同意記録をもって署名・押印に代えることに合意する。本契約書は電磁的記録であるため、印紙税の課税対象とならない。</p>
        ))}

        <p className="mt-8 leading-relaxed">本契約の成立を証するため、本書を電磁的記録により作成し、甲乙それぞれがこれを保管する。</p>

        {/* Parties */}
        <section className="mt-10 grid gap-6 break-inside-avoid sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-xl border border-navy-900/15 p-5">
            <p className="text-xs font-bold tracking-widest text-sun-700">甲（サービス提供者）</p>
            <p className="mt-3 text-base font-semibold">{provider}</p>
            {issuer?.issuer_address && <p className="mt-1 text-sm">{issuer.issuer_address}</p>}
            {issuer?.issuer_phone && <p className="mt-1 text-sm">TEL {issuer.issuer_phone}</p>}
            {issuer?.invoice_reg_no && <p className="mt-1 text-sm">登録番号 {issuer.invoice_reg_no}</p>}
          </div>
          <div className="rounded-xl border border-navy-900/15 p-5">
            <p className="text-xs font-bold tracking-widest text-sun-700">乙（契約者・{company ? "法人" : "個人"}）</p>
            <p className="mt-3 text-base font-semibold">{a.customer_name} {party}</p>
            <p className="mt-1 text-sm">{a.customer_address}</p>
            {company && a.representative && <p className="mt-1 text-sm">代表者　{a.representative}</p>}
            {company && a.contact_name && <p className="mt-1 text-sm">ご担当者　{a.contact_name}</p>}
            <p className="mt-1 text-sm break-all">{a.email}</p>
          </div>
        </section>

        {/* Consent record */}
        <section className="mt-8 break-inside-avoid rounded-xl bg-navy-950 p-6 text-white print:border print:border-navy-950 print:bg-white print:text-navy-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold tracking-widest">電子同意記録</h2>
              <p className="mt-1 text-xs text-white/70 print:text-navy-900/70">乙は以下の日時に、別紙1・別紙2の全文を確認のうえ「同意します」を選択して申し込みました。</p>
            </div>
            <span
              aria-hidden
              className="flex h-[72px] w-[72px] shrink-0 -rotate-12 flex-col items-center justify-center rounded-full border-[3px] border-[#d6453d] text-center font-serif text-[11px] leading-tight font-bold text-[#ff6b61] print:text-[#d6453d]"
            >
              電子契約
              <span className="my-0.5 h-px w-10 bg-current" />
              同意済
            </span>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-white/65 print:text-navy-900/70">同意日時</dt><dd className="font-mono">{jpDateTime(a.agreed_at)}</dd>
            <dt className="text-white/65 print:text-navy-900/70">同意者</dt><dd className="break-all">{a.contact_name || a.customer_name}（{a.email}）</dd>
            <dt className="text-white/65 print:text-navy-900/70">接続元 IP</dt><dd className="font-mono">{a.ip || "—"}</dd>
            <dt className="text-white/65 print:text-navy-900/70">端末</dt><dd>{device(a.user_agent)}</dd>
            <dt className="text-white/65 print:text-navy-900/70">契約番号</dt><dd className="font-mono">{a.contract_no}</dd>
          </dl>
        </section>

        {/* Appendices: the exact text agreed to */}
        <section className="mt-14 border-t-2 border-navy-950 pt-8 print:break-before-page">
          <p className="text-xs font-bold tracking-widest text-sun-700">別紙1</p>
          <div className="mt-2 text-sm">{renderLegal(a.terms_text, { nested: true })}</div>
        </section>
        <section className="mt-12 border-t-2 border-navy-950 pt-8 print:break-before-page">
          <p className="text-xs font-bold tracking-widest text-sun-700">別紙2</p>
          <div className="mt-2 text-sm">{renderLegal(a.contract_text, { nested: true })}</div>
        </section>
        <p className="mt-12 text-right text-xs text-navy-900/60">以上</p>
      </article>
    </main>
  );
}
