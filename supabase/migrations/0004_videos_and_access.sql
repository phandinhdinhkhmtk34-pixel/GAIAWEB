-- Phase 3: video library, paid access, learning progress.
-- Run once in Supabase SQL Editor after 0003.

-- Every video is paid: there is no free tier, so the premium flag goes away.
alter table videos drop column if exists is_premium;

-- Trial storage: files live in the private Supabase Storage bucket "videos".
-- Production moves to Cloudflare Stream (stream_uid); exactly one of the two is set.
alter table videos alter column stream_uid drop not null;
alter table videos add column storage_path text unique;
alter table videos add column character_name text not null default '';
alter table videos add column created_by uuid references auth.users (id);
alter table videos add constraint videos_source_check check (stream_uid is not null or storage_path is not null);

-- Private bucket, 50 MB per file (the Supabase free-plan upload limit). No storage policies:
-- only the server (service role) issues upload and playback URLs, after checking permissions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Learning categories (names in translations, editable later in Admin).
insert into categories (slug, sort_order) values
  ('manners', 1), ('safety', 2), ('japanese', 3), ('it', 4), ('compliance', 5), ('service', 6)
on conflict (slug) do nothing;

insert into translations (entity_type, entity_id, locale, title)
select 'category', c.id, t.locale, t.title
from categories c
join (values
  ('manners', 'ja', 'ビジネスマナー'), ('manners', 'vi', 'Tác phong công sở'), ('manners', 'en', 'Business manners'),
  ('safety', 'ja', '安全衛生'), ('safety', 'vi', 'An toàn lao động'), ('safety', 'en', 'Workplace safety'),
  ('japanese', 'ja', '仕事の日本語'), ('japanese', 'vi', 'Tiếng Nhật công việc'), ('japanese', 'en', 'Japanese for work'),
  ('it', 'ja', 'IT・デジタル'), ('it', 'vi', 'IT & kỹ năng số'), ('it', 'en', 'IT & digital'),
  ('compliance', 'ja', 'コンプライアンス'), ('compliance', 'vi', 'Tuân thủ'), ('compliance', 'en', 'Compliance'),
  ('service', 'ja', '接客・サービス'), ('service', 'vi', 'Phục vụ khách hàng'), ('service', 'en', 'Customer service')
) as t(slug, locale, title) on t.slug = c.slug
on conflict (entity_type, entity_id, locale) do nothing;

-- Company managers (and individual members, who own their organization) read their payments.
create policy "owner reads org payments" on payments for select
  using (is_org_owner() and subscription_id in (select id from subscriptions where org_id = current_org_id()));

-- Who may watch right now: a verified, unexpired subscription, or any admin (to check content).
create or replace function can_watch(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_active_access(p_user) or exists (select 1 from admins where user_id = p_user);
$$;

-- Watch progress is written by the signed-in user only; completion is derived, not trusted from the client.
create or replace function record_progress(p_video uuid, p_seconds integer, p_duration integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not can_watch(auth.uid()) then
    raise exception 'not allowed';
  end if;
  insert into watch_progress (user_id, video_id, seconds_watched, completed_at, updated_at)
  values (
    auth.uid(), p_video, greatest(0, p_seconds),
    case when p_duration > 0 and p_seconds >= p_duration * 0.9 then now() end,
    now()
  )
  on conflict (user_id, video_id) do update set
    seconds_watched = greatest(watch_progress.seconds_watched, excluded.seconds_watched),
    completed_at = coalesce(watch_progress.completed_at, excluded.completed_at),
    updated_at = now();
end;
$$;
grant execute on function record_progress(uuid, integer, integer) to authenticated;

-- Store the real duration once the browser has loaded the file (only if not known yet).
create or replace function set_video_duration(p_video uuid, p_duration integer)
returns void
language sql
security definer
set search_path = public
as $$
  update videos set duration_seconds = p_duration
  where id = p_video and duration_seconds = 0 and p_duration between 1 and 86400 and auth.uid() is not null;
$$;
grant execute on function set_video_duration(uuid, integer) to authenticated;
