"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { getViewer, type AdminRole } from "./auth";
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { addPeriod } from "./billing";

export type AdminActionState = { error?: string; ok?: string; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: AdminRole[] = ["super", "accounting", "editor"];

function localeOf(fd: FormData) {
  const l = String(fd.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}

/** Every admin action requires a Super admin who has passed 2-step verification in this session. */
async function requireSuper() {
  const v = await getViewer();
  if (!v || v.adminRole !== "super" || v.aal !== "aal2" || !hasServiceRole) return null;
  return v;
}

export async function grantAdminAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await requireSuper();
  if (!me) return { error: "forbidden" };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "") as AdminRole;
  if (!EMAIL.test(email)) return { error: "emailFormat" };
  if (!ROLES.includes(role)) return { error: "generic" };

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile) {
    if (profile.id === me.id) return { error: "self" };
    const { error } = await db.from("admins").upsert({ user_id: profile.id, role }, { onConflict: "user_id" });
    if (error) return { error: "generic" };
  } else {
    // Not registered yet: they become an admin automatically when they sign up with this email.
    const { error } = await db.from("admin_bootstrap").upsert({ email, role }, { onConflict: "email" });
    if (error) return { error: "generic" };
  }
  await db.from("audit_log").insert({ actor_id: me.id, action: "grant_admin", target: email, details: { role, pending: !profile } });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: profile ? "adminGranted" : "adminPending", email };
}

export async function revokeAdminAction(fd: FormData) {
  const me = await requireSuper();
  if (!me) return;
  const userId = String(fd.get("userId") ?? "");
  const email = String(fd.get("email") ?? "").toLowerCase();
  if (!userId || userId === me.id) return; // never lock yourself out
  const db = createAdminClient();
  if (userId !== "pending") await db.from("admins").delete().eq("user_id", userId);
  if (email) await db.from("admin_bootstrap").delete().eq("email", email);
  await db.from("audit_log").insert({ actor_id: me.id, action: "revoke_admin", target: email || userId });
  revalidatePath(`/${localeOf(fd)}/admin`);
}

/**
 * Super admins and accounting set how many seats a company has paid for.
 * Never below the people already using seats (members + pending invitations).
 */
export async function setSeatsAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await getViewer();
  if (!me || !me.adminRole || me.adminRole === "editor" || me.aal !== "aal2" || !hasServiceRole) return { error: "forbidden" };
  const orgId = String(fd.get("orgId") ?? "");
  const seats = Number(fd.get("seats"));
  if (!orgId || !Number.isInteger(seats) || seats < 1 || seats > 1000) return { error: "seatsInvalid" };

  const db = createAdminClient();
  const [{ count: members }, { count: pending }, { data: org }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db.from("invitations").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
    db.from("organizations").select("name, seat_limit").eq("id", orgId).maybeSingle(),
  ]);
  if (!org) return { error: "generic" };
  const used = (members ?? 0) + (pending ?? 0);
  if (seats < used) return { error: "seatsBelowUsed", email: String(used) };

  const { error } = await db.from("organizations").update({ seat_limit: seats }).eq("id", orgId);
  if (error) return { error: "generic" };
  await db.from("audit_log").insert({
    actor_id: me.id,
    action: "set_seats",
    target: org.name,
    details: { org_id: orgId, from: org.seat_limit, to: seats },
  });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: "seatsSaved" };
}

/* ------------------------------------------------------------------ videos */

async function requireRole(roles: AdminRole[]) {
  const v = await getViewer();
  if (!v || !v.adminRole || !roles.includes(v.adminRole) || v.aal !== "aal2" || !hasServiceRole) return null;
  return v;
}

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Step 1 of an upload: a one-time URL the browser uploads the file to directly (files never pass through Vercel). */
export async function createVideoUploadAction(input: { type: string; size: number }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  const ext = VIDEO_TYPES[input.type];
  if (!ext) return { error: "videoType" as const };
  if (!(input.size > 0) || input.size > MAX_VIDEO_BYTES) return { error: "videoSize" as const };
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("videos").createSignedUploadUrl(path);
  if (error || !data) return { error: "generic" as const };
  return { path: data.path, token: data.token };
}

