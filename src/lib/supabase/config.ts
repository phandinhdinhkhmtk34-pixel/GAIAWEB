/**
 * Supabase settings come from environment variables (Vercel → Settings → Environment Variables).
 * When they are missing the site runs as the Phase 1 prototype with demo data only.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Either the legacy "anon" key or the newer "publishable" key works here; both are safe in the browser.
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
