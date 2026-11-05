import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "./logo";
import { HeroArt } from "./hero-art";

/** Split layout for sign-in screens: golden-hour scene on the left, the form on the right. */
export function AuthShell({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  const t = useTranslations("auth");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <div aria-hidden className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgb(240_188_85/0.35),transparent_65%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="GAIA LEARNING">
            <Logo dark />
          </Link>
          <div className="mx-auto w-full max-w-xl">
            <HeroArt />
          </div>
          <p className="text-sm text-white/50">© 2026 GAIA</p>
        </div>
      </aside>
      <main id="main" className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label="GAIA LEARNING">
            <Logo />
          </Link>
          <h1 className="font-serif text-3xl font-bold">{title}</h1>
          {lead && <p className="mt-3 text-navy-900/70">{lead}</p>}
          {!isSupabaseConfigured && (
            <p className="mt-6 flex gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-sun-700">
              <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
              {t("notConfigured")}
            </p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