const LOCALES_FOR_TEXT = ["ja", "vi", "en"] as const;

/** Step 2: save the video's details once the file is uploaded. */
export async function saveVideoAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" };
  const path = String(fd.get("storagePath") ?? "");
  const categoryId = String(fd.get("categoryId") ?? "");
  const character = String(fd.get("character") ?? "").trim().slice(0, 60);
  const rawThumb = String(fd.get("thumbnailPath") ?? "");
  const thumbnailPath = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(rawThumb) ? rawThumb : null;
  const publish = fd.get("publish") === "1";
  const titles = Object.fromEntries(LOCALES_FOR_TEXT.map((l) => [l, String(fd.get(`title_${l}`) ?? "").trim().slice(0, 120)]));
  const descs = Object.fromEntries(LOCALES_FOR_TEXT.map((l) => [l, String(fd.get(`desc_${l}`) ?? "").trim().slice(0, 600)]));
  if (!path || !categoryId) return { error: "videoMissingFile" };
  if (!titles.ja) return { error: "videoMissingTitle" };

  const db = createAdminClient();
  // The file must really exist in the bucket before we point a video at it.
  const folder = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop() ?? "";
  const { data: listed } = await db.storage.from("videos").list(folder, { search: name });
  if (!listed?.some((f) => f.name === name)) return { error: "videoMissingFile" };

  const { data: video, error } = await db
    .from("videos")
    .insert({
      category_id: categoryId,
      storage_path: path,
      character_name: character,
      thumbnail_path: thumbnailPath,
      state: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error || !video) return { error: "generic" };

  const rows = LOCALES_FOR_TEXT.filter((l) => titles[l]).map((l) => ({
    entity_type: "video",
    entity_id: video.id,
    locale: l,
    title: titles[l],
    description: descs[l] ?? "",
    is_draft: false,
  }));
  await db.from("translations").insert(rows);
  await db.from("audit_log").insert({ actor_id: me.id, action: publish ? "publish_video" : "add_video", target: titles.ja });
  revalidatePath(`/${localeOf(fd)}/admin`);
  revalidatePath(`/${localeOf(fd)}/library`);
  return { ok: publish ? "videoPublished" : "videoSaved" };
}

export async function setVideoStateAction(fd: FormData) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return;
  const id = String(fd.get("videoId") ?? "");
  const publish = fd.get("publish") === "1";
  const db = createAdminClient();
  await db
    .from("videos")
    .update({ state: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null })
    .eq("id", id);
  await db.from("audit_log").insert({ actor_id: me.id, action: publish ? "publish_video" : "unpublish_video", target: id });
  revalidatePath(`/${localeOf(fd)}/admin`);
  revalidatePath(`/${localeOf(fd)}/library`);
}

export async function deleteVideoAction(fd: FormData) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return;
  const id = String(fd.get("videoId") ?? "");
  const db = createAdminClient();
  const { data: v } = await db.from("videos").select("storage_path, thumbnail_path").eq("id", id).maybeSingle();
  if (!v) return;
  if (v.thumbnail_path) await db.storage.from("thumbnails").remove([v.thumbnail_path]);
  await db.from("translations").delete().eq("entity_type", "video").eq("entity_id", id);
  await db.from("videos").delete().eq("id", id);
  if (v.storage_path) await db.storage.from("videos").remove([v.storage_path]);
  await db.from("audit_log").insert({ actor_id: me.id, action: "delete_video", target: id });
  revalidatePath(`/${localeOf(fd)}/admin`);
  revalidatePath(`/${localeOf(fd)}/library`);
}

