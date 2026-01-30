-- SIFT Database Schema
-- Run this in the Supabase SQL Editor.
-- This script is idempotent (safe to run multiple times).

-- 1. Create pages table
create table if not exists public.pages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id), -- Associate with Supabase Auth
  url text not null,
  platform text,
  title text,
  summary text,
  content text,
  tags text[],
  metadata jsonb,
  is_archived boolean default false,
  is_pinned boolean default false
);

-- Enable RLS (Security)
alter table public.pages enable row level security;

-- RLS Policies for pages
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can read sifts' and tablename = 'pages') then
    create policy "Authenticated users can read sifts" on public.pages for select to authenticated using (auth.uid() = user_id);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can create sifts' and tablename = 'pages') then
     create policy "Authenticated users can create sifts" on public.pages for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own sifts' and tablename = 'pages') then
    create policy "Users can update their own sifts" on public.pages for update to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own sifts' and tablename = 'pages') then
    create policy "Users can delete their own sifts" on public.pages for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- 2. Create waitlist table
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  status text default 'pending', -- 'pending', 'approved'
  created_at timestamp with time zone default now()
);

-- RLS for waitlist
alter table public.waitlist enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Anyone can join waitlist' and tablename = 'waitlist') then
    create policy "Anyone can join waitlist" on public.waitlist for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can view their own waitlist status' and tablename = 'waitlist') then
    create policy "Users can view their own waitlist status" on public.waitlist for select using (true); 
  end if;
end $$;

-- 3. Create profiles table for custom user data
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text,
  username text unique,
  bio text,
  avatar_url text,
  interests text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure 'tier' column exists (if table was created without it)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'tier') then
    alter table public.profiles add column tier text default 'free' check (tier in ('free', 'plus', 'unlimited', 'admin'));
  end if;
end $$;

-- Enable RLS for profiles
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public profiles are viewable by everyone.' and tablename = 'profiles') then
    create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile.' and tablename = 'profiles') then
    create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update own profile.' and tablename = 'profiles') then
    create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );
  end if;
end $$;

-- 4. Trigger for auto-profile creation on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

-- Only create the trigger if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;
