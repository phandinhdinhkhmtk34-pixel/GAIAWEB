# Confirmed requirements (agreed with the client, Nov 2026)

## Accounts
- Individuals and companies can both sign up (email + password, email verification).
- A company manager invites employees **by email**; each employee sets their own password and gets an
  independent account and learning history. Each employee uses one purchased seat.

## Pricing (JPY, consumption tax included / 税込)
| Item | Monthly | Annual |
|---|---|---|
| Base subscription, includes 1 account (same for individuals and companies) | 30,000 | 300,000 (= 10 months) |
| Each additional account | 3,000 | 30,000 |
| Enterprise (50+ accounts, invoice billing, custom content) | Quote | Quote |

- Homepage shows 3 plan cards (Monthly / Annual / Enterprise) **and** a seat calculator.
- All prices are editable in Admin.

## Payments
- **Credit card (Stripe):** subscription unlocks automatically when Stripe confirms payment (webhook).
  Built with Stripe **test keys** first; the client will open a Stripe Japan account and test after the site is complete.
- **Bank transfer:** the customer receives bank details and an order code. An admin (Super or Accounting)
  checks the deposit and presses **Confirm payment** once; the subscription activates immediately and the customer is emailed.
- Paid videos stay locked for visitors, unpaid users and pending payments.
- **Receipts:** a 領収書 (PDF) is emailed to the customer for each confirmed payment.
- **Cancellation:** the plan stays usable until the end of the paid period, then locks automatically.
  Learning history is kept.

## Admin
Three roles, every action written to an audit log:
| Role | Can |
|---|---|
| Super admin | Everything, including managing other admins and prices |
| Accounting | Confirm payments, see revenue, members, audit log |
| Editor | Videos, categories, homepage content; no revenue figures |

## Languages
Japanese (default), Vietnamese, English, Burmese, Indonesian, Sinhala, Khmer.
JA/VI/EN written in full; the other four are AI drafts flagged for native review and editable in Admin.

## Design
- Homepage light and warm (golden-hour sunlight); video library dark navy "cinema"; dashboard and admin light.
- Prototype uses placeholder art; the official GAIA logo and the eight characters are swapped in via Admin later.

## Infrastructure
- New dedicated GitHub repository (separate from the LINE bot `gaia-line-ai`).
- Hosting: **Hostinger VPS** recommended (plan not purchased yet; verify current plans and Node.js support before buying).
- Video: **Cloudflare Stream** with signed, short-lived playback tokens issued only after a server-side subscription check.
- Domain: decided later.

## Access rule (single source of truth)
A user may play a premium video only if their account (or their company) has a subscription where
`status = 'active'` **and** `current_period_end > now()` **and** the latest payment is verified.
This is checked on the server for every playback token request.
