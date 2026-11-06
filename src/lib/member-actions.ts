"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { getViewer } from "./auth";
import { createClient } from "./supabase/server";
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { siteUrl } from "./supabase/config";

export type ActionState = { error?: string; ok?: string; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function localeOf(fd: FormData) {
  const l = String(fd.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}

/** Company manager invites an employee by email. Each employee takes one seat. */
export async function inviteEmployeeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer || viewer.memberRole !== "owner" || viewer.org.kind !== "company") return { error: "inviteNotOwner" };
  if (!hasServiceRole) return { error: "inviteNeedsSetup" };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "inviteInvalid" };
  const locale = localeOf(fd);

  const admin = createAdminClient();
  const [{ count: members }, { count: pending }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
    admin
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", viewer.org.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .neq("email", email),
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
  ]);
  if (existing) return { error: "inviteAlreadyMember" };
  if ((members ?? 0) + (pending ?? 0) >= viewer.org.seatLimit) return { error: "inviteFull" };

  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error: invErr } = await admin
    .from("invitations")
    .upsert({ org_id: viewer.org.id, email, invited_by: viewer.id, expires_at: expires, accepted_at: null }, { onConflict: "org_id,email" });
  if (invErr) return { error: "generic" };

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invited_org_id: viewer.org.id, locale },
    // Default Supabase invite emails put the session in the URL fragment; /accept-invite reads it in the browser.
    redirectTo: `${siteUrl()}/${locale}/accept-invite`,
  });
  if (error) {
    await admin.from("invitations").delete().eq("org_id", viewer.org.id).eq("email", email);
    return { error: error.status === 429 ? "rateLimited" : error.message.toLowerCase().includes("already") ? "inviteAlreadyMember" : "generic" };
  }

  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "invite_employee", target: email, details: { org_id: viewer.org.id } });
  revalidatePath(`/${locale}/dashboard`);
  return { ok: "inviteSent", email };
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "generic" };
  const displayName = String(fd.get("displayName") ?? "").trim();
  const locale = String(fd.get("profileLocale") ?? viewer.locale);
  if (!displayName) return { error: "required" };
  if (!(routing.locales as readonly string[]).includes(locale)) return { error: "generic" };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: displayName, locale }).eq("id", viewer.id);
  if (error) return { error: "generic" };
  revalidatePath(`/${localeOf(fd)}/dashboard`);
  return { ok: "profileSaved" };
}

/** Company manager removes an employee (or cancels an invitation). The seat becomes free at once. */
export async function removeEmployeeAction(fd: FormData) {
  const viewer = await getViewer();
  if (!viewer || viewer.memberRole !== "owner" || !hasServiceRole) return;
  const userId = String(fd.get("userId") ?? "");
  if (!userId || userId === viewer.id) return;
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, org_id, member_role, email").eq("id", userId).maybeSingle();
  if (!target || target.org_id !== viewer.org.id || target.member_role !== "employee") return;
  await admin.from("invitations").delete().eq("org_id", viewer.org.id).eq("email", target.email);
  // Deleting the sign-in also removes the profile, progress and favorites (foreign keys cascade).
  await admin.auth.admin.deleteUser(userId);
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "remove_employee", target: target.email, details: { org_id: viewer.org.id } });
  revalidatePath(`/${localeOf(fd)}/dashboard`);
}
