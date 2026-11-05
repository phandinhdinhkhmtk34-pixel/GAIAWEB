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
    })),
    invitations: (invitations ?? []).map((i) => ({ email: i.email, expires: i.expires_at })),
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
        <DashboardView live={live} />
      </main>
      <SiteFooter />
    </>
  );
}
