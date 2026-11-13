import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./lib/supabase/config";

const intl = createIntlMiddleware(routing);

/** Paths (after the locale) that need a signed-in user. Role and 2FA checks happen on the server page itself. */
const PROTECTED = ["/dashboard", "/admin", "/mfa", "/set-password", "/checkout", "/receipt", "/contract", "/agree"];
/** Using the service (not just browsing) requires having agreed to the terms. Admin pages are staff-only and exempt. */
const NEEDS_AGREEMENT = ["/dashboard", "/library", "/checkout"];
const under = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));

export default async function middleware(request: NextRequest) {
  const response = intl(request);
  if (!isSupabaseConfigured) return response; // prototype mode: everything is demo data

  // Refresh the Supabase session and copy any updated cookies onto the response.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [, maybeLocale, ...rest] = request.nextUrl.pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(maybeLocale) ? maybeLocale : routing.defaultLocale;
  const path = "/" + rest.join("/");

  if (user && !user.user_metadata?.terms_agreed_at && under(path, NEEDS_AGREEMENT)) {
    const agree = new URL(`/${locale}/agree`, request.url);
    agree.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(agree);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (!user && under(path, PROTECTED)) {
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
