-- ============================================================
-- Ubett: initial schema
-- ============================================================

-- profiles ---------------------------------------------------
create table public.profiles (
  id         uuid        primary key references auth.users on delete cascade,
  email      text        not null,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- locations --------------------------------------------------
create table public.locations (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  name          text        not null,
  latitude      float8      not null,
  longitude     float8      not null,
  radius_meters int         not null default 100,
  wifi_ssid     text,
  created_at    timestamptz not null default now()
);

alter table public.locations enable row level security;

create policy "Users can read own locations"
  on public.locations for select
  using (auth.uid() = user_id);

create policy "Users can insert own locations"
  on public.locations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own locations"
  on public.locations for update
  using (auth.uid() = user_id);

create policy "Users can delete own locations"
  on public.locations for delete
  using (auth.uid() = user_id);

-- checklist_items --------------------------------------------
create table public.checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  location_id uuid        not null references public.locations(id) on delete cascade,
  label       text        not null,
  emoji       text        not null,
  sort_order  int         not null default 0,
  time_rule   jsonb,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.checklist_items enable row level security;

create policy "Users can read own checklist items"
  on public.checklist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own checklist items"
  on public.checklist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own checklist items"
  on public.checklist_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own checklist items"
  on public.checklist_items for delete
  using (auth.uid() = user_id);

-- check_events -----------------------------------------------
create table public.check_events (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  location_id   uuid        not null references public.locations(id) on delete cascade,
  items_checked jsonb       not null default '[]'::jsonb,
  items_total   int         not null,
  all_checked   boolean     not null default false,
  checked_at    timestamptz not null default now()
);

alter table public.check_events enable row level security;

create policy "Users can read own check events"
  on public.check_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own check events"
  on public.check_events for insert
  with check (auth.uid() = user_id);

-- streaks ----------------------------------------------------
create table public.streaks (
  id              uuid    primary key default gen_random_uuid(),
  user_id         uuid    not null unique references public.profiles(id) on delete cascade,
  current_streak  int     not null default 0,
  longest_streak  int     not null default 0,
  last_check_date date,
  updated_at      timestamptz not null default now()
);

alter table public.streaks enable row level security;

create policy "Users can read own streak"
  on public.streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own streak"
  on public.streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streak"
  on public.streaks for update
  using (auth.uid() = user_id);
