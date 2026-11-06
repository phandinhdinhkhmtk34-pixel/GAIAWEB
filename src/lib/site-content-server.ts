import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./supabase/config";
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { emptySiteContent, normalizeSiteContent, type SiteContent } from "./site-content";

/** Published content for visitors. Uses the public key without cookies so pages stay cacheable. */
export const loadPublishedSiteContent = cache(async (): Promise<SiteContent> => {
  if (!isSupabaseConfigured) return emptySiteContent();
  try {
    const db = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data } = await db.from("site_content").select("published").eq("key", "site").eq("locale", "*").maybeSingle();
    return normalizeSiteContent(data?.published);
  } catch {
    return emptySiteContent();
  }
});

/** The admin's working copy (falls back to what is published). */
export async function loadDraftSiteContent(): Promise<SiteContent> {
  if (!hasServiceRole) return emptySiteContent();
  const { data } = await createAdminClient().from("site_content").select("draft, published").eq("key", "site").eq("locale", "*").maybeSingle();
  const draft = data?.draft && Object.keys(data.draft as object).length ? data.draft : data?.published;
  return normalizeSiteContent(draft);
}

export interface HomeCatalog {
  videos: { id: string; title: string; categorySlug: string; categoryName: string; minutes: number; character: string; thumbnailUrl: string | null }[];
  categories: { slug: string; name: string; count: number }[];
  avgMinutes: number;
}

/**
 * Published videos and categories for the homepage, in one language. Public key, no cookies,
 * so the homepage stays cached; RLS only returns published videos and their titles.
 */
export const loadHomeCatalog = cache(async (locale: string): Promise<HomeCatalog | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const db = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const [{ data: cats }, { data: vids }, { data: trs }] = await Promise.all([
      db.from("categories").select("id, slug, sort_order").order("sort_order"),
      db.from("videos").select("id, category_id, character_name, duration_seconds, thumbnail_path, published_at").eq("state", "published").order("published_at", { ascending: false }).limit(200),
      db.from("translations").select("entity_type, entity_id, locale, title"),
    ]);
    const tr = (trs ?? []) as { entity_type: string; entity_id: string; locale: string; title: string }[];
    const name = (type: string, id: string) => {
      const mine = tr.filter((r) => r.entity_type === type && r.entity_id === id);
      return (mine.find((r) => r.locale === locale) ?? mine.find((r) => r.locale === "ja") ?? mine[0])?.title ?? "";
    };
    const catById = new Map((cats ?? []).map((c) => [c.id, c]));
    const videos = (vids ?? []).map((v) => ({
      id: v.id as string,
      title: name("video", v.id) || "—",
      categorySlug: catById.get(v.category_id)?.slug ?? "",
      categoryName: name("category", v.category_id),
      minutes: Math.max(1, Math.round((v.duration_seconds ?? 0) / 60)),
      character: (v.character_name as string) ?? "",
      thumbnailUrl: v.thumbnail_path ? `${supabaseUrl}/storage/v1/object/public/thumbnails/${v.thumbnail_path}` : null,
    }));
    const timed = (vids ?? []).filter((v) => (v.duration_seconds ?? 0) > 0);
    return {
      videos,
      categories: (cats ?? []).map((c) => ({ slug: c.slug, name: name("category", c.id) || c.slug, count: videos.filter((v) => v.categorySlug === c.slug).length })),
      avgMinutes: timed.length ? Math.max(1, Math.round(timed.reduce((n, v) => n + v.duration_seconds, 0) / timed.length / 60)) : 0,
    };
  } catch {
    return null;
  }
});
