-- GREQuest Database Schema
-- Run this in the Supabase SQL editor

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  username     text unique not null,
  avatar_url   text,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ─── Game State ───────────────────────────────────────────────────────────────
create table public.game_state (
  user_id         uuid references auth.users on delete cascade primary key,
  xp              integer default 0,
  level           integer default 1,
  streak          integer default 0,
  best_streak     integer default 0,
  daily_streak    integer default 0,
  last_played_at  timestamptz,
  bosses_defeated integer default 0,
  total_answered  integer default 0,
  total_correct   integer default 0,
  updated_at      timestamptz default now()
);

alter table public.game_state enable row level security;

create policy "Users can view own game state"
  on public.game_state for select using (auth.uid() = user_id);

create policy "Users can insert own game state"
  on public.game_state for insert with check (auth.uid() = user_id);

create policy "Users can update own game state"
  on public.game_state for update using (auth.uid() = user_id);

-- ─── Topic Progress ───────────────────────────────────────────────────────────
create table public.topic_progress (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  topic_id      text not null,   -- 'vocab' | 'text_completion' | 'critical_reasoning' | 'sentence_equivalence' | 'reading_comprehension'
  correct       integer default 0,
  answered      integer default 0,
  boss_defeated boolean default false,
  last_seen_at  timestamptz,
  unique(user_id, topic_id)
);

alter table public.topic_progress enable row level security;

create policy "Users can manage own topic progress"
  on public.topic_progress for all using (auth.uid() = user_id);

-- ─── Question History ─────────────────────────────────────────────────────────
create table public.question_history (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  topic_id      text not null,
  difficulty    text not null,    -- 'medium' | 'hard' | 'expert' | 'boss'
  question_hash text not null,    -- SHA256 of question text (dedup)
  is_correct    boolean not null,
  time_taken_ms integer,
  answered_at   timestamptz default now()
);

create index on public.question_history(user_id, topic_id);
create index on public.question_history(user_id, answered_at desc);

alter table public.question_history enable row level security;

create policy "Users can manage own question history"
  on public.question_history for all using (auth.uid() = user_id);

-- ─── Leaderboard (materialized view) ─────────────────────────────────────────
create materialized view public.leaderboard as
select
  p.id,
  p.username,
  p.avatar_url,
  g.xp,
  g.level,
  g.bosses_defeated,
  g.best_streak,
  rank() over (order by g.xp desc) as rank
from public.profiles p
join public.game_state g on g.user_id = p.id
order by g.xp desc
limit 100;

create unique index on public.leaderboard(id);

-- ─── Leaderboard Refresh ──────────────────────────────────────────────────────
create or replace function refresh_leaderboard()
returns trigger as $$
begin
  refresh materialized view concurrently public.leaderboard;
  return new;
end;
$$ language plpgsql security definer;

create trigger refresh_leaderboard_on_game_state_update
  after insert or update on public.game_state
  for each statement
  execute procedure refresh_leaderboard();

-- ─── Daily Challenges ─────────────────────────────────────────────────────────
create table public.daily_challenges (
  id           uuid default gen_random_uuid() primary key,
  date         date unique not null,
  topic_id     text not null,
  difficulty   text not null,
  bonus_xp     integer default 100
);

create table public.daily_challenge_completions (
  user_id      uuid references auth.users on delete cascade,
  challenge_id uuid references public.daily_challenges on delete cascade,
  completed_at timestamptz default now(),
  primary key (user_id, challenge_id)
);

alter table public.daily_challenges enable row level security;
alter table public.daily_challenge_completions enable row level security;

create policy "Daily challenges are viewable by everyone"
  on public.daily_challenges for select using (true);

create policy "Users can manage own daily completions"
  on public.daily_challenge_completions for all using (auth.uid() = user_id);

-- ─── Achievements ─────────────────────────────────────────────────────────────
create table public.achievements (
  id          text primary key,
  name        text not null,
  description text not null,
  icon        text not null,
  xp_reward   integer default 0
);

create table public.user_achievements (
  user_id        uuid references auth.users on delete cascade,
  achievement_id text references public.achievements,
  earned_at      timestamptz default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Achievements are viewable by everyone"
  on public.achievements for select using (true);

create policy "Users can view own achievements"
  on public.user_achievements for select using (auth.uid() = user_id);

create policy "Service role can insert user achievements"
  on public.user_achievements for insert with check (true);

-- ─── Auto-create profile + game_state on signup ───────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := split_part(new.email, '@', 1);
  final_username := base_username;

  loop
    begin
      insert into public.profiles (id, username, avatar_url)
      values (new.id, final_username, new.raw_user_meta_data->>'avatar_url');
      exit;
    exception when unique_violation then
      counter := counter + 1;
      final_username := base_username || counter::text;
    end;
  end loop;

  insert into public.game_state (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_game_state_updated_at
  before update on public.game_state
  for each row execute procedure set_updated_at();
