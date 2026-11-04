-- ==============================================================================
-- CONFESSION ROULETTE (SAFE & SOUND) SUPABASE SCHEMA
-- Speed Talk WebRTC Breakouts + Blind Audio Guessing + Immunity
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code varchar(8) not null unique,
  status text not null check (status in ('LOBBY', 'RECORDING', 'MINIGAME', 'BREAKOUT', 'GUESSING', 'PICKING', 'REVEAL')) default 'LOBBY',
  host_id text not null,
  winner1_id text,
  winner2_id text,
  active_audio_player_id text,
  minigame_target_time bigint,
  current_breakout_round integer default 0,
  current_breakout_end_time bigint,
  breakout_schedule jsonb,
  anonymous_audio_queue jsonb,
  current_guess_index integer default 0,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- Ensure is_public and Speed Talk columns exist on existing deployments
alter table public.rooms add column if not exists is_public boolean default true;
alter table public.rooms add column if not exists current_breakout_round integer default 0;
alter table public.rooms add column if not exists current_breakout_end_time bigint;
alter table public.rooms add column if not exists breakout_schedule jsonb;
alter table public.rooms add column if not exists anonymous_audio_queue jsonb;
alter table public.rooms add column if not exists current_guess_index integer default 0;

-- Refresh status constraint on existing deployments to include BREAKOUT & GUESSING
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check check (status in ('LOBBY', 'RECORDING', 'MINIGAME', 'BREAKOUT', 'GUESSING', 'PICKING', 'REVEAL'));

-- 3. Create Players Table
create table if not exists public.players (
  id text primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  audio_url text,
  has_recorded boolean default false,
  score integer default 0,
  reaction_time_ms integer,
  recognition_score integer default 0,
  correct_guesses_count integer default 0,
  is_safe boolean default false,
  created_at timestamptz default now()
);

-- 4. Create Guesses Table
create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  guesser_id text not null,
  target_player_id text not null,
  guessed_player_id text not null,
  voice_label text not null,
  created_at timestamptz default now()
);

-- 5. Enable Replica Identity for Complete Realtime Updates
alter table public.rooms replica identity full;
alter table public.players replica identity full;
alter table public.guesses replica identity full;

-- 6. Create Indexes for fast lookup
create index if not exists idx_rooms_code on public.rooms(room_code);
create index if not exists idx_players_room on public.players(room_id);
create index if not exists idx_guesses_room on public.guesses(room_id);

-- 7. Grant Permissions to anon & authenticated roles
grant usage on schema public to anon, authenticated;
grant all on table public.rooms to anon, authenticated;
grant all on table public.players to anon, authenticated;
grant all on table public.guesses to anon, authenticated;

-- 8. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.guesses enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow all public read on rooms" on public.rooms;
drop policy if exists "Allow public insert on rooms" on public.rooms;
drop policy if exists "Allow public update on rooms" on public.rooms;

drop policy if exists "Allow all public read on players" on public.players;
drop policy if exists "Allow public insert on players" on public.players;
drop policy if exists "Allow public update on players" on public.players;
drop policy if exists "Allow public delete on players" on public.players;

drop policy if exists "Allow all public read on guesses" on public.guesses;
drop policy if exists "Allow public insert on guesses" on public.guesses;
drop policy if exists "Allow public update on guesses" on public.guesses;
drop policy if exists "Allow public delete on guesses" on public.guesses;

-- Open policies for seamless party game room sync
create policy "Allow all public read on rooms" on public.rooms for select using (true);
create policy "Allow public insert on rooms" on public.rooms for insert with check (true);
create policy "Allow public update on rooms" on public.rooms for update using (true);

create policy "Allow all public read on players" on public.players for select using (true);
create policy "Allow public insert on players" on public.players for insert with check (true);
create policy "Allow public update on players" on public.players for update using (true);
create policy "Allow public delete on players" on public.players for delete using (true);

create policy "Allow all public read on guesses" on public.guesses for select using (true);
create policy "Allow public insert on guesses" on public.guesses for insert with check (true);
create policy "Allow public update on guesses" on public.guesses for update using (true);
create policy "Allow public delete on guesses" on public.guesses for delete using (true);

-- 9. Add Tables to Realtime Publication Safely
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players') then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guesses') then
    alter publication supabase_realtime add table public.guesses;
  end if;
exception when others then
  null;
end $$;

-- 10. Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('confessions', 'confessions', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access to Confession Audios" on storage.objects;
drop policy if exists "Public Upload of Confession Audios" on storage.objects;
drop policy if exists "Public Update of Confession Audios" on storage.objects;

create policy "Public Access to Confession Audios" on storage.objects for select using (bucket_id = 'confessions');
create policy "Public Upload of Confession Audios" on storage.objects for insert with check (bucket_id = 'confessions');
create policy "Public Update of Confession Audios" on storage.objects for update using (bucket_id = 'confessions');
