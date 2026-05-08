# GREQuest — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Stack:** Next.js · FastAPI · AG-UI Protocol · Supabase  
**Scope:** GRE + GMAT Verbal Prep · Gamified · AI-Powered

---

## 1. Executive Summary

GREQuest is an AI-powered, gamified GRE and GMAT verbal preparation platform. It uses the **AG-UI protocol** to stream real-time agent interactions — question generation, adaptive hints, streaking feedback, and boss-battle narration — directly to the frontend. **Supabase** serves as the backend for auth, persistent game state, leaderboards, and question analytics. Every question is unique, AI-generated on demand, and calibrated to each student's current performance level.

---

## 2. Problem Statement

Existing GRE/GMAT prep tools (Manhattan, Magoosh, Kaplan) suffer from:

- **Fixed question banks** — students memorize answers, not concepts
- **Zero gamification** — no motivation loop beyond mock scores
- **No real-time adaptation** — difficulty doesn't adjust within a session
- **Passive learning** — no dialogue with the material

GREQuest solves all four by pairing an AI agent (streamed via AG-UI) with a game loop that keeps students engaged and learning.

---

## 3. Goals & Success Metrics

| Goal | Metric | Target (6 months) |
|---|---|---|
| User engagement | Daily Active Users | 5,000 |
| Learning efficacy | Avg score improvement | +15% after 30 days |
| Retention | D7 retention | > 40% |
| Session quality | Avg session length | > 18 min |
| Virality | Leaderboard-driven signups | 20% of new users |

---

## 4. User Personas

**Persona A — The Serious Applicant**
Prepping 6–12 months out. Studies 1–2 hours/day. Wants adaptive difficulty, detailed explanations, and score tracking.

**Persona B — The Casual Practitioner**
Prepping casually, 3–4 months out. 20–30 min/day. Needs motivation, streaks, and short satisfying sessions.

**Persona C — The Competitive Scorer**
Wants to rank on leaderboards, defeat bosses, collect titles. Treats prep as a game.

---

## 5. AG-UI Protocol Integration

### 5.1 Why AG-UI

AG-UI decouples the AI agent backend from the React frontend via a standardized SSE event stream. This means:

- The frontend reacts to typed events, not raw text blobs
- Agent "thinking" (difficulty calibration, question generation) is visible in real time
- Human-in-the-loop moments (hint requests, boss battle narration) pause and resume cleanly
- The agent backend can be swapped (LangChain → custom → LangGraph) without touching the UI

### 5.2 AG-UI Event Flow — Normal Practice Session

```
Client                          FastAPI Agent
  │                                  │
  │── POST /session/start ──────────▶│
  │                                  │── calibrate difficulty (internal)
  │◀─ RUN_STARTED ───────────────────│
  │◀─ STATE_SNAPSHOT (game_state) ───│
  │◀─ AGENT_ACTION {type:"thinking"} │
  │◀─ TEXT_MESSAGE_START ────────────│
  │◀─ TEXT_MESSAGE_CONTENT (stream)─▶│  ← question text streams in
  │◀─ TEXT_MESSAGE_END ──────────────│
  │◀─ STATE_DELTA {question_ready} ──│
  │                                  │
  │── POST /session/answer ─────────▶│
  │                                  │── evaluate answer
  │◀─ TEXT_MESSAGE_START ────────────│
  │◀─ TEXT_MESSAGE_CONTENT (stream)─▶│  ← explanation streams in
  │◀─ TEXT_MESSAGE_END ──────────────│
  │◀─ STATE_DELTA {xp, streak, ...} ─│
  │◀─ RUN_FINISHED ──────────────────│
```

### 5.3 AG-UI Event Flow — Boss Battle (HITL)

```
Client                          FastAPI Agent
  │── POST /boss/start ──────────────▶│
  │◀─ RUN_STARTED ────────────────────│
  │◀─ TEXT_MESSAGE_* (boss intro) ────│  ← boss narration streams
  │◀─ STATE_SNAPSHOT (boss_state) ────│
  │◀─ INTERRUPT {reason: "answer"} ───│  ← game pauses, waits for answer
  │                                    │
  │── POST /boss/answer ──────────────▶│  ← human submits
  │◀─ TEXT_MESSAGE_* (result) ─────────│
  │◀─ STATE_DELTA {bossHP, playerHP} ──│
  │     (repeat 5–7 times)             │
  │◀─ RUN_FINISHED {victory/defeat} ───│
```

