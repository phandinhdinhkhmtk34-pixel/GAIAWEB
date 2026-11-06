"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { sendInquiryAction, type ContactState } from "@/lib/contact-actions";

export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendInquiryAction, undefined);
  const field = "mt-2 w-full rounded-xl border border-navy-900/20 bg-white px-4 py-3 focus:border-navy-700 focus:outline-none";
  if (state?.ok) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl border border-leaf/30 bg-leaf/5 p-6 text-navy-900">
        <CheckCircle2 className="mt-0.5 shrink-0 text-leaf" size={22} aria-hidden />
        {t("sent")}
      </p>
    );
  }
  return (
    <form action={action} noValidate className="grid gap-5 rounded-2xl border border-navy-900/10 bg-white p-6 sm:grid-cols-2 sm:p-8">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div>
        <label htmlFor="c-name" className="text-sm font-medium">{t("name")} *</label>
        <input id="c-name" name="name" autoComplete="name" required className={field} />
      </div>
      <div>
        <label htmlFor="c-email" className="text-sm font-medium">{t("email")} *</label>
        <input id="c-email" name="email" type="email" autoComplete="email" required className={field} />
      </div>
      <div>
        <label htmlFor="c-company" className="text-sm font-medium">{t("company")}</label>
        <input id="c-company" name="company" autoComplete="organization" className={field} />
      </div>
      <div>
        <label htmlFor="c-topic" className="text-sm font-medium">{t("topic")}</label>
        <select id="c-topic" name="topic" defaultValue="plan" className={field}>
          {(["plan", "payment", "account", "video", "other"] as const).map((k) => (
            <option key={k} value={k}>{t(`topics.${k}`)}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-message" className="text-sm font-medium">{t("message")} *</label>
        <textarea id="c-message" name="message" rows={6} required className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-3d disabled:opacity-60">{pending ? t("sending") : t("send")}</button>
        {state?.error && <p role="alert" className="text-sm text-seal">{t(`errors.${state.error}`)}</p>}
      </div>
    </form>
  );
}
