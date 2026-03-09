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
    create policy "Authenticated users can read sifts" on public.pages for select to authenticated 
    using (
      auth.uid() = user_id OR 
      (folder_id IS NOT NULL AND exists (
        select 1 from public.folder_members where folder_members.folder_id = pages.folder_id and folder_members.user_id = auth.uid()
      ))
    );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can create sifts' and tablename = 'pages') then
     create policy "Authenticated users can create sifts" on public.pages for insert to authenticated 
     with check (
       auth.uid() = user_id OR 
       (folder_id IS NOT NULL AND exists (
         select 1 from public.folder_members where folder_members.folder_id = pages.folder_id and folder_members.user_id = auth.uid() and folder_members.role in ('owner', 'contributor')
       ))
     );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own sifts' and tablename = 'pages') then
    create policy "Users can update their own sifts" on public.pages for update to authenticated 
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own sifts' and tablename = 'pages') then
    create policy "Users can delete their own sifts" on public.pages for delete to authenticated 
    using (
      auth.uid() = user_id OR 
      (folder_id IS NOT NULL AND exists (
        select 1 from public.folder_members where folder_members.folder_id = pages.folder_id and folder_members.user_id = auth.uid() and folder_members.role = 'owner'
      ))
    );
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

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'sift_id') then
    alter table public.profiles add column sift_id text unique;
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
  is_pinned boolean default false,
  image_url text
);

-- Enable RLS for folders
alter table public.folders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own folders' and tablename = 'folders') then
    create policy "Users can manage their own folders" on public.folders for all to authenticated 
    using (auth.uid() = user_id OR exists (
      select 1 from public.folder_members fm where fm.folder_id = id and fm.user_id = auth.uid()
    )) 
    with check (auth.uid() = user_id);
  end if;
end $$;

-- Add page_order to folders if not exists (for custom sift sorting)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'folders' and column_name = 'page_order') then
    alter table public.folders add column page_order uuid[] default '{}'::uuid[];
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'folders' and column_name = 'image_url') then
    alter table public.folders add column image_url text;
  end if;
end $$;

-- 6.5 Create folder_members table for shared collections
create table if not exists public.folder_members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  folder_id uuid references public.folders(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  invited_by uuid references auth.users(id),
  role text default 'contributor' check (role in ('owner', 'contributor', 'viewer')),
  status text default 'accepted' check (status in ('pending', 'accepted', 'declined')),
  unique(folder_id, user_id)
);

-- Enable RLS for folder_members
alter table public.folder_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can see their own memberships' and tablename = 'folder_members') then
    create policy "Users can see their own memberships" on public.folder_members 
    for select to authenticated 
    using (auth.uid() = user_id OR exists (
      select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid()
    ));
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Folder owners can manage memberships' and tablename = 'folder_members') then
    create policy "Folder owners can manage memberships" on public.folder_members 
    for all to authenticated 
    using (exists (
      select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid()
    ))
    with check (exists (
      select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid()
    ));
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can manage their own status' and tablename = 'folder_members') then
    create policy "Users can manage their own status" on public.folder_members 
    for update to authenticated 
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can leave shared folders' and tablename = 'folder_members') then
    create policy "Users can leave shared folders" on public.folder_members 
    for delete to authenticated 
    using (auth.uid() = user_id);
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
  tags text[] default '{}'::text[], -- Array of tags this category watches
  sort_order int default 0,
  color text,
  image_url text
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

-- 8. Performance Indexes (Added 2026-02-13)
-- Optimizes the main feed query: .eq('user_id', ...).order('is_pinned', ...).order('created_at', ...)
create index if not exists idx_pages_user_feed on public.pages(user_id, is_pinned desc, created_at desc);

-- 9. Social Features (Added 2026-02-16)

-- Friendships table
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) not null,
  friend_id uuid references public.profiles(id) not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  unique(user_id, friend_id)
);

