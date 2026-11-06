import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HomeEditor } from "@/components/home-editor";
import { getViewer } from "@/lib/auth";
import { loadDraftSiteContent } from "@/lib/site-content-server";

export const metadata: Metadata = { title: "編集モード", robots: { index: false } };

/** 編集モード: the real homepage with click-to-edit text and images (Super admins and editors). */
export default async function EditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/admin/edit`);
  if (viewer.adminRole !== "super" && viewer.adminRole !== "editor") notFound();
  if (viewer.aal !== "aal2") redirect(`/${locale}/mfa`);
  return <HomeEditor initial={await loadDraftSiteContent()} />;
}