### 5.4 Custom AG-UI Events

In addition to the standard AG-UI events, GREQuest defines:

| Event | Payload | Description |
|---|---|---|
| `AGENT_ACTION` | `{type, label}` | Shows agent "thinking" — calibrating, generating, scoring |
| `INTERRUPT` | `{runId, reason, draft}` | Pauses stream for human input (boss battle, hint request) |
| `LEVEL_UP` | `{level, title, xp}` | Player leveled up mid-session |
| `BOSS_DEFEATED` | `{bossId, reward_xp}` | Boss beaten, triggers celebration |
| `STREAK_MILESTONE` | `{streak, bonus_xp}` | Streak hit 5/10/20 threshold |
| `DIFFICULTY_SHIFT` | `{from, to, reason}` | Agent adjusted difficulty in real time |

### 5.5 Transport

All AG-UI streams use **Server-Sent Events (SSE)** over HTTPS. The session token is passed as a bearer token in the `Authorization` header of the initial POST. The SSE stream itself is a `GET` request with `Accept: text/event-stream`.

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js 14)                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  AG-UI     │  │  Game UI     │  │  Supabase Client     │ │
│  │  SSE Hook  │  │  Components  │  │  (realtime, auth)    │ │
│  └─────┬──────┘  └──────┬───────┘  └─────────┬────────────┘ │
└────────┼───────────────┼──────────────────────┼─────────────┘
         │ SSE stream    │ state updates         │ realtime subs
         ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI + Python)                   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              AG-UI Agent Layer                         │   │
