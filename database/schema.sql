-- AI Job Saver — complete database schema
-- Run this in the Supabase SQL Editor of the PRODUCTION project that the
-- Render backend points to (SUPABASE_URL / SUPABASE_KEY).
-- The script is idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text,
  name text,
  avatar text,
  spreadsheet_id text,
  created_at timestamptz default now()
);

-- Jobs table (column names match what the backend code inserts, e.g.
-- "employmentType", "user_id", "created_at")
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  company text,
  location text,
  salary text,
  experience text,
  "employmentType" text,
  skills jsonb,
  description text,
  source text,
  url text,
  created_at timestamptz default now()
);

-- Backfill columns in case the tables already existed (e.g. older migration)
alter table users
  add column if not exists spreadsheet_id text;

alter table jobs
  add column if not exists user_id uuid references users(id) on delete cascade;

-- Keep RLS disabled so the backend can read/write with the SUPABASE_KEY
-- (service role or anon). If you later enable RLS, add policies for the
-- service role / anon key accordingly.
alter table users disable row level security;
alter table jobs disable row level security;

-- =====================================
-- Payments table (Razorpay)
-- =====================================
-- Status lifecycle: created -> paid | failed
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  razorpay_signature text,
  plan_id text,
  amount integer,
  currency text default 'INR',
  status text default 'created',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at on every change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
before update on payments
for each row execute function set_updated_at();

-- Indexes for fast lookups
create index if not exists payments_user_id_idx on payments (user_id);
create index if not exists payments_order_id_idx on payments (razorpay_order_id);

alter table payments disable row level security;
