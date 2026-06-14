-- Mobile TV Tracker — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
--
-- It creates two tables (watched + favorites) plus a profiles table, and locks
-- them down with Row Level Security so each signed-in user can only read and
-- write their OWN rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- watched: every tracked movie / show. `data` holds the full item JSON
-- (same shape the app already uses, including season progress for TV).
-- ---------------------------------------------------------------------------
create table if not exists public.watched (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  media_type text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, media_type, item_id)
);

alter table public.watched enable row level security;

drop policy if exists "Watched is owned by user" on public.watched;
create policy "Watched is owned by user"
  on public.watched for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists watched_user_idx on public.watched (user_id);

-- ---------------------------------------------------------------------------
-- favorites: same shape as watched.
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  media_type text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, media_type, item_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Favorites are owned by user" on public.favorites;
create policy "Favorites are owned by user"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists favorites_user_idx on public.favorites (user_id);
