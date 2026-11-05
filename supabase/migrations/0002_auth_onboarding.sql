-- Phase 2: sign-up onboarding, company seats, admin bootstrap.
-- Run after 0001_initial_schema.sql (Supabase Dashboard → SQL Editor → paste → Run).

-- Seats a company may use during the trial. Phase 4 syncs this from the paid subscription.
alter table organizations add column seat_limit integer not null default 5 check (seat_limit >= 1);

-- Keep the email on the profile so company managers and admins can list people without reading auth.users.
alter table profiles add column email citext;
create unique index profiles_email_key on profiles (email);

-- Supabase Auth sends and verifies the invitation link itself, so no token is stored here.
alter table invitations alter column token_hash drop not null;

-- Emails that become admins automatically when they sign up (or immediately, if they already exist).
create table admin_bootstrap (
  email citext primary key,
  role  admin_role not null
);
alter table admin_bootstrap enable row level security; -- no policies: server/SQL only

insert into admin_bootstrap (email, role) values ('phandinhdinhkhmtk34@gmail.com', 'super')
on conflict (email) do update set role = excluded.role;

-- A newly created auth user gets an organization + profile.
--  * Self sign-up: metadata { kind: 'individual'|'company', display_name, org_name }
--    → new organization, the user is its owner.
--  * Invited employee: metadata { invited_org_id } (set by the server when inviting)
--    → joins that organization as an employee, if a seat is free.
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
begin
  if meta ? 'invited_org_id' then
    v_org := (meta->>'invited_org_id')::uuid;
    select seat_limit into v_limit from organizations where id = v_org for update;
    if v_limit is null then
      raise exception 'invited organization does not exist';
    end if;
    select count(*) into v_used from profiles where org_id = v_org;
    if v_used >= v_limit then
      raise exception 'no free seats in organization';
    end if;
    insert into profiles (id, org_id, member_role, display_name, email)
    values (new.id, v_org, 'employee', v_name, new.email);
    update invitations set accepted_at = now() where org_id = v_org and email = new.email;
  else
    v_kind := case when meta->>'kind' = 'company' then 'company'::org_kind else 'individual'::org_kind end;
    insert into organizations (kind, name, seat_limit)
    values (
      v_kind,
      coalesce(nullif(trim(meta->>'org_name'), ''), v_name),
      case when v_kind = 'company' then 5 else 1 end
    )
    returning id into v_org;
    insert into profiles (id, org_id, member_role, display_name, email)
    values (new.id, v_org, 'owner', v_name, new.email);
  end if;

  insert into admins (user_id, role)
  select new.id, b.role from admin_bootstrap b where b.email = new.email
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- If the super admin already signed up before this migration ran, promote them now.
insert into admins (user_id, role)
select u.id, b.role from auth.users u join admin_bootstrap b on b.email = u.email
on conflict (user_id) do nothing;

-- Members may read their own admin row (the app uses it to show the Admin link).
create policy "own admin row" on admins for select using (user_id = auth.uid());

-- Owners may read their organization's pending invitations.
create policy "owner sees org invitations" on invitations for select
  using (is_org_owner() and org_id = current_org_id());

-- Members may update their own display name and language.
create policy "update own profile" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and org_id = current_org_id());
revoke update on profiles from authenticated;
grant update (display_name, locale) on profiles to authenticated;
