-- SIFT Storage Bucket Setup
-- Run this in the Supabase SQL Editor to enable avatar uploads.

-- 1. Create the 'avatars' bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Enable RLS (although policies are on storage.objects)
-- storage.buckets is typically public/system managed, but we set policies on objects.

-- 3. Policy: Authenticated users can upload avatar files.
create policy "Avatar uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );

-- 4. Policy: Anyone can view avatars (since they are public profiles)
create policy "Avatar public read"
  on storage.objects for select
  to public
  using ( bucket_id = 'avatars' );

-- 5. Policy: Users can update their own avatars
create policy "Avatar update own"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'avatars' and owner = auth.uid() );

-- 6. Policy: Users can delete their own avatars
create policy "Avatar delete own"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'avatars' and owner = auth.uid() );
