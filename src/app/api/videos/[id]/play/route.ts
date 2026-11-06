import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** Playback links last one hour; the player asks again if a link expires mid-session. */
const LINK_SECONDS = 60 * 60;

/**
 * Issues a short-lived playback URL, but only after the server has checked, for this request,
 * that the viewer has a verified unexpired subscription (or is an admin). Never cached.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: "setup" }, { status: 503 });

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_watch", { p_user: viewer.id });
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const db = createAdminClient();
  const { data: video } = await db.from("videos").select("storage_path, state").eq("id", id).maybeSingle();
  // Drafts are only playable by admins (preview before publishing).
  if (!video || !video.storage_path || (video.state !== "published" && !viewer.adminRole)) {
    return NextResponse.json({ error: "notfound" }, { status: 404 });
  }
  const { data: signed, error } = await db.storage.from("videos").createSignedUrl(video.storage_path, LINK_SECONDS);
  if (error || !signed) return NextResponse.json({ error: "generic" }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
}
