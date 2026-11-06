-- Contact form messages. Written and read only by the server (no policies). Safe to run again.
create table if not exists inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      citext not null,
  company    text not null default '',
  topic      text not null default 'other' check (topic in ('plan', 'payment', 'account', 'video', 'other')),
  message    text not null,
  locale     text not null default 'ja',
  status     text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists inquiries_created_idx on inquiries (created_at desc);
alter table inquiries enable row level security;
