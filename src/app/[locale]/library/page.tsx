import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LibraryView, type LibraryLive } from "@/components/library-view";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadCatalog, loadMemberLearning } from "@/lib/videos";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "library" });
  return { title: t("title") };
}

const NEW_DAYS = 30;

async function loadLive(locale: string): Promise<LibraryLive> {
  const viewer = await getViewer();
  const { categories, videos } = await loadCatalog(locale);
  const learning = viewer ? await loadMemberLearning(viewer.id) : { progress: [], favorites: [], canWatch: false };
  const progressOf = new Map(learning.progress.map((p) => [p.video_id, p]));
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const cutoff = Date.now() - NEW_DAYS * 24 * 3600 * 1000;
  return {
    signedIn: Boolean(viewer),
    canWatch: learning.canWatch,
    favorites: learning.favorites,
    categories: categories.filter((c) => videos.some((v) => v.categoryId === c.id)).map((c) => ({ slug: c.slug, name: c.name })),
    items: videos.map((v) => {
      const p = progressOf.get(v.id);
      const pct = p ? (p.completed_at ? 100 : v.durationSeconds ? Math.min(99, Math.round((p.seconds_watched / v.durationSeconds) * 100)) : 0) : undefined;
      return {
        id: v.id,
        category: v.categorySlug,
        categoryName: nameOf.get(v.categoryId) ?? "",
        title: v.title,
        summary: v.summary,
        character: v.character,
        minutes: v.minutes,
        durationSeconds: v.durationSeconds,
        subtitles: v.subtitles,
        progress: pct,
        isNew: v.publishedAt ? new Date(v.publishedAt).getTime() > cutoff : false,
        thumbnailUrl: v.thumbnailUrl,
      };
    }),
  };
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string; v?: string }>;
}) {
  const { locale } = await params;
  const { c, v } = await searchParams;
  setRequestLocale(locale);
  const live = isSupabaseConfigured ? await loadLive(locale) : undefined;
  return (
    <div className="min-h-dvh bg-navy-950 text-white">
      {!live && <DemoBanner />}
      <SiteHeader tone="dark" />
      <main id="main">
        <LibraryView live={live} initialCategory={c} initialOpen={v} />
      </main>
      <SiteFooter />
    </div>
  );
}
