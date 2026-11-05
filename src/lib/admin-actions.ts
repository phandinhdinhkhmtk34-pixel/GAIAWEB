"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { getViewer, type AdminRole } from "./auth";
import { createAdminClient, hasServiceRole } from "./supabase/admin";

export type AdminActionState = { error?: string; ok?: string; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: AdminRole[] = ["super", "accounting", "editor"];

function localeOf(fd: FormData) {
  const l = String(fd.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}

/** Every admin action requires a Super admin who has passed 2-step verification in this session. */
async function requireSuper() {
  const v = await getViewer();
  if (!v || v.adminRole !== "super" || v.aal !== "aal2" || !hasServiceRole) return null;
  return v;
}

export async function grantAdminAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await requireSuper();
  if (!me) return { error: "forbidden" };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "") as AdminRole;
  if (!EMAIL.test(email)) return { error: "emailFormat" };
  if (!ROLES.includes(role)) return { error: "generic" };

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile) {
    if (profile.id === me.id) return { error: "self" };
    const { error } = await db.from("admins").upsert({ user_id: profile.id, role }, { onConflict: "user_id" });
    if (error) return { error: "generic" };
  } else {
    // Not registered yet: they become an admin automatically when they sign up with this email.
    const { error } = await db.from("admin_bootstrap").upsert({ email, role }, { onConflict: "email" });
    if (error) return { error: "generic" };
  }
  await db.from("audit_log").insert({ actor_id: me.id, action: "grant_admin", target: email, details: { role, pending: !profile } });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: profile ? "adminGranted" : "adminPending", email };
}

export async function revokeAdminAction(fd: FormData) {
  const me = await requireSuper();
  if (!me) return;
  const userId = String(fd.get("userId") ?? "");
  const email = String(fd.get("email") ?? "").toLowerCase();
  if (!userId || userId === me.id) return; // never lock yourself out
  const db = createAdminClient();
  if (userId !== "pending") await db.from("admins").delete().eq("user_id", userId);
  if (email) await db.from("admin_bootstrap").delete().eq("email", email);
  await db.from("audit_log").insert({ actor_id: me.id, action: "revoke_admin", target: email || userId });
  revalidatePath(`/${localeOf(fd)}/admin`);
}