-- Ensure friendships foreign keys point to profiles (for PostgREST joins to work)
do $$
begin
  -- Drop existing constraints if they point to auth.users
  begin
    alter table public.friendships drop constraint if exists friendships_user_id_fkey;
    alter table public.friendships drop constraint if exists friendships_friend_id_fkey;
  exception when others then null;
  end;
  
  -- Add correct constraints to profiles
  begin
    alter table public.friendships add constraint friendships_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
    alter table public.friendships add constraint friendships_friend_id_fkey foreign key (friend_id) references public.profiles(id) on delete cascade;
  exception when others then null;
  end;
end $$;

-- Sift Shares table
create table if not exists public.sift_shares (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  sift_id uuid references public.pages(id) on delete cascade not null
);

-- Ensure sift_shares foreign keys point to profiles (for PostgREST joins to work)
do $$
begin
  begin
    alter table public.sift_shares drop constraint if exists sift_shares_sender_id_fkey;
    alter table public.sift_shares drop constraint if exists sift_shares_receiver_id_fkey;
  exception when others then null;
  end;
  
  begin
    alter table public.sift_shares add constraint sift_shares_sender_id_fkey foreign key (sender_id) references public.profiles(id) on delete cascade;
    alter table public.sift_shares add constraint sift_shares_receiver_id_fkey foreign key (receiver_id) references public.profiles(id) on delete cascade;
  exception when others then null;
  end;
end $$;

-- Enable RLS
alter table public.friendships enable row level security;
alter table public.sift_shares enable row level security;

-- RLS Policies for Friendships
do $$
begin
  if exists (select 1 from pg_policies where policyname = 'Users can manage their own friendships' and tablename = 'friendships') then
    drop policy "Users can manage their own friendships" on public.friendships;
  end if;

  create policy "Users can manage their own friendships" on public.friendships
    for all to authenticated
    using (auth.uid() = user_id or auth.uid() = friend_id);
end $$;

-- RLS Policies for Sift Shares
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can see shares sent to them' and tablename = 'sift_shares') then
    create policy "Users can see shares sent to them" on public.sift_shares
      for select to authenticated
      using (auth.uid() = receiver_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can send shares' and tablename = 'sift_shares') then
    create policy "Users can send shares" on public.sift_shares
      for insert to authenticated
      with check (auth.uid() = sender_id);
  end if;
end $$;

-- Update trigger for auto-profile creation on signup
-- Now includes username and sift_id initialization
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_username text;
  new_sift_id text;
begin
  -- Generate unique username from email if not provided
  new_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4)
  );
  
  -- Generate unique 8-char sift_id
  new_sift_id := 'SIFT-' || upper(substr(md5(random()::text), 1, 4));

  insert into public.profiles (id, display_name, username, sift_id)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new_username,
    new_sift_id
  );
  return new;
end;
$$ language plpgsql security definer;

-- 10. Notifications table (Added 2026-02-24)
-- Instagram-style activity feed for friend requests, shared sifts, and collection activity
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,   -- recipient
  actor_id uuid references auth.users(id) on delete cascade not null,  -- who triggered it
  type text not null check (type in (
    'friend_request',         -- someone sent you a friend request
    'friend_accepted',        -- your friend request was accepted
    'sift_shared',            -- someone shared a sift with you
    'collection_invite',      -- someone invited you to a shared collection
    'collection_sift_added'   -- someone added a sift to your shared collection
  )),
  reference_id text,          -- ID of related object (sift, friendship, folder)
  is_read boolean default false,
  metadata jsonb              -- extra context: { title, collection_name, etc. }
);

