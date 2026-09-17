-- Snowfolio — Supabase / Postgres schema
-- Run this in the Supabase SQL editor (or psql) to create the transactions table.

create table if not exists public.transactions (
  id         uuid primary key,
  type       text not null check (type in ('BUY', 'SELL', 'DIVIDEND')),
  ticker     text not null,
  date       date not null,
  shares     numeric not null default 0,
  price      numeric not null default 0,
  amount     numeric not null default 0,
  fee        numeric not null default 0,
  note       text default '',
  created_at timestamptz not null default now()
);

create index if not exists transactions_ticker_idx on public.transactions (ticker);
create index if not exists transactions_date_idx on public.transactions (date desc);

-- The app talks to Supabase with the SERVICE ROLE key from server-side code
-- only, so Row Level Security can stay enabled with no public policies.
-- (Never expose the service key to the browser.)
alter table public.transactions enable row level security;
