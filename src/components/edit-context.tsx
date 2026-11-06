"use client";

import { createContext, useContext, useRef, useState, type ElementType } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ImagePlus, Loader2 } from "lucide-react";
import { createSiteImageUploadAction } from "@/lib/admin-actions";

/**
 * Inline editing ("編集モード"). Outside the editor there is no provider, so every Editable renders
 * as plain text and costs nothing. Inside, text becomes contentEditable and images get a change button.
 */
interface EditApi {
  /** Write a value at a path such as "heroTitle" (localized), "company.name" or "characters.2.imageUrl". */
  set: (path: string, value: string | null) => void;
}

const EditContext = createContext<EditApi | null>(null);
export const EditProvider = EditContext.Provider;
export const useEdit = () => useContext(EditContext);

/** Upload one image to the public site bucket and return its URL. */
export async function uploadSiteImage(file: File): Promise<{ url: string } | { error: string }> {
  const ticket = await createSiteImageUploadAction({ type: file.type, size: file.size });
  if ("error" in ticket) return { error: ticket.error ?? "generic" };
  const { createClient } = await import("@/lib/supabase/browser");
  const { error } = await createClient().storage.from("site").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  return error ? { error: "upload" } : { url: ticket.publicUrl };
}

export function Editable({
  path,
  value,
  as: Tag = "span",
  className,
  multiline = false,
  label,
}: {
  path: string;
  value: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  label: string;
}) {
  const edit = useEdit();
  if (!edit) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      aria-label={label}
      title={label}
      spellCheck={false}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        // Paste as plain text only: no formatting or markup enters the content.
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => edit.set(path, e.currentTarget.innerText.trim())}
      className={clsx(
        className,
        "cursor-text rounded-md outline-2 outline-offset-4 outline-sun-500/70 outline-dashed hover:outline-sun-500 focus:bg-sun-200/25 focus:outline-solid",
      )}
    >
      {value}
    </Tag>
  );
}

/** Wraps an image area; in edit mode adds a "change image" button on top. */
export function EditableImage({ path, label, children, className }: { path: string; label: string; children: React.ReactNode; className?: string }) {
  const edit = useEdit();
  const t = useTranslations("admin");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!edit) return <>{children}</>;
  return (
    <div className={clsx("relative outline-2 outline-offset-4 outline-sun-500/70 outline-dashed", className)}>
      {children}
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="absolute top-3 left-3 z-10 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-sun-400 px-3 text-sm font-semibold text-navy-950 shadow-lg hover:bg-sun-300"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />}
        {t("editChangeImage")}
        <span className="sr-only">: {label}</span>
      </button>
      {err && <p role="alert" className="absolute top-14 left-3 z-10 rounded bg-white px-2 py-1 text-xs text-seal">{err}</p>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setErr(null);
          const res = await uploadSiteImage(f);
          setBusy(false);
          if ("error" in res) return setErr(res.error === "imageSize" ? t("imageSize") : res.error === "imageType" ? t("imageType") : t("videoUploadFailed"));
          edit.set(path, res.url);
        }}
      />
    </div>
  );
}