/* ----------------------------------------------------------- subscriptions */

/**
 * Until Phase 4 checkout exists, an admin activates a plan after confirming payment.
 * It is recorded exactly like a confirmed bank transfer: an active subscription plus a verified payment.
 */
export async function activatePlanAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const me = await requireRole(["super", "accounting"]);
  if (!me) return { error: "forbidden" };
  const orgId = String(fd.get("orgId") ?? "");
  const period = fd.get("period") === "annual" ? "annual" : "monthly";
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("name, seat_limit").eq("id", orgId).maybeSingle();
  if (!org) return { error: "generic" };

  const { data: plan } = await db.from("pricing_plans").select("base_price_jpy, seat_price_jpy, included_seats").eq("period", period).maybeSingle();
  const base = plan?.base_price_jpy ?? (period === "annual" ? 300000 : 30000);
  const seat = plan?.seat_price_jpy ?? (period === "annual" ? 30000 : 3000);
  const amount = base + Math.max(0, org.seat_limit - (plan?.included_seats ?? 1)) * seat;

  const start = new Date();
  const end = addPeriod(start, period);

  // One live subscription per organization: close any previous one first.
  await db.from("subscriptions").update({ status: "expired", current_period_end: start.toISOString() }).eq("org_id", orgId).in("status", ["active", "cancelled", "pending_payment"]);
  const { data: sub, error } = await db
    .from("subscriptions")
    .insert({ org_id: orgId, period, seats: org.seat_limit, status: "active", current_period_start: start.toISOString(), current_period_end: end.toISOString() })
    .select("id")
    .single();
  if (error || !sub) return { error: "generic" };
  const code = `GL-${start.getTime().toString(36).toUpperCase()}`;
  await db.from("payments").insert({
    subscription_id: sub.id,
    order_code: code,
    method: "bank_transfer",
    amount_jpy: amount,
    status: "verified",
    verified_by: me.id,
    verified_at: start.toISOString(),
    receipt_number: String((await db.rpc("next_receipt_number")).data),
    kind: "plan",
    period,
    seats: org.seat_limit,
    note: "manual activation",
  });
  await db.from("audit_log").insert({ actor_id: me.id, action: "activate_plan", target: org.name, details: { period, amount, order_code: code } });
  revalidatePath(`/${localeOf(fd)}/admin`);
  return { ok: "planActivated" };
}

export async function endPlanAction(fd: FormData) {
  const me = await requireRole(["super", "accounting"]);
  if (!me) return;
  const orgId = String(fd.get("orgId") ?? "");
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("name").eq("id", orgId).maybeSingle();
  await db.from("subscriptions").update({ status: "expired", current_period_end: new Date().toISOString() }).eq("org_id", orgId).in("status", ["active", "cancelled"]);
  await db.from("audit_log").insert({ actor_id: me.id, action: "end_plan", target: org?.name ?? orgId });
  revalidatePath(`/${localeOf(fd)}/admin`);
}

/* -------------------------------------------------------------- thumbnails */

/** Only paths this app issues: "YYYY-MM/<uuid>.<ext>". */
const THUMB_PATH = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** A one-time URL for uploading a cover image to the public thumbnails bucket. */
export async function createThumbnailUploadAction(input: { type: string; size: number }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  const ext = IMAGE_TYPES[input.type];
  if (!ext) return { error: "imageType" as const };
  if (!(input.size > 0) || input.size > MAX_IMAGE_BYTES) return { error: "imageSize" as const };
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("thumbnails").createSignedUploadUrl(path);
  if (error || !data) return { error: "generic" as const };
  return { path: data.path, token: data.token };
}

