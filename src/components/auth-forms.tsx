"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { MailCheck, User, Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  forgotPasswordAction,
  setPasswordAction,
  signInAction,
  signUpAction,
  type FormState,
} from "@/lib/auth-actions";

const input =
  "mt-2 h-12 w-full rounded-xl border border-navy-900/20 bg-white px-4 text-navy-900 focus:border-navy-700 focus:outline-none aria-[invalid=true]:border-seal";

function ErrorText({ state, id }: { state: FormState; id: string }) {
  const t = useTranslations("auth.errors");
  return (
    <p id={id} role="alert" className="min-h-5 text-sm text-seal">
      {state?.error ? t(state.error) : ""}
    </p>
  );
}

function Field(props: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  invalid?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={props.id} className="text-sm font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        required={props.required ?? true}
        aria-invalid={props.invalid || undefined}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined}
        className={input}
      />
      {props.hint && (
        <p id={`${props.id}-hint`} className="mt-1.5 text-xs text-navy-900/55">
          {props.hint}
        </p>
      )}
    </div>
  );
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" name="email" type="email" autoComplete="email" label={t("email")} invalid={Boolean(state?.error)} />
      <Field id="password" name="password" type="password" autoComplete="current-password" label={t("password")} invalid={Boolean(state?.error)} />
      <ErrorText state={state} id="login-error" />
      <button type="submit" disabled={pending} className="btn-3d w-full disabled:opacity-70">
        {pending ? t("signingIn") : t("signIn")}
      </button>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/forgot-password" className="font-medium text-navy-700 underline-offset-4 hover:underline">
          {t("forgot")}
        </Link>
        <span>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-navy-700 underline-offset-4 hover:underline">
            {t("createAccount")}
          </Link>
        </span>
      </div>
    </form>
  );
}

export function SignupForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [kind, setKind] = useState<"individual" | "company">("company");
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, undefined);

  if (state?.ok === "checkEmail") return <CheckEmail email={state.email ?? ""} />;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <fieldset>
        <legend className="text-sm font-medium">{t("kindLabel")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(
            [
              { v: "company", icon: Building2, title: t("kindCompany"), desc: t("kindCompanyDesc") },
              { v: "individual", icon: User, title: t("kindIndividual"), desc: t("kindIndividualDesc") },
            ] as const
          ).map(({ v, icon: Icon, title, desc }) => (
            <label
              key={v}
              className={clsx(
                "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun-400",
                kind === v ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/15 bg-white hover:border-navy-900/40",
              )}
            >
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />
              <Icon size={20} aria-hidden className={kind === v ? "text-sun-300" : "text-navy-700"} />
              <span className="font-semibold">{title}</span>
              <span className={clsx("text-xs", kind === v ? "text-white/70" : "text-navy-900/55")}>{desc}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "company" && <Field id="orgName" name="orgName" autoComplete="organization" label={t("orgName")} />}
      <Field id="displayName" name="displayName" autoComplete="name" label={t("displayName")} />
      <Field id="email" name="email" type="email" autoComplete="email" label={t("email")} />
      <Field id="password" name="password" type="password" autoComplete="new-password" label={t("password")} hint={t("passwordHint")} />
      <ErrorText state={state} id="signup-error" />
      <button type="submit" disabled={pending} className="btn-3d w-full disabled:opacity-70">
        {pending ? t("signingUp") : t("signUp")}
      </button>
      <p className="text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-navy-700 underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}

function CheckEmail({ email }: { email: string }) {
  const t = useTranslations("auth");
  return (
    <div role="status" className="rounded-2xl border border-leaf/30 bg-leaf/5 p-6">
      <MailCheck className="text-leaf" size={28} aria-hidden />
      <h2 className="mt-3 text-xl font-bold">{t("checkEmailTitle")}</h2>
      <p className="mt-2 text-navy-900/75">{t("checkEmailBody", { email })}</p>
      <Link href="/login" className="mt-5 inline-flex font-semibold text-navy-700 underline-offset-4 hover:underline">
        {t("backToLogin")}
      </Link>
    </div>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, undefined);
  if (state?.ok) {
    return (
      <div role="status" className="rounded-2xl border border-leaf/30 bg-leaf/5 p-6">
        <MailCheck className="text-leaf" size={28} aria-hidden />
        <p className="mt-3 text-navy-900/80">{t("resetSent")}</p>
        <Link href="/login" className="mt-5 inline-flex font-semibold text-navy-700 underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Field id="email" name="email" type="email" autoComplete="email" label={t("email")} invalid={Boolean(state?.error)} />
      <ErrorText state={state} id="forgot-error" />
      <button type="submit" disabled={pending} className="btn-3d w-full disabled:opacity-70">
        {t("sendReset")}
      </button>
      <Link href="/login" className="inline-flex text-sm font-medium text-navy-700 underline-offset-4 hover:underline">
        {t("backToLogin")}
      </Link>
    </form>
  );
}

export function SetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Field id="password" name="password" type="password" autoComplete="new-password" label={t("newPassword")} hint={t("passwordHint")} invalid={Boolean(state?.error)} />
      <ErrorText state={state} id="setpw-error" />
      <button type="submit" disabled={pending} className="btn-3d w-full disabled:opacity-70">
        {t("savePassword")}
      </button>
    </form>
  );
}
