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

/**
 * Super admins and accounting set how many seats a company has paid for.
 * Never below the people already using seats (members + pending invitations).
 */
export async function setSeatsAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await getViewer();
  if (!me || !me.adminRole || me.adminRole === "editor" || me.aal !== "aal2" || !hasServiceRole) return { error: "forbidden" };
  const orgId = String(fd.get("orgId") ?? "");
  const seats = Number(fd.get("seats"));
  if (!orgId || !Number.isInteger(seats) || seats < 1 || seats > 1000) return { error: "seatsInvalid" };

  const db = createAdminClient();
  const [{ count: members }, { count: pending }, { data: org }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db.from("invitations").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
    db.from("organizations").select("name, seat_limit").eq("id", orgId).maybeSingle(),
  ]);
  if (!org) return { error: "generic" };
  const used = (members ?? 0) + (pending ?? 0);
  if (seats < used) return { error: "seatsBelowUsed", email: String(used) };

  const { error } = await db.from("organizations").update({ seat_limit: seats }).eq("id", orgId);
  if (error) return { error: "generic" };
  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "set_seats",
    target: org.name,
    details: { org_id: orgId, from: org.seat_limit, to: seats },
  });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: "seatsSaved" };
}
