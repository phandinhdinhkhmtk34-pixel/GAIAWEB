-- Contracts: every agreement at checkout becomes a numbered contract document with the customer's details.
-- Includes 0011 (agreements table), so it works whether or not 0011 was run. Safe to run again.
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

create sequence if not exists contract_no_seq;
alter table agreements add column if not exists contract_no text unique
  default ('GL-C-' || to_char(now() at time zone 'Asia/Tokyo', 'YYYY') || '-' || lpad(nextval('contract_no_seq')::text, 5, '0'));
alter table agreements add column if not exists customer_kind    text not null default 'company';
alter table agreements add column if not exists customer_name    text not null default '';
alter table agreements add column if not exists customer_address text not null default '';
alter table agreements add column if not exists representative  text not null default '';
alter table agreements add column if not exists contact_name    text not null default '';
alter table agreements add column if not exists subscription_id uuid references subscriptions (id) on delete set null;
