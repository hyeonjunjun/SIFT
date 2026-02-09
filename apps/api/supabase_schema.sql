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

-- Ensure columns exist (if table was created without them)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'tier') then
    alter table public.profiles add column tier text default 'free' check (tier in ('free', 'plus', 'unlimited', 'admin'));
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'pin_style') then
    alter table public.profiles add column pin_style text default 'pin' check (pin_style in ('pin', 'heart', 'star', 'bookmark', 'lightning'));
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

-- 5. Create pending_sifts table for tracking URLs during processing
-- This allows retry of failed sifts and prevents URL loss
create table if not exists public.pending_sifts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  url text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'failed', 'completed')),
  error_message text,
  retry_count int default 0,
  last_attempt_at timestamp with time zone,
  -- Store the resulting page_id once completed (for linking)
  page_id uuid references public.pages(id) on delete set null
);

-- Enable RLS for pending_sifts
alter table public.pending_sifts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read their own pending sifts' and tablename = 'pending_sifts') then
    create policy "Users can read their own pending sifts" on public.pending_sifts for select to authenticated using (auth.uid() = user_id);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can create pending sifts' and tablename = 'pending_sifts') then
    create policy "Users can create pending sifts" on public.pending_sifts for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own pending sifts' and tablename = 'pending_sifts') then
    create policy "Users can update their own pending sifts" on public.pending_sifts for update to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own pending sifts' and tablename = 'pending_sifts') then
    create policy "Users can delete their own pending sifts" on public.pending_sifts for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Index for faster queries on user's pending sifts
create index if not exists idx_pending_sifts_user_id on public.pending_sifts(user_id);
create index if not exists idx_pending_sifts_status on public.pending_sifts(status);

-- 6. Create folders table for custom organization
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  name text not null,
  color text, -- hex color for folder icon
  icon text, -- phosphor icon name
  sort_order int default 0,
  is_pinned boolean default false
);

-- Enable RLS for folders
alter table public.folders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own folders' and tablename = 'folders') then
    create policy "Users can manage their own folders" on public.folders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Add folder_id to pages table if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pages' and column_name = 'folder_id') then
    alter table public.pages add column folder_id uuid references public.folders(id) on delete set null;
  end if;
end $$;

-- Add is_pinned to pages if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pages' and column_name = 'is_pinned') then
    alter table public.pages add column is_pinned boolean default false;
  end if;
end $$;

-- Add is_pinned to folders if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'folders' and column_name = 'is_pinned') then
    alter table public.folders add column is_pinned boolean default false;
  end if;
end $$;

-- Index for folder queries
create index if not exists idx_folders_user_id on public.folders(user_id);
create index if not exists idx_pages_folder_id on public.pages(folder_id);

-- 7. Create categories table (Smart Folders)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  name text not null,
  icon text, -- phosphor icon name
  tags text[], -- Array of tags this category watches
  sort_order int default 0
);

-- Enable RLS for categories
alter table public.categories enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own categories' and tablename = 'categories') then
    create policy "Users can manage their own categories" on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Index for category queries
create index if not exists idx_categories_user_id on public.categories(user_id);
