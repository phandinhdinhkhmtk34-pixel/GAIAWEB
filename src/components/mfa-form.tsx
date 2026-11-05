"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";

type Enroll = { factorId: string; qr: string; secret: string };

/** Admin 2-step verification: enrol an authenticator app once, then enter its 6-digit code each sign-in. */
export function MfaForm({ enrolled }: { enrolled: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) return setError("generic");
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setFactorId(verified.id);
      // Clear half-finished enrolments so a fresh QR code can be issued.
      for (const f of data.all.filter((f) => f.factor_type === "totp" && f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: en, error: enErr } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "GAIA admin" });
      if (enErr || !en) return setError("generic");
      setEnroll({ factorId: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
      setFactorId(en.id);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) return setError("mfaWrong");
    setBusy(true);
    setError(null);
    const { error: vErr } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (vErr) return setError("mfaWrong");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="flex gap-2 rounded-xl bg-sky-100 p-4 text-sm text-navy-900/75">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-navy-700" aria-hidden />
        {t("mfaWhy")}
      </p>
      {!enrolled && enroll && (
        <ol className="space-y-4 text-sm">
          <li>
            <p className="font-medium">1. {t("mfaStep1")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR" width={184} height={184} className="mt-3 rounded-xl border border-navy-900/10 bg-white p-2" />
            <p className="mt-3 text-navy-900/65">{t("mfaSecret")}</p>
            <code className="mt-1 block break-all rounded-lg bg-sky-100 px-3 py-2 font-mono text-[13px] select-all">{enroll.secret}</code>
          </li>
          <li className="font-medium">2. {t("mfaStep2")}</li>
        </ol>
      )}
      {enrolled && <p className="text-navy-900/75">{t("mfaChallengeLead")}</p>}
      <form onSubmit={verify} className="space-y-4" noValidate>
        <div>
          <label htmlFor="mfa-code" className="text-sm font-medium">
            {t("mfaCode")}
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="mfa-error"
            className="mt-2 h-14 w-full rounded-xl border border-navy-900/20 bg-white px-4 text-center font-mono text-2xl tracking-[0.4em] focus:border-navy-700 focus:outline-none"
          />
        </div>
        <p id="mfa-error" role="alert" className="min-h-5 text-sm text-seal">
          {error ? t(`errors.${error}`) : ""}
        </p>
        <button type="submit" disabled={busy || !factorId} className="btn-3d w-full disabled:opacity-60">
          {busy ? t("mfaVerifying") : t("mfaVerify")}
        </button>
      </form>
    </div>
  );
}
