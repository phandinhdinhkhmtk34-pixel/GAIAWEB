import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardView } from "@/components/dashboard-view";
import type { LiveMember } from "@/components/dashboard-live";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { loadCatalog, loadMemberLearning } from "@/lib/videos";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

async function loadLive(locale: string): Promise<LiveMember> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/dashboard`);
  const supabase = await createClient();
  const isOwner = viewer.memberRole === "owner";
  // Row Level Security limits these to the viewer's own organization (owners) or own row (employees).
  const [{ data: people }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email, member_role, created_at").eq("org_id", viewer.org.id).order("created_at"),
    isOwner
      ? supabase
          .from("invitations")
          .select("email, expires_at")
          .eq("org_id", viewer.org.id)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as { email: string; expires_at: string }[] }),
  ]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ data: sub }, catalog, learning, { data: pays }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, period, current_period_end, seats")
      .eq("org_id", viewer.org.id)
      .in("status", ["active", "cancelled"])
      .gt("current_period_end", now.toISOString())
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadCatalog(locale),
    loadMemberLearning(viewer.id),
    // RLS shows payments of the member's own organization (owners and employees alike).
    supabase.from("payments").select("order_code, method, amount_jpy, status, created_at, receipt_number").order("created_at", { ascending: false }).limit(24),
  ]);
  // Contracts are server-only rows; the organization's manager sees their own.
  const contracts =
    isOwner && hasServiceRole
      ? ((
          await createAdminClient()
            .from("agreements")
            .select("contract_no, agreed_at, period, seats, amount_jpy, method")
            .eq("org_id", viewer.org.id)
            .order("agreed_at", { ascending: false })
            .limit(24)
        ).data ?? [])
      : [];
  const byId = new Map(catalog.videos.map((v) => [v.id, v]));
  // Invited people who haven't set a password yet (owners only; read with the service role).
  const pendingIds = new Set<string>();
  if (isOwner && hasServiceRole) {
    const admin = createAdminClient();
    const employees = (people ?? []).filter((p) => p.member_role === "employee");
    const users = await Promise.all(employees.map((p) => admin.auth.admin.getUserById(p.id)));
    users.forEach((u, i) => {
      if (!u.data.user?.email_confirmed_at) pendingIds.add(employees[i].id);
    });
  }
  const recent = [...learning.progress].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const pct = (videoId: string, seconds: number, done: boolean) => {
    const d = byId.get(videoId)?.durationSeconds ?? 0;
    return done ? 100 : d ? Math.min(99, Math.round((seconds / d) * 100)) : 0;
  };

  return {
    id: viewer.id,
    name: viewer.displayName,
    email: viewer.email,
    locale: viewer.locale,
    memberRole: viewer.memberRole,
    org: { name: viewer.org.name, kind: viewer.org.kind, seatLimit: viewer.org.seatLimit },
    people: (people ?? []).map((p) => ({
      id: p.id,
      name: p.display_name || p.email || "—",
      email: p.email ?? "",
      role: p.member_role,
      joined: p.created_at,
      pending: pendingIds.has(p.id),
    })),
    invitations: (invitations ?? []).map((i) => ({ email: i.email, expires: i.expires_at })),
    plan: sub ? { status: sub.status as "active" | "cancelled", period: sub.period as "monthly" | "annual", end: sub.current_period_end as string, seats: sub.seats } : null,
    learning: {
      // Approximation until per-session logs exist: time watched on videos touched this month.
      minutesThisMonth: Math.round(learning.progress.filter((p) => p.updated_at >= monthStart).reduce((n, p) => n + p.seconds_watched, 0) / 60),
      completed: learning.progress.filter((p) => p.completed_at).length,
      history: recent
        .filter((p) => byId.has(p.video_id))
        .slice(0, 6)
        .map((p) => ({ id: p.video_id, title: byId.get(p.video_id)!.title, minutes: byId.get(p.video_id)!.minutes, progress: pct(p.video_id, p.seconds_watched, Boolean(p.completed_at)) })),
      favorites: learning.favorites
        .filter((id) => byId.has(id))
        .slice(0, 6)
        .map((id) => ({ id, title: byId.get(id)!.title, minutes: byId.get(id)!.minutes })),
    },
    contracts: contracts
      .filter((c) => c.contract_no)
      .map((c) => ({
        no: c.contract_no as string,
        date: c.agreed_at as string,
        period: c.period as string,
        seats: c.seats as number,
        amount: c.amount_jpy as number,
      })),
    payments: (pays ?? []).map((p) => ({
      date: p.created_at as string,
      code: p.order_code as string,
      amount: p.amount_jpy as number,
      method: p.method as "card" | "bank_transfer",
      status: p.status as string,
      receipt: (p.receipt_number as string | null) ?? null,
    })).filter((p) => !(p.status === "rejected")),
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { locale } = await params;
  const { checkout } = await searchParams;
  setRequestLocale(locale);
  const live = isSupabaseConfigured ? await loadLive(locale) : undefined;
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main">
        <DashboardView live={live} notice={checkout === "success" ? "checkoutSuccess" : undefined} />
      </main>
      <SiteFooter />
    </>
  );
}
