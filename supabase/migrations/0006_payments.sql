-- Phase 4: card payments (Stripe), direct bank transfers, receipts.
-- Run once in Supabase SQL Editor after 0005.

alter table organizations add column if not exists stripe_customer_id text unique;

-- What a payment was for, so confirming it applies the right change.
alter table payments add column if not exists kind text not null default 'plan' check (kind in ('plan', 'renew', 'seats'));
alter table payments add column if not exists period billing_period;
alter table payments add column if not exists seats integer check (seats is null or seats >= 1);
alter table payments add column if not exists stripe_invoice_id text unique;
alter table payments add column if not exists note text;

-- 領収書 numbers: R2026-000001, issued once, in order.
create sequence if not exists receipt_seq;
create or replace function next_receipt_number() returns text
language sql volatile security definer set search_path = public
as $$ select 'R' || to_char(now() at time zone 'Asia/Tokyo', 'YYYY') || '-' || lpad(nextval('receipt_seq')::text, 6, '0') $$;
revoke execute on function next_receipt_number() from public, anon, authenticated;
-- Only the server (service role) issues receipt numbers.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function next_receipt_number() to service_role;
    grant usage, select on sequence receipt_seq to service_role;
  end if;
end $$;

-- Bank account shown to customers and the issuer printed on receipts (one row, edited in Admin).
create table if not exists billing_settings (
  id                  integer primary key default 1 check (id = 1),
  bank_name           text not null default '',
  branch_name         text not null default '',
  account_type        text not null default '普通',
  account_number      text not null default '',
  account_holder_kana text not null default '',
  issuer_name         text not null default '',
  issuer_address      text not null default '',
  issuer_phone        text not null default '',
  invoice_reg_no      text not null default '',
  transfer_note       text not null default '',
  stripe_seat_product_id text,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id)
);
alter table billing_settings enable row level security;
-- Signed-in members may read it (bank details are shown at checkout); writes go through the server.
create policy "members read billing settings" on billing_settings for select to authenticated using (true);

insert into billing_settings (id, bank_name, branch_name, account_type, account_number, account_holder_kana,
  issuer_name, issuer_address, issuer_phone, invoice_reg_no, transfer_note)
values (1, '（テスト）みずほ銀行', '（テスト）東京営業部', '普通', '0000000', 'カ）ガイア（テスト）',
  '株式会社GAIA（テスト表記）', '東京都（テスト住所）', '03-0000-0000', '',
  '振込名義の先頭に注文番号を入れてください（例：GL123456 タナカタロウ）。振込手数料はお客様のご負担となります。')
on conflict (id) do nothing;
