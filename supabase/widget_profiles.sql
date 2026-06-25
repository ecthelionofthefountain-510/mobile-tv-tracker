-- Widget profile store for the upcoming-episodes widget backend.
-- Run this once in your Supabase project: SQL Editor → New query → Run.
--
-- Rows are keyed by sha1(widget token). Only the server touches this table,
-- using the service-role key, so RLS is enabled with NO policies — anon/auth
-- clients are denied, the service role bypasses RLS.

create table if not exists public.widget_profiles (
  token_hash text primary key,
  favorites  jsonb not null default '[]'::jsonb,
  watched    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.widget_profiles enable row level security;
