-- Account controls: suspend organizations; access checks respect it. Safe to run again.
alter table organizations add column if not exists suspended_at timestamptz;

-- No access while the organization is suspended (sign-in is also blocked by the server).
create or replace function can_watch(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = p_user)
      or (
        has_active_access(p_user)
        and not exists (
          select 1 from profiles p join organizations o on o.id = p.org_id
          where p.id = p_user and o.suspended_at is not null
        )
      );
$$;
