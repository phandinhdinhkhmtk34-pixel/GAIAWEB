import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase email link (sign-up confirmation, invitation, password reset).
 * Supports both link styles:
 *  - ?code=…                       (default Supabase templates, PKCE flow)
 *  - ?token_hash=…&type=invite|…   (the templates in docs/SUPABASE_SETUP.md; works across devices)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawNext = url.searchParams.get("next") ?? "/ja/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/ja/dashboard";
  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  // Invited people and password resets must choose a password before anything else.
  const dest = ok ? (type === "invite" || type === "recovery" ? `/${next.split("/")[1] || "ja"}/set-password` : next) : null;
  const locale = next.split("/")[1] || "ja";
  return NextResponse.redirect(new URL(dest ?? `/${locale}/login?error=linkInvalid`, url.origin));
}