/** Point a video at a newly uploaded cover image and remove the old one. */
export async function setThumbnailAction(input: { videoId: string; path: string; locale: string }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  if (!THUMB_PATH.test(input.path)) return { error: "generic" as const };
  const db = createAdminClient();
  const { data: v } = await db.from("videos").select("thumbnail_path").eq("id", input.videoId).maybeSingle();
  if (!v) return { error: "generic" as const };
  const { error } = await db.from("videos").update({ thumbnail_path: input.path }).eq("id", input.videoId);
  if (error) return { error: "generic" as const };
  if (v.thumbnail_path && v.thumbnail_path !== input.path) await db.storage.from("thumbnails").remove([v.thumbnail_path]);
  await db.from("audit_log").insert({ actor_id: me.id, action: "set_thumbnail", target: input.videoId });
  const locale = (routing.locales as readonly string[]).includes(input.locale) ? input.locale : routing.defaultLocale;
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/library`);
  return { ok: true as const };
}

/* ------------------------------------------------------------- site content */

/** One-time URL for a site image (logo, banner, character) in the public "site" bucket. */
export async function createSiteImageUploadAction(input: { type: string; size: number }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  const ext = IMAGE_TYPES[input.type];
  if (!ext) return { error: "imageType" as const };
  if (!(input.size > 0) || input.size > MAX_IMAGE_BYTES) return { error: "imageSize" as const };
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const db = createAdminClient();
  const { data, error } = await db.storage.from("site").createSignedUploadUrl(path);
  if (error || !data) return { error: "generic" as const };
  const publicUrl = db.storage.from("site").getPublicUrl(path).data.publicUrl;
  return { path: data.path, token: data.token, publicUrl };
}

/** Save the working copy. Visitors keep seeing the published version until "publish". */
export async function saveSiteDraftAction(input: { content: unknown; locale: string }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  const { normalizeSiteContent } = await import("./site-content");
  const content = normalizeSiteContent(input.content);
  const db = createAdminClient();
  const { error } = await db
    .from("site_content")
    .upsert({ key: "site", locale: "*", draft: content, updated_by: me.id }, { onConflict: "key,locale" });
  if (error) return { error: "generic" as const };
  return { ok: true as const };
}

/** Publish the working copy: visitors see it immediately, and billing uses the new prices. */
export async function publishSiteAction(input: { content: unknown; locale: string }) {
  const me = await requireRole(["super", "editor"]);
  if (!me) return { error: "forbidden" as const };
  const { normalizeSiteContent } = await import("./site-content");
  const content = normalizeSiteContent(input.content);
  const db = createAdminClient();
  // Prices decide what customers are charged, so only a Super admin may change them.
  const { data: current } = await db.from("pricing_plans").select("period, base_price_jpy, seat_price_jpy");
  const cur = (p: string) => current?.find((r) => r.period === p);
  const priceChanged =
    cur("monthly")?.base_price_jpy !== content.prices.baseMonthly ||
    cur("monthly")?.seat_price_jpy !== content.prices.seatMonthly ||
    cur("annual")?.base_price_jpy !== content.prices.baseAnnual ||
    cur("annual")?.seat_price_jpy !== content.prices.seatAnnual;
  if (priceChanged && me.adminRole !== "super") return { error: "pricesSuperOnly" as const };

  const { error } = await db.from("site_content").upsert(
    { key: "site", locale: "*", draft: content, published: content, published_at: new Date().toISOString(), updated_by: me.id },
    { onConflict: "key,locale" },
  );
  if (error) return { error: "generic" as const };
  if (priceChanged) {
    await db.from("pricing_plans").update({ base_price_jpy: content.prices.baseMonthly, seat_price_jpy: content.prices.seatMonthly, updated_at: new Date().toISOString() }).eq("period", "monthly");
    await db.from("pricing_plans").update({ base_price_jpy: content.prices.baseAnnual, seat_price_jpy: content.prices.seatAnnual, updated_at: new Date().toISOString() }).eq("period", "annual");
  }
  await db.from("audit_log").insert({ actor_id: me.id, action: "publish_site", target: "site", details: { priceChanged } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
