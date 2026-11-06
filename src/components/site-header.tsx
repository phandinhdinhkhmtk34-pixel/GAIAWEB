"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Globe, LogIn, LogOut, Menu, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, draftLocales, type Locale } from "@/i18n/routing";
import { Logo } from "./logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/browser";

/** Who is signed in, read in the browser so public pages stay static. Demo mode shows every page. */
function useSession() {
  const [s, setS] = useState<{ signedIn: boolean; isAdmin: boolean }>({ signedIn: false, isAdmin: !isSupabaseConfigured });
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setS({ signedIn: false, isAdmin: false });
      const { data: admin } = await supabase.from("admins").select("role").eq("user_id", data.user.id).maybeSingle();
      setS({ signedIn: true, isAdmin: Boolean(admin) });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);
  return s;
}

const NAV = [
  { href: "/", key: "home" },
  { href: "/library", key: "library" },
  { href: "/dashboard", key: "dashboard" },
  { href: "/admin", key: "admin" },
] as const;

export function SiteHeader({ tone = "light" }: { tone?: "light" | "dark" }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";
  const session = useSession();
  const router = useRouter();
  const nav = NAV.filter((item) => item.key !== "admin" || session.isAdmin);
  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  };

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 border-b backdrop-blur-md",
        dark ? "border-white/10 bg-navy-950/80 text-white" : "border-navy-900/8 bg-sky-50/85 text-navy-900",
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 py-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label={t("common.brand")}>
          <Logo dark={dark} />
        </Link>

        <nav aria-label={t("nav.menu")} className="hidden flex-1 items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? dark
                      ? "bg-white/10 text-white"
                      : "bg-navy-900/6 text-navy-900"
                    : dark
                      ? "text-white/70 hover:text-white"
                      : "text-navy-900/65 hover:text-navy-900",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher dark={dark} />
          {isSupabaseConfigured &&
            (session.signedIn ? (
              <button
                type="button"
                onClick={signOut}
                className={clsx(
                  "hidden h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium sm:inline-flex",
                  dark ? "text-white/80 hover:bg-white/10" : "text-navy-900/75 hover:bg-navy-900/6",
                )}
              >
                <LogOut size={17} aria-hidden />
                {t("auth.signOut")}
              </button>
            ) : (
              <Link
                href="/login"
                className={clsx(
                  "hidden h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium sm:inline-flex",
                  dark ? "text-white/80 hover:bg-white/10" : "text-navy-900/75 hover:bg-navy-900/6",
                )}
              >
                <LogIn size={17} aria-hidden />
                {t("common.signIn")}
              </Link>
            ))}
          <Link
            href="/#pricing"
            className={clsx(
              "hidden rounded-lg px-4 py-2 text-sm font-semibold sm:inline-flex",
              dark ? "bg-sun-400 text-navy-950 hover:bg-sun-300" : "bg-navy-900 text-white hover:bg-navy-800",
            )}
          >
            {t("common.register")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t("nav.menu")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={t("nav.menu")} className="border-t border-current/10 px-4 pb-4 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-3 text-base font-medium">
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          {isSupabaseConfigured &&
            (session.signedIn ? (
              <button type="button" onClick={signOut} className="block w-full rounded-lg px-3 py-3 text-left text-base font-medium">
                {t("auth.signOut")}
              </button>
            ) : (
              <Link href="/login" className="block rounded-lg px-3 py-3 text-base font-medium">
                {t("common.signIn")}
              </Link>
            ))}
          <Link href="/#pricing" className="btn-3d mt-3 w-full">
            {t("common.register")}
          </Link>
        </nav>
      )}
    </header>
  );
}

function LocaleSwitcher({ dark }: { dark: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        className={clsx(
          "inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
          dark ? "text-white/80 hover:bg-white/10" : "text-navy-900/75 hover:bg-navy-900/6",
        )}
      >
        <Globe size={18} aria-hidden />
        <span className="hidden sm:inline">{localeNames[locale]}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("language")}
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-navy-900/10 bg-white py-1 text-navy-900 shadow-xl shadow-navy-900/15"
        >
          {locales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                lang={l}
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: l });
                }}
                className={clsx(
                  "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-sky-100",
                  l === locale && "font-semibold",
                )}
              >
                {localeNames[l]}
                {draftLocales.includes(l) && (
                  <span className="rounded bg-sun-200 px-1.5 py-0.5 text-[11px] font-medium text-sun-700">AI draft</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
