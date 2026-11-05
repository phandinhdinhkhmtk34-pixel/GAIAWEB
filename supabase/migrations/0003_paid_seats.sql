-- Phase 2.1: seats follow the paid model.
-- A company starts with 1 seat (its manager). Extra seats (+3,000 JPY/month each) are added by an
-- admin after payment is confirmed; from Phase 4 they are also added automatically by card payment.
-- Run once in Supabase SQL Editor after 0002.

alter table organizations alter column seat_limit set default 1;

-- Existing organizations: never fewer seats than the people already in them.
update organizations o
set seat_limit = greatest(1, (select count(*) from profiles p where p.org_id = o.id));

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
    values (v_kind, coalesce(nullif(trim(meta->>'org_name'), ''), v_name), 1)
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
