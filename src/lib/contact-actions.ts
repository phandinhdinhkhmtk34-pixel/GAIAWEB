"use server";

import { routing } from "@/i18n/routing";
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { ADMIN_NOTIFY, sendEmail } from "./email";
import { siteUrl } from "./supabase/config";

export type ContactState = { error?: string; ok?: boolean } | undefined;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOPICS = ["plan", "payment", "account", "video", "other"];

export async function sendInquiryAction(_: ContactState, fd: FormData): Promise<ContactState> {
  // Honeypot: a hidden field people never fill in; bots usually do.
  if (String(fd.get("website") ?? "")) return { ok: true };
  if (!hasServiceRole) return { error: "generic" };
  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const company = String(fd.get("company") ?? "").trim().slice(0, 150);
  const topic = TOPICS.includes(String(fd.get("topic"))) ? String(fd.get("topic")) : "other";
  const message = String(fd.get("message") ?? "").trim().slice(0, 4000);
  const l = String(fd.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
  if (!name || !message) return { error: "required" };
  if (!EMAIL.test(email)) return { error: "emailFormat" };

  const db = createAdminClient();
  // At most 3 messages per address per hour.
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await db.from("inquiries").select("id", { count: "exact", head: true }).eq("email", email).gt("created_at", since);
  if ((count ?? 0) >= 3) return { error: "tooMany" };
  const { error } = await db.from("inquiries").insert({ name, email, company, topic, message, locale });
  if (error) return { error: "generic" };
  if (ADMIN_NOTIFY) {
    await sendEmail(ADMIN_NOTIFY, `【GAIA】お問い合わせ: ${name}`, [`${name}（${company || "-"}）<${email}>`, `種別: ${topic}`, message], {
      href: `${siteUrl()}/ja/admin`,
      label: "管理センターで確認",
    });
  }
  return { ok: true };
}
