import "server-only";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
}

export interface CatalogVideo {
  id: string;
  categoryId: string;
  categorySlug: string;
  title: string;
  summary: string;
  character: string;
  minutes: number;
  durationSeconds: number;
  subtitles: string[];
  state: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
}

type Tr = { entity_type: string; entity_id: string; locale: string; title: string; description: string };

/** Pick the viewer's language, then Japanese, then English, then anything. */
function pickTr(rows: Tr[], id: string, locale: string) {
  const mine = rows.filter((r) => r.entity_id === id);
  return mine.find((r) => r.locale === locale) ?? mine.find((r) => r.locale === "ja") ?? mine.find((r) => r.locale === "en") ?? mine[0];
}

/**
 * The catalogue in one language. Members read published videos through RLS;
 * admins pass includeDrafts and the query runs with the service role after their role was checked.
 */
export async function loadCatalog(locale: string, opts: { includeDrafts?: boolean } = {}) {
  const db = opts.includeDrafts ? createAdminClient() : await createClient();
  let videoQuery = db
    .from("videos")
    .select("id, category_id, character_name, duration_seconds, state, published_at, created_at")
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (!opts.includeDrafts) videoQuery = videoQuery.eq("state", "published");

  const [{ data: cats }, { data: vids }, { data: trs }, { data: subs }] = await Promise.all([
    db.from("categories").select("id, slug, sort_order").order("sort_order"),
    videoQuery,
    db.from("translations").select("entity_type, entity_id, locale, title, description"),
    db.from("subtitles").select("video_id, locale"),
  ]);
  const tr = (trs ?? []) as Tr[];
  const categories: CatalogCategory[] = (cats ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: pickTr(tr.filter((r) => r.entity_type === "category"), c.id, locale)?.title ?? c.slug,
  }));
  const slugOf = new Map(categories.map((c) => [c.id, c.slug]));
  const vtr = tr.filter((r) => r.entity_type === "video");
  const videos: CatalogVideo[] = (vids ?? []).map((v) => {
    const t = pickTr(vtr, v.id, locale);
    return {
      id: v.id,
      categoryId: v.category_id,
      categorySlug: slugOf.get(v.category_id) ?? "",
      title: t?.title ?? "—",
      summary: t?.description ?? "",
      character: v.character_name,
      durationSeconds: v.duration_seconds,
      minutes: Math.max(1, Math.round(v.duration_seconds / 60)),
      subtitles: (subs ?? []).filter((s) => s.video_id === v.id).map((s) => s.locale),
      state: v.state,
      publishedAt: v.published_at,
      createdAt: v.created_at,
    };
  });
  return { categories, videos, translations: vtr };
}

/** The signed-in member's progress and favorites (RLS: own rows only). */
export async function loadMemberLearning(userId: string) {
  const supabase = await createClient();
  const [{ data: progress }, { data: favs }, { data: canWatch }] = await Promise.all([
    supabase.from("watch_progress").select("video_id, seconds_watched, completed_at, updated_at").eq("user_id", userId),
    supabase.from("favorites").select("video_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.rpc("can_watch", { p_user: userId }),
  ]);
  return {
    progress: (progress ?? []) as { video_id: string; seconds_watched: number; completed_at: string | null; updated_at: string }[],
    favorites: (favs ?? []).map((f) => f.video_id as string),
    canWatch: Boolean(canWatch),
  };
}
