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
