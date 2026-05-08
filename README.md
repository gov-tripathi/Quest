# GREQuest

AI-powered, gamified GRE & GMAT verbal prep. Unique questions every session, adaptive difficulty, boss battles, streaks, and a real-time leaderboard.

**Stack:** Next.js 14 · FastAPI · AG-UI Protocol (SSE) · Claude claude-sonnet-4-6 · Supabase

---

## Project Structure

```
quest/
├── backend/          FastAPI + AG-UI SSE agent
├── frontend/         Next.js 14 app
└── supabase/         SQL schema + seed data
```

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run `supabase/schema.sql`
3. Then run `supabase/seed.sql`
4. Enable Google OAuth in **Auth → Providers** (optional)
5. Copy from **Project Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key
   - JWT secret (from **Settings → JWT Settings**)

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in:
#   ANTHROPIC_API_KEY
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   SUPABASE_JWT_SECRET

uvicorn main:app --reload --port 8000
```

The backend runs at `http://localhost:8000`. Visit `/docs` for the OpenAPI UI.

### 3. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Edit .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

The frontend runs at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification |
| `REDIS_URL` | Redis URL (optional — in-memory fallback used in dev) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL |

---

## Features

### Core Game Loop
- AI generates a unique question via Claude claude-sonnet-4-6 (tool_use for structured output)
- Question text streams token-by-token to the browser via SSE (AG-UI protocol)
- Player selects an answer; explanation streams back
- XP, streak, and level update in real time

### AG-UI Event Stream
Every session/answer/hint is a streaming HTTP POST that emits typed SSE events:
`RUN_STARTED → AGENT_ACTION → TEXT_MESSAGE_* → STATE_DELTA → RUN_FINISHED`

### Boss Battles (HITL)
- Unlock after 5 correct answers in a topic
- Boss narrates, questions stream, INTERRUPT event pauses the stream
- Player answers via `POST /api/boss/resume` which unblocks the async generator
- 5 boss HP / 3 player HP; win = `BOSS_DEFEATED` event + 200 XP

### Adaptive Difficulty
- Calibrated per topic from last 10 answers
- 3 consecutive correct → increase difficulty; 3 wrong → decrease
- Emits `DIFFICULTY_SHIFT` event to the client

### Gamification
- XP: +50/70/100 per difficulty; streak tiers add up to +50
- 10 levels from Initiate → Lexicon Lord
- `LEVEL_UP` event triggers overlay animation
- Daily challenges with 2× XP multiplier
- 10 achievements

### Leaderboard
- Materialized view refreshed on every `game_state` write
- Supabase Realtime broadcasts updates to all connected clients

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/session/start` | POST | Start practice session → SSE stream |
| `/api/session/answer` | POST | Submit answer → SSE stream (explanation) |
| `/api/session/hint` | POST | Request hint → SSE stream |
| `/api/boss/start` | POST | Start boss battle → SSE stream |
| `/api/boss/resume` | POST | Submit boss answer (unblocks SSE) |
| `/api/me/state` | GET | Full game state |
| `/api/me/progress` | GET | Topic progress |
| `/api/me/achievements` | GET | All achievements + earned status |
| `/api/leaderboard` | GET | Top 100 + player rank |
| `/api/daily-challenge` | GET | Today's challenge |

---

## Development Milestones (from PRD)

- [x] Phase 1 — Foundation: Auth, schema, AG-UI SSE, question generation, practice session
- [x] Phase 2 — Game Loop: All 5 topics, XP/levels/streaks, boss battles, leaderboard, adaptive difficulty
- [ ] Phase 3 — Engagement: Achievements logic, hints, analytics charts, boss personalities
- [ ] Phase 4 — Polish: Weekly leaderboard, spaced repetition weighting, score prediction

---

## Production Deployment

**Backend:** Deploy to [Railway](https://railway.app) or [Fly.io](https://fly.io). Set all env vars. Add Redis for multi-instance boss battle state.

**Frontend:** Deploy to [Vercel](https://vercel.com). Set `NEXT_PUBLIC_*` env vars. Update `ALLOWED_ORIGINS` in backend.
