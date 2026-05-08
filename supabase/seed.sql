-- GREQuest Seed Data

-- ─── Achievements ─────────────────────────────────────────────────────────────
insert into public.achievements (id, name, description, icon, xp_reward) values
  ('first_blood',   'First Strike',     'Answer your first question correctly',       '⚔️',  25),
  ('on_fire',       'On Fire',          'Achieve a 10-question answer streak',         '🔥', 100),
  ('unstoppable',   'Unstoppable',      'Achieve a 25-question answer streak',         '💥', 250),
  ('boss_slayer',   'Boss Slayer',      'Defeat your first boss',                      '🐉', 150),
  ('exterminator',  'Exterminator',     'Defeat all 5 topic bosses',                   '💀', 500),
  ('wordsmith',     'Wordsmith',        'Answer 50 vocabulary questions correctly',    '📚', 100),
  ('logician',      'The Logician',     'Answer 50 critical reasoning questions correctly', '🧠', 100),
  ('daily_grind',   'Daily Grind',      'Maintain a 7-day daily login streak',         '📅', 200),
  ('perfectionist', 'Perfectionist',    'Answer 10 questions in a row with 100% accuracy', '✨', 150),
  ('speed_demon',   'Speed Demon',      'Answer correctly in under 30 seconds, 5 times', '⚡', 100)
on conflict (id) do nothing;

-- ─── Daily Challenge (today's) ────────────────────────────────────────────────
insert into public.daily_challenges (date, topic_id, difficulty, bonus_xp)
values (current_date, 'vocab', 'hard', 100)
on conflict (date) do nothing;
