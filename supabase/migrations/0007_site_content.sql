-- Phase 5: editable site content (logo, banner, characters, texts, company info, prices).
-- Run once in Supabase SQL Editor after 0006.

-- Public images used on the site (logo, banner, characters). Uploads only via one-time URLs issued to admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- One row holds the whole site: draft (being edited) and published (what visitors see).
insert into site_content (key, locale, draft, published)
values ('site', '*', '{}'::jsonb, null)
on conflict (key, locale) do nothing;
