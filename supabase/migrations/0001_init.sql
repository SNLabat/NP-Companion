-- NoPixel Social: synced follows/bookmarks + streamer links
-- Run in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.user_follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  author_id  text not null,
  -- display snapshot so the Following list renders without extra lookups
  username     text,
  display_name text,
  avatar_url   text,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create table if not exists public.user_bookmarks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  post_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists user_bookmarks_recent on public.user_bookmarks (user_id, created_at desc);

alter table public.user_follows   enable row level security;
alter table public.user_bookmarks enable row level security;

create policy "own follows: read"   on public.user_follows   for select using ((select auth.uid()) = user_id);
create policy "own follows: add"    on public.user_follows   for insert with check ((select auth.uid()) = user_id);
create policy "own follows: remove" on public.user_follows   for delete using ((select auth.uid()) = user_id);

create policy "own bookmarks: read"   on public.user_bookmarks for select using ((select auth.uid()) = user_id);
create policy "own bookmarks: add"    on public.user_bookmarks for insert with check ((select auth.uid()) = user_id);
create policy "own bookmarks: remove" on public.user_bookmarks for delete using ((select auth.uid()) = user_id);

-- Character handle -> Twitch login. Public read; edit from the dashboard
-- (service role) so links can change without a redeploy.
create table if not exists public.streamer_links (
  username     text primary key,          -- Twatter handle, stored lowercase
  twitch_login text not null,             -- lowercase Twitch login
  note         text,
  created_at   timestamptz not null default now()
);

alter table public.streamer_links enable row level security;
create policy "streamer links: public read" on public.streamer_links for select using (true);
