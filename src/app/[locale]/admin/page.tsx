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
import { loadCatalog } from "@/lib/videos";
import { loadPrices, planAmount } from "@/lib/billing";
import { loadDraftSiteContent } from "@/lib/site-content-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("title") };
}

const ACTION_LABEL: Record<string, string> = {
  invite_employee: "社員を招待 / Invite employee",
  grant_admin: "管理者権限を付与 / Grant admin",
  revoke_admin: "管理者権限を削除 / Revoke admin",
  set_seats: "アカウント数を変更 / Change seats",
  activate_plan: "プランを有効化 / Activate plan",
  end_plan: "プランを終了 / End plan",
  add_video: "動画を追加（下書き） / Add video (draft)",
  publish_video: "動画を公開 / Publish video",
  unpublish_video: "動画を非公開 / Unpublish video",
  delete_video: "動画を削除 / Delete video",
  bank_order: "振込注文を作成 / Bank transfer order",
  publish_site: "サイトを公開 / Publish site content",
  remove_employee: "社員を削除 / Remove employee",
  suspend_org: "利用停止 / Suspend",
  resume_org: "利用再開 / Resume",
  delete_org: "アカウント削除 / Delete account",
  confirm_transfer: "入金を確認 / Confirm transfer",
  reject_transfer: "振込を差し戻し / Reject transfer",
  billing_settings: "振込先・領収書設定を変更 / Billing settings",
  add_seats_card: "カードでアカウント追加 / Add seats by card",
  cancel_plan: "自動更新を停止 / Turn off renewal",
  resume_plan: "自動更新を再開 / Resume renewal",
  set_thumbnail: "サムネイルを変更 / Change cover image",
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
    videos: [],
    categories: [],
    billing: { pending: [], recent: [], settings: {} },
    site: null,
    kpis: null,
    charts: null,
  };
  if (!hasServiceRole) return base;

  // Service role is used only after the role + 2FA checks above.
  const db = createAdminClient();
  const isSuper = viewer.adminRole === "super";
  const [users, companies, orgs, admins, pendingAdmins, audit, seatsUsed] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("organizations").select("id", { count: "exact", head: true }).eq("kind", "company"),
    db.from("organizations").select("id, name, kind, seat_limit, created_at, suspended_at").order("created_at", { ascending: false }).limit(200),
    isSuper ? db.from("admins").select("user_id, role") : Promise.resolve({ data: [] }),
    isSuper ? db.from("admin_bootstrap").select("email, role") : Promise.resolve({ data: [] }),
    viewer.adminRole !== "editor"
      ? db.from("audit_log").select("actor_id, action, target, created_at").order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
    db.from("profiles").select("org_id"),
  ]);
  const money = viewer.adminRole !== "editor";
  const [subs, catalog, progress, pays, settings, prices] = await Promise.all([
    db.from("subscriptions").select("id, org_id, status, period, seats, current_period_end").in("status", ["active", "cancelled"]).gt("current_period_end", new Date().toISOString()),
    loadCatalog(locale, { includeDrafts: true }),
    db.from("watch_progress").select("video_id, updated_at"),
    money
      ? db.from("payments").select("id, subscription_id, order_code, amount_jpy, method, status, kind, seats, created_at, verified_at, receipt_number").order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] }),
    money ? db.from("billing_settings").select("*").eq("id", 1).maybeSingle() : Promise.resolve({ data: null }),
    loadPrices(),
  ]);
  const planByOrg = new Map(((subs.data ?? []) as { org_id: string; status: "active" | "cancelled"; period: "monthly" | "annual"; current_period_end: string }[]).map((x) => [x.org_id, x]));
  const viewersByVideo = new Map<string, number>();
  for (const r of (progress.data ?? []) as { video_id: string }[]) viewersByVideo.set(r.video_id, (viewersByVideo.get(r.video_id) ?? 0) + 1);
  const catName = new Map(catalog.categories.map((c) => [c.id, c.name]));

  // Payments → organization names (payments reference subscriptions, which reference organizations).
  type Pay = { id: string; subscription_id: string; order_code: string; amount_jpy: number; method: string; status: string; kind: string; seats: number | null; created_at: string; verified_at: string | null; receipt_number: string | null };
  const payRows = (pays.data ?? []) as Pay[];
  const subIds = [...new Set(payRows.map((p) => p.subscription_id))];
  const { data: subOrgs } = subIds.length ? await db.from("subscriptions").select("id, org_id").in("id", subIds) : { data: [] as { id: string; org_id: string }[] };
  const orgName = new Map((orgs.data ?? []).map((o) => [o.id, o.name]));
  const orgOfSub = new Map((subOrgs ?? []).map((x) => [x.id, x.org_id]));
  const nameOfPay = (p: Pay) => orgName.get(orgOfSub.get(p.subscription_id) ?? "") ?? "—";
  const verified = payRows.filter((p) => p.status === "verified");

  // Monthly recurring revenue: each live plan's price per month (annual plans count as 1/12).
  const activeSubs = (subs.data ?? []) as { id: string; org_id: string; period: "monthly" | "annual"; seats: number }[];
  const mrr = Math.round(
    activeSubs.reduce((n, x) => n + planAmount(prices[x.period], x.seats) / (x.period === "annual" ? 12 : 1), 0),
  );
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getMonth() + 1}月` };
  });
  const revenueByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const p of verified) {
    const key = (p.verified_at ?? p.created_at).slice(0, 7);
    if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amount_jpy);
  }
  const catOfVideo = new Map(catalog.videos.map((v) => [v.id, v.categoryId]));
  const viewsByCat = new Map<string, number>();
  for (const r of (progress.data ?? []) as { video_id: string }[]) {
    const c = catOfVideo.get(r.video_id);
    if (c) viewsByCat.set(c, (viewsByCat.get(c) ?? 0) + 1);
  }
  const usedByOrg = new Map<string, number>();
  for (const r of (seatsUsed.data ?? []) as { org_id: string }[]) usedByOrg.set(r.org_id, (usedByOrg.get(r.org_id) ?? 0) + 1);

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
      id: o.id,
      name: o.name,
      type: o.kind,
      seats: o.seat_limit,
      used: usedByOrg.get(o.id) ?? 0,
      status: planByOrg.get(o.id)?.status ?? ("none" as const),
      planEnd: planByOrg.get(o.id)?.current_period_end ?? null,
      planPeriod: planByOrg.get(o.id)?.period ?? null,
      suspended: Boolean(o.suspended_at),
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
    categories: catalog.categories.map((c) => ({ id: c.id, name: c.name })),
    site: viewer.adminRole === "accounting" ? null : await loadDraftSiteContent(),
    billing: {
      pending: payRows
        .filter((p) => p.status === "awaiting" && p.method === "bank_transfer")
        .map((p) => ({ id: p.id, code: p.order_code, org: nameOfPay(p), amount: p.amount_jpy, kind: p.kind, seats: p.seats, created: p.created_at })),
      recent: verified.slice(0, 20).map((p) => ({
        code: p.order_code,
        org: nameOfPay(p),
        amount: p.amount_jpy,
        method: p.method,
        receipt: p.receipt_number,
        date: p.verified_at ?? p.created_at,
      })),
      settings: Object.fromEntries(Object.entries((settings.data ?? {}) as Record<string, unknown>).map(([k, v]) => [k, v == null ? "" : String(v)])),
    },
    kpis: {
      paid: new Set(activeSubs.map((x) => x.org_id)).size,
      activeSubs: activeSubs.length,
      mrr,
      total: verified.reduce((n, p) => n + p.amount_jpy, 0),
      pending: payRows.filter((p) => p.status === "awaiting").length,
      videos: catalog.videos.filter((v) => v.state === "published").length,
      views: ((progress.data ?? []) as { updated_at: string }[]).filter((r) => r.updated_at >= monthStart).length,
    },
    charts: {
      revenue: months.map((m) => ({ label: m.label, revenue: revenueByMonth.get(m.key) ?? 0 })),
      views: catalog.categories.map((c) => ({ name: c.name, views: viewsByCat.get(c.id) ?? 0 })),
    },
    videos: catalog.videos.map((v) => ({
      id: v.id,
      title: v.title,
      category: catName.get(v.categoryId) ?? "",
      state: v.state,
      minutes: v.durationSeconds ? Math.max(1, Math.round(v.durationSeconds / 60)) : 0,
      created: v.createdAt,
      viewers: viewersByVideo.get(v.id) ?? 0,
      thumbnailUrl: v.thumbnailUrl,
    })),
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
