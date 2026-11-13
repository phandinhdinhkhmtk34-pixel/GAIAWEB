-- Online contract: a record of each agreement to the terms at checkout. Safe to run again.
-- Written and read only by the server (RLS on, no policies).
create table if not exists agreements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations (id) on delete set null,
  user_id     uuid,
  org_name    text not null default '',
  email       text not null default '',
  method      text not null default '',
  period      text not null default '',
  seats       int  not null default 1,
  amount_jpy  int  not null default 0,
  terms_text  text not null,
  contract_text text not null,
  ip          text not null default '',
  user_agent  text not null default '',
  agreed_at   timestamptz not null default now()
);
create index if not exists agreements_org_idx on agreements (org_id, agreed_at desc);
alter table agreements enable row level security;
