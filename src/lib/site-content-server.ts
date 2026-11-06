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
