-- GAIA LEARNING PREMIUM — initial schema (DRAFT for Phase 2, not yet applied).
-- Target: Supabase (PostgreSQL 15+). auth.users is managed by Supabase Auth.
-- Every account belongs to an organization: an individual is an organization with one seat.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------- enums ----------
create type org_kind as enum ('individual', 'company');
create type member_role as enum ('owner', 'employee');
create type admin_role as enum ('super', 'accounting', 'editor');
create type billing_period as enum ('monthly', 'annual');
create type subscription_status as enum ('pending_payment', 'active', 'cancelled', 'expired');
create type payment_method as enum ('card', 'bank_transfer');
create type payment_status as enum ('awaiting', 'verified', 'rejected', 'refunded');
create type publish_state as enum ('draft', 'published');

-- ---------- people & organizations ----------
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  kind          org_kind not null,
  name          text not null,
  created_at    timestamptz not null default now()
);

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  org_id        uuid not null references organizations (id) on delete restrict,
  member_role   member_role not null default 'employee',
  display_name  text not null default '',
  locale        text not null default 'ja' check (locale in ('ja','vi','en','my','id','si','km')),
  created_at    timestamptz not null default now()
);
create index on profiles (org_id);

create table admins (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  role          admin_role not null,
  created_at    timestamptz not null default now()
);

create table invitations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  email         citext not null,
  token_hash    text not null,          -- store only a hash of the emailed token
  invited_by    uuid not null references auth.users (id),
  expires_at    timestamptz not null,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, email)
);

-- ---------- pricing & subscriptions ----------
create table pricing_plans (
  id                uuid primary key default gen_random_uuid(),
  period            billing_period not null unique,
  base_price_jpy    integer not null check (base_price_jpy >= 0),  -- tax included
  seat_price_jpy    integer not null check (seat_price_jpy >= 0),  -- tax included, per extra account
  included_seats    integer not null default 1 check (included_seats >= 1),
  updated_at        timestamptz not null default now()
);
insert into pricing_plans (period, base_price_jpy, seat_price_jpy) values
  ('monthly', 30000, 3000),
  ('annual', 300000, 30000);

create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references organizations (id) on delete restrict,
  period                billing_period not null,
  seats                 integer not null check (seats >= 1),
  status                subscription_status not null default 'pending_payment',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  stripe_subscription_id text unique,
  created_at            timestamptz not null default now()
);
create index on subscriptions (org_id, status);

create table payments (
  id                uuid primary key default gen_random_uuid(),
  subscription_id   uuid not null references subscriptions (id) on delete restrict,
  order_code        text not null unique,               -- shown to bank-transfer customers
  method            payment_method not null,
  amount_jpy        integer not null check (amount_jpy > 0),
  status            payment_status not null default 'awaiting',
  stripe_payment_intent_id text unique,
  verified_by       uuid references auth.users (id),   -- admin who confirmed a bank transfer
  verified_at       timestamptz,
  receipt_number    text unique,                        -- 領収書 number, issued on verification
  receipt_sent_at   timestamptz,
  created_at        timestamptz not null default now()
);
create index on payments (status);

-- ---------- content ----------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  sort_order  integer not null default 0
);

create table videos (
  id                   uuid primary key default gen_random_uuid(),
  category_id          uuid not null references categories (id) on delete restrict,
  stream_uid           text not null unique,     -- Cloudflare Stream video id (never a public URL)
  duration_seconds     integer not null default 0,
  is_premium           boolean not null default true,
  state                publish_state not null default 'draft',
  published_at         timestamptz,
  created_at           timestamptz not null default now()
);

-- Multilingual titles/descriptions for categories and videos
create table translations (
  entity_type  text not null check (entity_type in ('category', 'video')),
  entity_id    uuid not null,
  locale       text not null check (locale in ('ja','vi','en','my','id','si','km')),
  title        text not null,
  description  text not null default '',
  is_draft     boolean not null default false,   -- AI draft awaiting native review
  primary key (entity_type, entity_id, locale)
);

create table subtitles (
  video_id  uuid not null references videos (id) on delete cascade,
  locale    text not null check (locale in ('ja','vi','en','my','id','si','km')),
  primary key (video_id, locale)
);

-- ---------- learning ----------
create table watch_progress (
  user_id          uuid not null references auth.users (id) on delete cascade,
  video_id         uuid not null references videos (id) on delete cascade,
  seconds_watched  integer not null default 0,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  video_id   uuid not null references videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- ---------- CMS ----------
create table site_content (
  key           text not null,            -- e.g. 'home.hero', 'footer.company'
  locale        text not null,
  draft         jsonb not null default '{}'::jsonb,
  published     jsonb,
  published_at  timestamptz,
  updated_by    uuid references auth.users (id),
  primary key (key, locale)
);

-- ---------- audit ----------
create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users (id),
  action     text not null,
  target     text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- access rule ----------
-- The single definition of "may watch premium". Called by the playback-token API on every request.
create or replace function has_active_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles pr
    join subscriptions s on s.org_id = pr.org_id
    where pr.id = p_user
      and s.status in ('active', 'cancelled')          -- cancelled keeps access until period end
      and s.current_period_end > now()
      and exists (select 1 from payments pa where pa.subscription_id = s.id and pa.status = 'verified')
  );
$$;

-- ---------- row level security (all tables locked by default) ----------
alter table organizations  enable row level security;
alter table profiles       enable row level security;
alter table admins         enable row level security;
alter table invitations    enable row level security;
alter table pricing_plans  enable row level security;
alter table subscriptions  enable row level security;
alter table payments       enable row level security;
alter table categories     enable row level security;
alter table videos         enable row level security;
alter table translations   enable row level security;
alter table subtitles      enable row level security;
alter table watch_progress enable row level security;
alter table favorites      enable row level security;
alter table site_content   enable row level security;
alter table audit_log      enable row level security;

-- Public read of published catalogue and prices
create policy "read published videos" on videos for select using (state = 'published');
create policy "read categories" on categories for select using (true);
create policy "read translations" on translations for select using (true);
create policy "read subtitles" on subtitles for select using (true);
create policy "read prices" on pricing_plans for select using (true);
create policy "read published content" on site_content for select using (published is not null);

-- Helpers run as definer so policies on profiles never query profiles under RLS (avoids recursion).
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public
as $$ select org_id from profiles where id = auth.uid() $$;

create or replace function is_org_owner() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and member_role = 'owner') $$;

-- Members see their own rows
create policy "own profile" on profiles for select using (id = auth.uid());
create policy "own progress" on watch_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favorites" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own org" on organizations for select using (id = current_org_id());
create policy "own org subscriptions" on subscriptions for select using (org_id = current_org_id());

-- Company owners see their employees' profiles and progress
create policy "owner sees org profiles" on profiles for select
  using (is_org_owner() and org_id = current_org_id());
create policy "owner sees org progress" on watch_progress for select
  using (is_org_owner() and user_id in (select id from profiles where org_id = current_org_id()));

-- Writes to payments, subscriptions, videos, content and admins go through server routes using the
-- service role, after checking the admin role; those routes also insert into audit_log.
