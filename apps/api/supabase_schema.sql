create table public.pages (
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

-- Update policy: Only owner can see their own sifts
create policy "Users can see their own sifts"
  on public.pages for select
  using (auth.uid() = user_id);

-- Create waitlist table
create table public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  status text default 'pending', -- 'pending', 'approved'
  created_at timestamp with time zone default now()
);

-- RLS for waitlist
alter table public.waitlist enable row level security;
create policy "Anyone can join waitlist" on public.waitlist for insert with check (true);
create policy "Users can view their own waitlist status" on public.waitlist for select using (true); 


-- Note: The Backend uses the SERVICE_ROLE_KEY, which bypasses RLS automatically.
-- So no explicit insert policy is needed for the backend.
