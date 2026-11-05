"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

/**
 * Supabase's default invitation email returns the session in the URL fragment (#access_token=…),
 * which never reaches the server. Read it here, store the session in cookies, then ask for a password.
 */
export function AcceptInvite() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    // Drop the tokens from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    if (!access_token || !refresh_token) return setFailed(true);
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return setFailed(true);
        router.replace("/set-password");
      });
  }, [router]);

  if (failed) {
    return (
      <div role="alert" className="space-y-4">
        <p className="text-seal">{t("errors.linkInvalid")}</p>
        <Link href="/login" className="inline-flex font-semibold text-navy-700 underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 text-navy-900/70">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      {t("acceptingInvite")}
    </p>
  );
}
