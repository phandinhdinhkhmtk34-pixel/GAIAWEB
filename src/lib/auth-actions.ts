"use server";

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured, siteUrl } from "./supabase/config";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function localeOf(fd: FormData) {
  const l = String(fd.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}

/** Only same-site relative paths, so a crafted ?next= cannot send people elsewhere. */
function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/** Map Supabase Auth errors to message keys under auth.errors. */
function errorKey(err: { message?: string; code?: string; status?: number }): string {
  const m = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  if (m.includes("invalid_credentials") || m.includes("invalid login")) return "invalidCredentials";
  if (m.includes("email_not_confirmed") || m.includes("not confirmed")) return "emailNotConfirmed";
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) return "alreadyRegistered";
  if (m.includes("weak_password") || m.includes("password should")) return "weakPassword";
  if (err.status === 429 || m.includes("rate limit")) return "rateLimited";
  return "generic";
}

function callbackUrl(next: string) {
  return `${siteUrl()}/api/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "generic" };
  const locale = localeOf(fd);
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "required" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: errorKey(error) };
  redirect(safeNext(fd.get("next"), `/${locale}/dashboard`));
}

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "generic" };
  const locale = localeOf(fd);
  const kind = fd.get("kind") === "company" ? "company" : "individual";
  const displayName = String(fd.get("displayName") ?? "").trim();
  const orgName = String(fd.get("orgName") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!displayName || !email || !password || (kind === "company" && !orgName)) return { error: "required" };
  if (!EMAIL.test(email)) return { error: "emailFormat" };
  if (password.length < 8) return { error: "weakPassword" };
  if (fd.get("agree") !== "on") return { error: "agreeRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user() trigger (supabase/migrations/0002).
      // terms_agreed_at: the time the person ticked "I agree" (kept on the account as evidence).
      data: { kind, display_name: displayName, org_name: kind === "company" ? orgName : displayName, locale, terms_agreed_at: new Date().toISOString() },
      emailRedirectTo: callbackUrl(`/${locale}/dashboard`),
    },
  });
  if (error) return { error: errorKey(error) };
  // Supabase hides "already registered" by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) return { error: "alreadyRegistered" };
  return { ok: "checkEmail", email };
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "generic" };
  const locale = localeOf(fd);
  const email = String(fd.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { error: "emailFormat" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl(`/${locale}/set-password`) });
  if (error && errorKey(error) === "rateLimited") return { error: "rateLimited" };
  // Same answer whether or not the address exists, so the form can't be used to discover accounts.
  return { ok: "resetSent" };
}

export async function setPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "generic" };
  const locale = localeOf(fd);
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "weakPassword" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Invited staff agree to the terms here, when they first set their password.
  const needsTerms = !user?.user_metadata?.terms_agreed_at;
  if (needsTerms && fd.get("agree") !== "on") return { error: "agreeRequired" };
  const { error } = await supabase.auth.updateUser({
    password,
    ...(needsTerms ? { data: { terms_agreed_at: new Date().toISOString() } } : {}),
  });
  if (error) return { error: errorKey(error) };
  redirect(`/${locale}/dashboard`);
}

export async function agreeTermsAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "generic" };
  const locale = localeOf(fd);
  if (fd.get("agree") !== "on") return { error: "agreeRequired" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { terms_agreed_at: new Date().toISOString() } });
  if (error) return { error: errorKey(error) };
  redirect(safeNext(fd.get("next"), `/${locale}/dashboard`));
}

export async function signOutAction(fd: FormData) {
  const locale = localeOf(fd);
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}`);
}
