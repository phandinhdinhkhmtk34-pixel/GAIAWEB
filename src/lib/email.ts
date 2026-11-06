import "server-only";

/**
 * Optional email via Resend (https://resend.com). Without RESEND_API_KEY nothing is sent and every
 * call is a no-op, so the site works the same. With a verified domain, customers get emails;
 * on the free plan without a domain, Resend only delivers to the account owner (fine for admin alerts).
 */
const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "GAIA LEARNING <onboarding@resend.dev>";
export const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || "";
export const emailEnabled = Boolean(KEY);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string, subject: string, lines: string[], link?: { href: string; label: string }) {
  if (!KEY || !to) return false;
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#0d1a3a">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}${
    link ? `<p><a href="${esc(link.href)}" style="display:inline-block;background:#e2a030;color:#070f26;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${esc(link.label)}</a></p>` : ""
  }<p style="color:#6a7388;font-size:12px">GAIA LEARNING</p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text: [...lines, link ? `${link.label}: ${link.href}` : ""].join("\n\n") }),
    });
    return res.ok;
  } catch {
    return false; // email must never break the action that triggered it
  }
}
