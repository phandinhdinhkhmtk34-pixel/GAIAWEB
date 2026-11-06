"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PencilLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Floating "edit this page" button, shown only to signed-in admins (checked in the browser). */
export function AdminEditButton() {
  const t = useTranslations("admin");
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: admin } = await supabase.from("admins").select("role").eq("user_id", data.user.id).maybeSingle();
      setShow(admin?.role === "super" || admin?.role === "editor");
    })();
  }, []);
  if (!show) return null;
  return (
    <Link
      href="/admin/edit"
      className="fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[max(16px,env(safe-area-inset-bottom,0px))] z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-navy-900 px-5 font-semibold text-white shadow-xl hover:bg-navy-800"
    >
      <PencilLine size={18} className="text-sun-300" aria-hidden />
      {t("editThisPage")}
    </Link>
  );
}