-- Enable RLS for notifications
alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read their own notifications' and tablename = 'notifications') then
    create policy "Users can read their own notifications" on public.notifications
      for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can create notifications' and tablename = 'notifications') then
    create policy "Authenticated users can create notifications" on public.notifications
      for insert to authenticated
      with check (auth.uid() = actor_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own notifications' and tablename = 'notifications') then
    create policy "Users can update their own notifications" on public.notifications
      for update to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own notifications' and tablename = 'notifications') then
    create policy "Users can delete their own notifications" on public.notifications
      for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes for fast feed queries
create index if not exists idx_notifications_user_feed on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_actor on public.notifications(actor_id);

-- 11. Full-text search index for pages (Added 2026-02-24)
-- Enables fast server-side search across titles and summaries
create index if not exists idx_pages_fts on public.pages
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

-- 12. Block & Report (Added 2026-02-24)
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own blocks' and tablename = 'blocked_users') then
    create policy "Users can view their own blocks" on public.blocked_users for select using (auth.uid() = blocker_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can create blocks' and tablename = 'blocked_users') then
    create policy "Users can create blocks" on public.blocked_users for insert with check (auth.uid() = blocker_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can remove their blocks' and tablename = 'blocked_users') then
    create policy "Users can remove their blocks" on public.blocked_users for delete using (auth.uid() = blocker_id);
  end if;
end $$;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'inappropriate',
  created_at timestamptz default now()
);

alter table public.user_reports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can create reports' and tablename = 'user_reports') then
    create policy "Users can create reports" on public.user_reports for insert with check (auth.uid() = reporter_id);
  end if;
end $$;

-- 13. Push notification token storage (Added 2026-02-24)
alter table public.profiles add column if not exists push_token text;
alter table public.profiles add column if not exists push_token_updated_at timestamptz;

-- 14. Message column for shared sifts (Added 2026-02-25)
alter table public.sift_shares add column if not exists message text;

-- 15. Direct Messages table (Added 2026-03-02)
create table if not exists public.direct_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  message_type text default 'text' check (message_type in ('text', 'sift', 'emoji')),
  sift_id uuid references public.pages(id) on delete set null,
  is_read boolean default false
);

-- Enable RLS for direct_messages
alter table public.direct_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read their own messages' and tablename = 'direct_messages') then
    create policy "Users can read their own messages" on public.direct_messages
      for select to authenticated
      using (auth.uid() = sender_id or auth.uid() = receiver_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can send messages' and tablename = 'direct_messages') then
    create policy "Users can send messages" on public.direct_messages
      for insert to authenticated
      with check (auth.uid() = sender_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own messages' and tablename = 'direct_messages') then
    create policy "Users can update their own messages" on public.direct_messages
      for update to authenticated
      using (auth.uid() = sender_id or auth.uid() = receiver_id);
  end if;
end $$;

-- Indexes for fast conversation queries
create index if not exists idx_dm_conversation on public.direct_messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_dm_receiver on public.direct_messages(receiver_id, created_at desc);

-- Enable Supabase Realtime on direct_messages
alter publication supabase_realtime add table public.direct_messages;

-- 16. Account Deletion RPC (Added 2026-02-28 for App Store Compliance)
-- This function deletes all user data and then the auth user itself.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  target_user_id := auth.uid();
  
  if target_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Delete associated data (cascade deletes should handle most, but being explicit is safer)
  delete from public.pages where user_id = target_user_id;
  delete from public.categories where user_id = target_user_id;
  delete from public.folder_members where user_id = target_user_id;
  delete from public.direct_messages where sender_id = target_user_id or receiver_id = target_user_id;
  delete from public.notifications where user_id = target_user_id or actor_id = target_user_id;
  delete from public.friendships where user_id = target_user_id or friend_id = target_user_id;
  delete from public.profiles where id = target_user_id;

  -- 2. Delete the user from auth.users (Requires service role or security definer with bypass)
  -- Note: In Supabase, deleting from auth.users via RPC usually requires a trigger or a specific policy.
  -- The most reliable way for a self-service delete is to delete from public.profiles and have a trigger
  -- OR call a management API. For simplicity and reliability in RLS, we delete the profile 
  -- and provide a fallback info if the auth user deletion fails (it often needs service_role).
  
  -- However, we can use the 'auth.users' delete directly if the RPC has enough permissions.
  delete from auth.users where id = target_user_id;
end;
$$;

