"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowDownRight, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** The page's single orchestrated entrance: headline, lead and actions rise in sequence. */
export function HeroIntro({ title, lead }: { title?: string; lead?: string }) {
  const t = useTranslations("home");
  const reduce = useReducedMotion();
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div>
      <motion.h1
        {...item(0)}
        className="font-serif text-[2.35rem] leading-[1.25] font-bold text-navy-900 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.18]"
      >
        {title ?? t("heroTitle")}
      </motion.h1>
      <motion.p {...item(1)} className="mt-6 max-w-[34rem] text-lg leading-relaxed text-navy-900/75">
        {lead ?? t("heroLead")}
      </motion.p>
      <motion.div {...item(2)} className="mt-9 flex flex-wrap items-center gap-4">
        <Link href="/#pricing" className="btn-3d text-base">
          {t("heroPrimary")}
          <ArrowDownRight size={18} aria-hidden />
        </Link>
        <Link href="/library" className="btn-ghost text-navy-900 hover:bg-navy-900 hover:text-white">
          <PlayCircle size={19} aria-hidden />
          {t("heroSecondary")}
        </Link>
      </motion.div>
      <motion.p {...item(3)} className="mt-5 text-sm text-navy-900/60">
        {t("heroNote")}
      </motion.p>
    </div>
  );
}
