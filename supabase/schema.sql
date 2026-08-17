-- ===================================================================
-- ASCEND SYSTEM — database schema
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run: everything is written with "if not exists" / "drop if exists".
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. PROFILES — who the player is, and their *effort* progression.
--    Effort XP and streaks live here. Note they are deliberately
--    SEPARATE from the stats table: effort gets you in the door daily,
--    stats are the honest proof of change.
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  hunter_name     text,
  mentor_id       text,                              -- 'milo' | 'aurelius' | 'epictetus' | 'musashi' | 'curie' | 'davinci'
  rank            text    not null default 'E',
  effort_xp       integer not null default 0,
  streak          integer not null default 0,
  best_streak     integer not null default 0,
  last_quest_date date,
  awakened        boolean not null default false,     -- has the baseline test been taken?
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- 2. STATS — the honest numbers. These ONLY change when a Trial is
--    recorded. Nothing in the app writes here on a normal day.
-- -------------------------------------------------------------------
create table if not exists public.stats (
  user_id    uuid primary key references auth.users on delete cascade,
  strength   integer not null default 0,
  core       integer not null default 0,
  stamina    integer not null default 0,
  willpower  integer not null default 0,
  power      integer not null default 0,   -- weighted overall, drives rank
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- 3. TRIALS — every measured performance test, forever. The first one
--    (is_baseline = true) is the Awakening. This table is the audit
--    trail that makes "you actually got stronger" provable.
-- -------------------------------------------------------------------
create table if not exists public.trials (
  id             bigserial primary key,
  user_id        uuid not null references auth.users on delete cascade,
  taken_at       timestamptz not null default now(),
  is_baseline    boolean not null default false,
  -- raw measurements
  pushups        integer not null default 0,
  squats         integer not null default 0,
  plank_seconds  integer not null default 0,
  cardio_seconds integer not null default 0,
  -- computed snapshot at the time of the trial
  strength       integer not null default 0,
  core           integer not null default 0,
  stamina        integer not null default 0,
  willpower      integer not null default 0,
  power          integer not null default 0,
  rank           text    not null default 'E'
);

create index if not exists trials_user_taken_idx on public.trials (user_id, taken_at desc);

-- -------------------------------------------------------------------
-- 4. QUEST LOG — one row per completed day. The unique constraint is
--    what stops someone farming effort XP by tapping "done" 20 times.
-- -------------------------------------------------------------------
create table if not exists public.quest_log (
  id            bigserial primary key,
  user_id       uuid not null references auth.users on delete cascade,
  quest_date    date not null,
  kind          text not null default 'training',   -- 'training' | 'recovery'
  pushups       integer not null default 0,
  squats        integer not null default 0,
  plank_seconds integer not null default 0,
  walk_minutes  integer not null default 0,
  effort_xp     integer not null default 0,
  completed_at  timestamptz not null default now(),
  unique (user_id, quest_date)
);

create index if not exists quest_log_user_date_idx on public.quest_log (user_id, quest_date desc);

-- -------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY — the real security boundary.
--    Because of these policies it is safe to talk to Supabase straight
--    from the browser: a logged-in user can only ever touch their own rows.
-- -------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.stats     enable row level security;
alter table public.trials    enable row level security;
alter table public.quest_log enable row level security;

-- profiles
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- stats
drop policy if exists "own stats read"   on public.stats;
drop policy if exists "own stats insert" on public.stats;
drop policy if exists "own stats update" on public.stats;
create policy "own stats read"   on public.stats for select using (auth.uid() = user_id);
create policy "own stats insert" on public.stats for insert with check (auth.uid() = user_id);
create policy "own stats update" on public.stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- trials (insert + read only: history must not be editable, that's the point)
drop policy if exists "own trials read"   on public.trials;
drop policy if exists "own trials insert" on public.trials;
create policy "own trials read"   on public.trials for select using (auth.uid() = user_id);
create policy "own trials insert" on public.trials for insert with check (auth.uid() = user_id);

-- quest log
drop policy if exists "own quests read"   on public.quest_log;
drop policy if exists "own quests insert" on public.quest_log;
create policy "own quests read"   on public.quest_log for select using (auth.uid() = user_id);
create policy "own quests insert" on public.quest_log for insert with check (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- 6. NEW USER TRIGGER — create the profile + stats rows on signup so
--    the app never lands on a missing row. (The app also self-heals if
--    this trigger is ever missing, but this is the clean path.)
-- -------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
