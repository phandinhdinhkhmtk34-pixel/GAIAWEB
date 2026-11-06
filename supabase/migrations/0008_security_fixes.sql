-- Security fixes found in the pre-launch review. Run once in Supabase SQL Editor after 0007.

-- 1) Joining a company now requires a real, unexpired invitation for that exact email.
--    (Previously the sign-up metadata alone was trusted, so anyone could name a company id.)
-- 2) Admin access from admin_bootstrap is granted only once the email is confirmed.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_org     uuid;
  v_kind    org_kind;
  v_name    text := coalesce(nullif(trim(meta->>'display_name'), ''), split_part(new.email, '@', 1));
  v_used    integer;
  v_limit   integer;
  v_invited boolean := false;
begin
  if meta ? 'invited_org_id' then
    begin
      v_org := (meta->>'invited_org_id')::uuid;
    exception when others then
      v_org := null;
    end;
    select exists (
      select 1 from invitations i
      where i.org_id = v_org and lower(i.email::text) = lower(new.email)
        and i.accepted_at is null and i.expires_at > now()
    ) into v_invited;
  end if;

  if v_invited then
    select seat_limit into v_limit from organizations where id = v_org for update;
    select count(*) into v_used from profiles where org_id = v_org;
    if v_used >= v_limit then
      raise exception 'no free seats in organization';
    end if;
    insert into profiles (id, org_id, member_role, display_name, email)
    values (new.id, v_org, 'employee', v_name, new.email);
    update invitations set accepted_at = now() where org_id = v_org and lower(email::text) = lower(new.email);
  else
    -- No valid invitation: an ordinary self sign-up with its own organization.
    v_kind := case when meta->>'kind' = 'company' then 'company'::org_kind else 'individual'::org_kind end;
    insert into organizations (kind, name, seat_limit)
    values (v_kind, coalesce(nullif(trim(meta->>'org_name'), ''), v_name), 1)
    returning id into v_org;
    insert into profiles (id, org_id, member_role, display_name, email)
    values (new.id, v_org, 'owner', v_name, new.email);
  end if;

  if new.email_confirmed_at is not null then
    insert into admins (user_id, role)
    select new.id, b.role from admin_bootstrap b where lower(b.email::text) = lower(new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Grant pending admin access at the moment the email becomes confirmed.
create or replace function handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into admins (user_id, role)
    select new.id, b.role from admin_bootstrap b where lower(b.email::text) = lower(new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function handle_email_confirmed();

-- 3) Learning progress is written only through record_progress(), which checks access.
drop policy if exists "own progress" on watch_progress;
create policy "own progress read" on watch_progress for select using (user_id = auth.uid());

-- 4) Video titles of drafts are no longer readable by the public.
drop policy if exists "read translations" on translations;
create policy "read translations" on translations for select using (
  entity_type <> 'video' or exists (select 1 from videos v where v.id = entity_id and v.state = 'published')
);
