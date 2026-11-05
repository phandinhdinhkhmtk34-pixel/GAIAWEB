"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { ShieldCheck, Clock } from "lucide-react";
import { grantAdminAction, revokeAdminAction, type AdminActionState } from "@/lib/admin-actions";

export interface LiveAdmin {
  role: "super" | "accounting" | "editor";
  meId: string;
  serviceRole: boolean;
  counts: { users: number; companies: number };
  members: { name: string; type: "company" | "individual"; seats: number; status: "active" | "pending" | "cancelled" | "expired" | "none"; since: string }[];
  admins: { userId: string | null; email: string; name: string; role: "super" | "accounting" | "editor"; pending: boolean }[];
  audit: { who: string; what: string; when: string }[];
}

const ERR: Record<string, string> = { forbidden: "errForbidden", self: "errSelf", emailFormat: "errEmail", generic: "errGeneric" };

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
