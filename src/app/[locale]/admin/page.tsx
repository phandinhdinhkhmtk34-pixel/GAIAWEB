import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminView, type LiveAdmin } from "@/components/admin-view";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("title") };
}

const ACTION_LABEL: Record<string, string> = {
  invite_employee: "社員を招待 / Invite employee",
  grant_admin: "管理者権限を付与 / Grant admin",
  revoke_admin: "管理者権限を削除 / Revoke admin",
};

async function loadLive(locale: string): Promise<LiveAdmin> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/admin`);
  // Not an admin: behave as if the page does not exist.
  if (!viewer.adminRole) notFound();
  // Admins must pass 2-step verification in every session.
  if (viewer.aal !== "aal2") redirect(`/${locale}/mfa`);

  const base: LiveAdmin = {
    role: viewer.adminRole,
    meId: viewer.id,
    serviceRole: hasServiceRole,
    counts: { users: 0, companies: 0 },
    members: [],
    admins: [],
    audit: [],
  };
  if (!hasServiceRole) return base;

  // Service role is used only after the role + 2FA checks above.
  const db = createAdminClient();
  const isSuper = viewer.adminRole === "super";
  const [users, companies, orgs, admins, pendingAdmins, audit] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("organizations").select("id", { count: "exact", head: true }).eq("kind", "company"),
    db.from("organizations").select("id, name, kind, seat_limit, created_at").order("created_at", { ascending: false }).limit(200),
    isSuper ? db.from("admins").select("user_id, role") : Promise.resolve({ data: [] }),
    isSuper ? db.from("admin_bootstrap").select("email, role") : Promise.resolve({ data: [] }),
    viewer.adminRole !== "editor"
      ? db.from("audit_log").select("actor_id, action, target, created_at").order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const adminRows = (admins.data ?? []) as { user_id: string; role: LiveAdmin["role"] }[];
  const auditRows = (audit.data ?? []) as { actor_id: string | null; action: string; target: string | null; created_at: string }[];
  // admins/audit_log reference auth.users, so look the people up in profiles separately.
  const ids = [...new Set([...adminRows.map((a) => a.user_id), ...auditRows.map((a) => a.actor_id).filter((x): x is string => Boolean(x))])];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, email, display_name").in("id", ids)
    : { data: [] as { id: string; email: string | null; display_name: string }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const activeEmails = new Set(adminRows.map((a) => byId.get(a.user_id)?.email?.toLowerCase()).filter(Boolean));

  return {
    ...base,
    counts: { users: users.count ?? 0, companies: companies.count ?? 0 },
    members: (orgs.data ?? []).map((o) => ({
      name: o.name,
      type: o.kind,
      seats: o.seat_limit,
      status: "none" as const, // subscriptions arrive in Phase 4
      since: o.created_at,
    })),
    admins: [
      ...adminRows.map((a) => ({
        userId: a.user_id,
        email: byId.get(a.user_id)?.email ?? "",
        name: byId.get(a.user_id)?.display_name ?? "",
        role: a.role,
        pending: false,
      })),
      ...((pendingAdmins.data ?? []) as { email: string; role: LiveAdmin["role"] }[])
        .filter((p) => !activeEmails.has(p.email.toLowerCase()))
        .map((p) => ({ userId: null, email: p.email, name: "", role: p.role, pending: true })),
    ],
    audit: auditRows.map((a) => ({
      who: (a.actor_id && byId.get(a.actor_id)?.email) || "—",
      what: `${ACTION_LABEL[a.action] ?? a.action}${a.target ? `: ${a.target}` : ""}`,
      when: a.created_at,
    })),
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const live = isSupabaseConfigured ? await loadLive(locale) : undefined;
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main">
        <AdminView live={live} />
      </main>
      <SiteFooter />
    </>
  );
}
