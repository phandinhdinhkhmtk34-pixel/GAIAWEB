# GAIA LEARNING PREMIUM V10

Corporate e-learning platform: anime-led training videos for companies in Japan, in seven languages.

> **Status: Phase 1 — navigable prototype.** All four pages are built and interactive, but every number,
> person, payment and video shown is **demo data** (labelled デモ / Demo on screen). There is no login,
> database, payment or real video streaming yet. Those arrive in Phases 2–4 (see `docs/REQUIREMENTS.md`).

## Pages

| Route | Page | What works in the prototype |
|---|---|---|
| `/{locale}` | Homepage | Hero, intro, features, featured videos, categories, 3 pricing cards, live price calculator |
| `/{locale}/library` | Video library | Search, category + subtitle-language filters, rows, locked/unlocked player dialog, favorites. A prototype switch shows guest / member / payment-pending access |
| `/{locale}/dashboard` | My page | Subscription status, learning stats + chart, history, favorites, payment history with 領収書 resend, employee invitations with seat limits, profile |
| `/{locale}/admin` | Admin center | KPIs + charts, bank-transfer approval, members, videos, homepage editor with live preview, audit log. A prototype switch shows the 3 admin roles |

Locales: `ja` (default), `vi`, `en`, `my`, `id`, `si`, `km`. Japanese, Vietnamese and English are complete;
Burmese, Indonesian, Sinhala and Khmer are AI drafts of the main strings (missing strings fall back to English)
and are marked "AI draft" in the language menu.

## Run locally

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev      # http://localhost:3000 → redirects to /ja
npm run build    # production build
npm run start    # serve the production build (PORT env var to change port)
npm run typecheck
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · next-intl · Motion · Recharts · lucide-react.
Planned: Supabase (PostgreSQL, Auth, Storage), Cloudflare Stream, Stripe, Resend.

## Project layout

```
messages/            UI text per locale (ja.json is the source of truth)
src/app/[locale]/    the four pages + layout
src/components/      page views and shared UI
src/lib/pricing.ts   pricing rules (shared by calculator, dashboard, admin; reused server-side later)
src/lib/demo-data.ts ALL demo data — removed when the database arrives
supabase/migrations/ draft database schema for Phase 2 (not applied yet)
docs/                confirmed requirements, architecture, deployment
```

## Deployment

See `docs/DEPLOYMENT.md` (Hostinger VPS with Node.js, PM2 and Nginx).
