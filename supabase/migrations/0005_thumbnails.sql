-- Phase 3.1: cover images for videos.
-- Run once in Supabase SQL Editor after 0004.

alter table videos add column if not exists thumbnail_path text;

-- Cover images are not paid content, so they live in a public bucket (fast to load, cacheable).
-- Uploads still go only through one-time URLs issued by the server to admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