│  │  /session/start  /session/answer  /boss/*  /hint      │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────────────┐   │
│  │          Question Engine (Claude claude-sonnet-4-6)    │   │
│  │  - Difficulty calibration                              │   │
│  │  - Unique question generation                          │   │
│  │  - Answer evaluation + explanation                     │   │
│  │  - Boss battle narration                               │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      SUPABASE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Auth         │  │  Postgres DB │  │  Realtime           │ │
│  │  (email/OAuth)│  │  (game data) │  │  (leaderboard live) │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Frontend — Next.js 14

- App Router with React Server Components for static pages
- Client components for all game UI (SSE requires client-side)
- Custom `useAGUIStream` hook handles SSE parsing, reconnection, and event dispatch
- Zustand for client game state (hydrated from Supabase on load)
- Framer Motion for XP animations, level-ups, boss battles

### 6.2 Backend — FastAPI

- Python 3.12 + FastAPI with `asyncio` for concurrent SSE streams
- Each session run is an async generator that yields SSE events
- Anthropic Python SDK with streaming for question generation
- Redis for in-flight session state (boss battle HITL pause/resume)
- Deployed on Railway or Fly.io

### 6.3 Supabase

- **Auth:** Email/password + Google OAuth. JWT passed to FastAPI for verification.
- **Database:** Postgres for all persistent game state (see Section 7)
- **Realtime:** Leaderboard subscriptions — live XP updates broadcast to all connected clients
- **Row Level Security:** All data access scoped to `auth.uid()`

---

## 7. Database Schema (Supabase / Postgres)

### 7.1 users (extends auth.users)

```sql
create table public.profiles (
  id           uuid references auth.users primary key,
  username     text unique not null,
  avatar_url   text,
  created_at   timestamptz default now()
);
```

### 7.2 game_state

```sql
create table public.game_state (
  user_id        uuid references auth.users primary key,
  xp             integer default 0,
  level          integer default 1,
  streak         integer default 0,
  best_streak    integer default 0,
  daily_streak   integer default 0,
  last_played_at timestamptz,
  bosses_defeated integer default 0,
  total_answered  integer default 0,
  total_correct   integer default 0,
  updated_at     timestamptz default now()
);
```

### 7.3 topic_progress

```sql
create table public.topic_progress (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users not null,
  topic_id    text not null,            -- 'vocab' | 'text' | 'critical' | etc.
  correct     integer default 0,
  answered    integer default 0,
  boss_defeated boolean default false,
  last_seen_at timestamptz,
  unique(user_id, topic_id)
);
```

### 7.4 question_history

```sql
create table public.question_history (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,
  topic_id      text not null,
  difficulty    text not null,           -- 'easy' | 'medium' | 'hard' | 'boss'
  question_hash text not null,           -- SHA256 of question text (dedup)
  is_correct    boolean not null,
  time_taken_ms integer,
  answered_at   timestamptz default now()
);

create index on public.question_history(user_id, topic_id);
create index on public.question_history(user_id, answered_at desc);
```

### 7.5 leaderboard (materialized view)

```sql
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

-- Refresh after each game_state update via trigger
create function refresh_leaderboard() returns trigger as $$
begin perform pg_notify('refresh_leaderboard', ''); return new; end;
$$ language plpgsql;
```

### 7.6 daily_challenges

```sql
create table public.daily_challenges (
  id           uuid default gen_random_uuid() primary key,
  date         date unique not null,
  topic_id     text not null,
  difficulty   text not null,
  bonus_xp     integer default 100
);

create table public.daily_challenge_completions (
  user_id      uuid references auth.users,
  challenge_id uuid references public.daily_challenges,
  completed_at timestamptz default now(),
  primary key (user_id, challenge_id)
);
```

### 7.7 achievements

```sql
create table public.achievements (
  id          text primary key,           -- 'first_blood', 'boss_slayer', etc.
  name        text not null,
  description text not null,
  icon        text not null,
  xp_reward   integer default 0
);

create table public.user_achievements (
  user_id        uuid references auth.users,
  achievement_id text references public.achievements,
  earned_at      timestamptz default now(),
  primary key (user_id, achievement_id)
);
```

---

## 8. Feature Requirements

### 8.1 Authentication

| ID | Requirement | Priority |
|---|---|---|
| AUTH-1 | Email/password signup and login | P0 |
| AUTH-2 | Google OAuth | P1 |
| AUTH-3 | Username selection on first login | P0 |
| AUTH-4 | JWT passed to FastAPI for session validation | P0 |
| AUTH-5 | Persistent login (refresh token via Supabase) | P0 |

### 8.2 Question Generation (AG-UI Streamed)

| ID | Requirement | Priority |
|---|---|---|
| QG-1 | AI generates unique questions per session — no repeats within 30 days | P0 |
| QG-2 | 5 topic types: Vocabulary, Text Completion, Critical Reasoning, Sentence Equivalence, Reading Comprehension | P0 |
| QG-3 | 3 difficulty levels: Medium (550–650), Hard (650–700), Expert (700+) | P0 |
| QG-4 | Question text streams token-by-token via AG-UI `TEXT_MESSAGE_CONTENT` events | P0 |
| QG-5 | Explanation streams after answer submission | P0 |
| QG-6 | Agent emits `DIFFICULTY_SHIFT` event when adapting based on performance | P1 |
| QG-7 | Question hash stored in `question_history` to prevent repeats | P1 |
| QG-8 | Sentence Equivalence supports 6 options with 2 correct answers | P0 |

### 8.3 Adaptive Difficulty

| ID | Requirement | Priority |
|---|---|---|
| AD-1 | Agent calibrates difficulty based on last 10 question accuracy per topic | P1 |
| AD-2 | Difficulty increases after 3 consecutive correct answers | P1 |
| AD-3 | Difficulty decreases after 3 consecutive wrong answers | P1 |
| AD-4 | Calibration decision emitted as `AGENT_ACTION {type: "calibrating"}` | P1 |
| AD-5 | User can override difficulty manually | P2 |

### 8.4 Gamification

| ID | Requirement | Priority |
|---|---|---|
| GAME-1 | XP awarded per correct answer: Medium +50, Hard +70, Expert +100 | P0 |
| GAME-2 | Streak bonus: +10 XP per streak tier (max 5 tiers = +50 bonus) | P0 |
| GAME-3 | 10 player levels with titles (Initiate → Lexicon Lord) | P0 |
| GAME-4 | Level-up triggers `LEVEL_UP` AG-UI event + celebration UI | P0 |
| GAME-5 | Daily streak: consecutive days played, shown on profile | P1 |
| GAME-6 | Daily challenge: one bonus topic/day with 2× XP | P1 |
| GAME-7 | XP multiplier on daily challenge completion: ×2 | P1 |

### 8.5 Boss Battles (HITL via AG-UI INTERRUPT)

| ID | Requirement | Priority |
|---|---|---|
| BOSS-1 | Boss unlocks after 5 correct answers in a topic | P0 |
| BOSS-2 | Boss battle is a HITL session: agent narrates, pauses for answers, resumes | P0 |
| BOSS-3 | Boss has 5 HP (correct answers reduce it); player has 3 HP (wrong answers reduce it) | P0 |
| BOSS-4 | Boss defeated → `BOSS_DEFEATED` AG-UI event + 200 XP + `boss_defeated` flag in DB | P0 |
| BOSS-5 | Boss intro narrative streams via `TEXT_MESSAGE_*` before first question | P1 |
| BOSS-6 | Each boss has a unique name and personality per topic | P2 |
| BOSS-7 | Boss rematch available any time after defeat | P0 |
| BOSS-8 | Boss battle questions are Expert difficulty only | P0 |

### 8.6 Leaderboard

| ID | Requirement | Priority |
|---|---|---|
| LB-1 | Global leaderboard ranked by total XP | P0 |
| LB-2 | Friends leaderboard (follow system) | P2 |
| LB-3 | Weekly leaderboard (XP earned this week) | P1 |
| LB-4 | Leaderboard updates in real time via Supabase Realtime | P1 |
| LB-5 | Player's own rank always shown (even if outside top 100) | P0 |

### 8.7 Spaced Repetition

| ID | Requirement | Priority |
|---|---|---|
| SR-1 | Track per-topic accuracy in `topic_progress` | P1 |
| SR-2 | Agent weights question generation toward weak topics | P1 |
| SR-3 | "Review Mode" surfaces topics with < 60% accuracy in last 10 | P2 |

### 8.8 Hints (AG-UI HITL)

| ID | Requirement | Priority |
|---|---|---|
| HINT-1 | Player can request a hint mid-question | P1 |
| HINT-2 | Hint request triggers `INTERRUPT` → agent streams hint → `RUN_FINISHED` | P1 |
| HINT-3 | Using a hint caps XP for that question at 50% | P1 |
| HINT-4 | Max 1 hint per question | P1 |

### 8.9 Analytics Dashboard (Player)

| ID | Requirement | Priority |
|---|---|---|
| AN-1 | Accuracy by topic (bar chart) | P1 |
| AN-2 | XP over time (line chart) | P1 |
| AN-3 | Questions answered per day (heatmap, GitHub-style) | P2 |
| AN-4 | Predicted GRE/GMAT score range based on performance | P2 |

---

## 9. API Design

### 9.1 Session Endpoints (AG-UI Streams)

```
POST   /api/session/start
       Body:  { topic_id, mode: "practice"|"boss" }
       Auth:  Bearer JWT
       Returns: SSE stream of AG-UI events

POST   /api/session/answer
       Body:  { session_id, answer: "B" }
       Auth:  Bearer JWT
       Returns: SSE stream of AG-UI events (evaluation + explanation)

POST   /api/session/hint
       Body:  { session_id }
       Auth:  Bearer JWT
       Returns: SSE stream of AG-UI events (hint)

POST   /api/boss/resume
       Body:  { run_id, answer: "C" }
       Auth:  Bearer JWT
       Returns: 200 OK (unblocks waiting SSE stream)
```

### 9.2 Game State Endpoints (REST)

```
GET    /api/me/state            → full game state from Supabase
GET    /api/me/progress         → topic_progress rows
GET    /api/leaderboard         → top 100 + player's rank
GET    /api/daily-challenge     → today's challenge
POST   /api/achievements/check  → evaluate + award new achievements
```

### 9.3 AG-UI Event Reference

```jsonc
// RUN_STARTED
{ "runId": "uuid", "topic": "vocab", "mode": "practice" }

// AGENT_ACTION
{ "type": "calibrating" | "generating" | "evaluating", "label": "Calibrating difficulty…" }

// TEXT_MESSAGE_START
{ "messageId": "uuid", "role": "assistant", "phase": "question" | "explanation" | "narration" | "hint" }

// TEXT_MESSAGE_CONTENT
{ "messageId": "uuid", "delta": "The word pellucid…" }

// TEXT_MESSAGE_END
{ "messageId": "uuid" }

// INTERRUPT
{ "runId": "uuid", "reason": "awaiting_answer" | "awaiting_hint_confirm" }

// STATE_DELTA  (JSON Patch RFC 6902)
[
  { "op": "replace", "path": "/xp", "value": 1250 },
  { "op": "replace", "path": "/streak", "value": 7 },
  { "op": "replace", "path": "/topicProgress/vocab/correct", "value": 4 }
]

// LEVEL_UP
{ "level": 5, "title": "Sage", "xp": 1500 }

// BOSS_DEFEATED
{ "topicId": "vocab", "reward_xp": 200, "bossName": "The Lexical Wraith" }

// STREAK_MILESTONE
{ "streak": 10, "bonus_xp": 50 }

// DIFFICULTY_SHIFT
{ "from": "medium", "to": "hard", "reason": "3 consecutive correct" }

// RUN_FINISHED
{ "runId": "uuid", "status": "completed" | "error" | "timeout" }
```

---

## 10. Frontend Component Map

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (game)/
│   ├── home/page.tsx              ← player card, topic grid, leaderboard
│   ├── play/[topicId]/page.tsx    ← practice session (AG-UI SSE)
│   ├── boss/[topicId]/page.tsx    ← boss battle (AG-UI HITL)
│   ├── daily/page.tsx             ← daily challenge
│   └── profile/page.tsx          ← stats, achievements, history
└── components/
    ├── agui/
    │   ├── useAGUIStream.ts       ← core SSE hook
    │   ├── EventRenderer.tsx      ← renders AG-UI event types
    │   └── InterruptPanel.tsx     ← HITL UI (boss answers, hint confirm)
    ├── game/
    │   ├── QuestionCard.tsx
    │   ├── OptionsList.tsx
    │   ├── ExplanationBox.tsx
    │   ├── XPBar.tsx
    │   ├── BossHPBar.tsx
    │   └── StreakBadge.tsx
    └── ui/
        ├── LevelUpOverlay.tsx
        ├── BossDefeatedOverlay.tsx
        └── Leaderboard.tsx
```

### useAGUIStream Hook (Spec)

```typescript
interface AGUIState {
  phase: 'idle' | 'running' | 'interrupt' | 'done'
  streamText: string
  streamPhase: 'question' | 'explanation' | 'narration' | 'hint' | null
  interrupt: { runId: string; reason: string } | null
  events: AGUIEvent[]
}

function useAGUIStream(options: {
  onStateDetla?: (patch: JSONPatch) => void
  onLevelUp?: (event: LevelUpEvent) => void
  onBossDefeated?: (event: BossDefeatedEvent) => void
}): {
  state: AGUIState
  startSession: (topicId: string, mode: string) => Promise<void>
  submitAnswer: (answer: string) => Promise<void>
  requestHint: () => Promise<void>
  resume: (runId: string, answer: string) => Promise<void>
}
```

---

## 11. Gamification Mechanics — Full Spec

### XP Table

| Action | XP | Notes |
|---|---|---|
| Correct answer (Medium) | 50 | Base |
| Correct answer (Hard) | 70 | Base |
| Correct answer (Expert/Boss) | 100 | Base |
| Streak bonus (per tier) | +10 | Max 5 tiers → +50 |
| Daily challenge correct | ×2 multiplier | Applied to base XP |
| Boss defeated | +200 | One-time per boss per day |
| Achievement earned | Varies | 25–500 XP |
| Daily login | +10 | Per day |

### Level Thresholds

| Level | Title | XP Required |
|---|---|---|
| 1 | Initiate | 0 |
| 2 | Scribe | 200 |
| 3 | Scholar | 500 |
| 4 | Adept | 900 |
| 5 | Sage | 1,500 |
| 6 | Logician | 2,300 |
| 7 | Rhetorician | 3,400 |
| 8 | Master | 5,000 |
| 9 | Oracle | 7,000 |
| 10 | Lexicon Lord | 10,000 |

### Achievements

| ID | Name | Trigger | XP |
|---|---|---|---|
| first_blood | First Strike | Answer 1st question correctly | 25 |
| on_fire | On Fire | 10-question streak | 100 |
| unstoppable | Unstoppable | 25-question streak | 250 |
| boss_slayer | Boss Slayer | Defeat first boss | 150 |
| exterminator | Exterminator | Defeat all 5 bosses | 500 |
| wordsmith | Wordsmith | 50 vocab questions correct | 100 |
| logician | The Logician | 50 critical reasoning correct | 100 |
| daily_grind | Daily Grind | 7-day daily streak | 200 |
| perfectionist | Perfectionist | 10 questions, 100% accuracy | 150 |
| speed_demon | Speed Demon | Answer correctly in < 30s, 5× | 100 |

---

## 12. Question Generation — Agent Prompt Architecture

### System Prompt (per topic)

Each session start sends a system prompt that includes:

1. **Role:** Expert GRE/GMAT question generator
2. **Topic spec:** Exact question type, format, difficulty
3. **Deduplication context:** Last 5 question hashes for this user/topic (prevent repeats)
4. **Difficulty calibration:** Current user level and recent accuracy
5. **Output format:** Strict JSON schema

### Difficulty Calibration Logic (FastAPI)

```python
def calibrate_difficulty(recent_answers: list[bool], current_difficulty: str) -> str:
    if len(recent_answers) < 3:
        return current_difficulty
    last_3 = recent_answers[-3:]
    if all(last_3):       # 3 consecutive correct → increase
        return next_difficulty(current_difficulty)
    if not any(last_3):   # 3 consecutive wrong → decrease
        return prev_difficulty(current_difficulty)
    return current_difficulty
```

### Boss Narration Prompt

Boss battles use a multi-turn conversation where the agent plays both narrator and question generator:

```
System: You are the voice of The Lexical Wraith, a boss who tests vocabulary mastery.
        Narrate dramatically in 2-3 sentences, then generate the question.
        After each answer, react to the result before the next question.
        When defeated, deliver a dramatic concession speech.
```

---

## 13. Supabase Realtime — Leaderboard

The leaderboard uses Supabase's Postgres Changes to broadcast XP updates:

```typescript
// Frontend subscription
const channel = supabase
  .channel('leaderboard')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'game_state',
  }, (payload) => {
    updateLeaderboardEntry(payload.new)
  })
  .subscribe()
```

A Postgres trigger on `game_state` notifies `refresh_leaderboard` which the backend listens to and refreshes the materialized view every 30 seconds.

---

## 14. Security

| Area | Approach |
|---|---|
| Auth | Supabase JWT; all FastAPI endpoints verify token via `python-jose` |
| Row-level security | All Supabase tables use `auth.uid()` RLS policies |
| Rate limiting | FastAPI: 10 session starts/min per user; 60 answers/min |
| API key | Anthropic key never exposed to client; all generation server-side |
| Input validation | Answer field validated against `[A-F]` only |
| Boss resume | `run_id` validated against session owner before unblocking |

---

## 15. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Question generation latency (first token) | < 800ms |
| Full question stream completion | < 4s |
| API uptime | 99.5% |
| Leaderboard update lag | < 5s |
| Mobile responsive | iOS Safari + Android Chrome |
| Offline graceful degradation | Show cached last question + score |
| WCAG accessibility | AA |

---

## 16. Development Milestones

### Phase 1 — Foundation (Weeks 1–3)

- Supabase project setup: auth, DB schema, RLS
- FastAPI skeleton with AG-UI SSE streaming
- Basic question generation (vocab + text completion)
- Next.js app with `useAGUIStream` hook
- Practice session end-to-end: generate → answer → XP

### Phase 2 — Game Loop (Weeks 4–6)

- All 5 topic types
- XP, levels, streaks in DB + UI
- Boss battles with HITL INTERRUPT/resume
- Leaderboard (static first, then Realtime)
- Adaptive difficulty calibration

### Phase 3 — Engagement (Weeks 7–9)

- Daily challenges
- Achievements system
- Hints (HITL)
- Player analytics dashboard
- Boss personalities + narration

### Phase 4 — Polish & Scale (Weeks 10–12)

- Google OAuth
- Weekly leaderboard
- Spaced repetition (weighted topic selection)
- Score prediction model
- Performance optimization + caching

---

## 17. Open Questions

1. Should boss battles support a "save and resume" flow if the user disconnects mid-battle?
2. Do we want a free tier with a daily question cap, or fully free at launch?
3. Should question history be exportable (for offline review)?
4. Is there a teacher/classroom mode (track student cohorts)?
5. Do we generate GMAT-specific question formats separately from GRE, or treat them as difficulty variants of the same types?

---

*Document owner: Product · Last updated: May 2026*
