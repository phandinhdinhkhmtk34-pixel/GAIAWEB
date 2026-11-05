import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type AdminRole = "super" | "accounting" | "editor";

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  memberRole: "owner" | "employee";
  org: { id: string; name: string; kind: "individual" | "company"; seatLimit: number };
  adminRole: AdminRole | null;
  /** "aal2" once the user has passed a 2-step verification code in this session. */
  aal: "aal1" | "aal2";
  hasVerifiedTotp: boolean;
}

/** The signed-in user with profile, organization and admin role; null when signed out or in prototype mode. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: admin }, { data: aal }, { data: factors }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, locale, member_role, org_id, organizations(id, name, kind, seat_limit)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("admins").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (!profile) return null;

  const org = (Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations) as
    | { id: string; name: string; kind: "individual" | "company"; seat_limit: number }
    | null;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
    locale: profile.locale,
    memberRole: profile.member_role,
    org: org
      ? { id: org.id, name: org.name, kind: org.kind, seatLimit: org.seat_limit }
      : { id: profile.org_id, name: "", kind: "individual", seatLimit: 1 },
    adminRole: (admin?.role as AdminRole | undefined) ?? null,
    aal: aal?.currentLevel === "aal2" ? "aal2" : "aal1",
    hasVerifiedTotp: Boolean(factors?.totp?.some((f) => f.status === "verified")),
  };
});

/** What the header needs to know, safe to pass to client components. */
export interface HeaderSession {
  mode: "demo" | "live";
  signedIn: boolean;
  name?: string;
  isAdmin: boolean;
}

export async function getHeaderSession(): Promise<HeaderSession> {
  if (!isSupabaseConfigured) return { mode: "demo", signedIn: false, isAdmin: true };
  const v = await getViewer();
  return { mode: "live", signedIn: Boolean(v), name: v?.displayName, isAdmin: Boolean(v?.adminRole) };
}
