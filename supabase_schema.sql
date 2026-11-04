-- ==============================================================================
-- CONFESSION ROULETTE (SAFE & SOUND) SUPABASE SCHEMA
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code varchar(8) not null unique,
  status text not null check (status in ('LOBBY', 'RECORDING', 'MINIGAME', 'PICKING', 'REVEAL')) default 'LOBBY',
  host_id text not null,
  winner1_id text,
  winner2_id text,
  active_audio_player_id text,
  minigame_target_time bigint,
  created_at timestamptz default now()
);

-- 3. Create Players Table
create table if not exists public.players (
  id text primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  audio_url text,
  has_recorded boolean default false,
  score integer default 0,
  reaction_time_ms integer,
  is_safe boolean default false,
  created_at timestamptz default now()
);

-- 4. Create Indexes
create index if not exists idx_rooms_code on public.rooms(room_code);
create index if not exists idx_players_room on public.players(room_id);

-- 5. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.players enable row level security;

-- Free/Party Game Open RLS Policies (allows players to join and synchronize without strict OAuth auth requirement)
create policy "Allow all public read on rooms" 
  on public.rooms for select 
  using (true);

create policy "Allow public insert on rooms" 
  on public.rooms for insert 
  with check (true);

create policy "Allow public update on rooms" 
  on public.rooms for update 
  using (true);

create policy "Allow all public read on players" 
  on public.players for select 
  using (true);

create policy "Allow public insert on players" 
  on public.players for insert 
  with check (true);

create policy "Allow public update on players" 
  on public.players for update 
  using (true);

create policy "Allow public delete on players" 
  on public.players for delete 
  using (true);

-- 6. Enable Realtime Publications
-- Add rooms and players tables to supabase_realtime publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;

-- 7. Storage Bucket Setup
-- Insert bucket for confessions if not exists
insert into storage.buckets (id, name, public)
values ('confessions', 'confessions', true)
on conflict (id) do update set public = true;

-- Storage policies for audio uploads
create policy "Public Access to Confession Audios" 
  on storage.objects for select 
  using (bucket_id = 'confessions');

create policy "Public Upload of Confession Audios" 
  on storage.objects for insert 
  with check (bucket_id = 'confessions');

create policy "Public Update of Confession Audios" 
  on storage.objects for update 
  using (bucket_id = 'confessions');
