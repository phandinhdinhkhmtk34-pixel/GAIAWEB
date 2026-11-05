import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Service-role client: bypasses Row Level Security. Server-only, and only after the caller's
 * permission has been checked in code. Never import this from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY);
