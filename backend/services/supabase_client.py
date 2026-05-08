from __future__ import annotations
import os
from functools import lru_cache
from typing import Optional
from fastapi import HTTPException, Header
from datetime import date, datetime, timezone

# ── Guest mode ────────────────────────────────────────────────────────────────

GUEST_MODE: bool = os.getenv("GUEST_MODE", "false").lower() == "true"

# In-memory store for guest users (keyed by guest user_id = the bearer token)
_guest_game_state: dict[str, dict] = {}
_guest_topic_progress: dict[str, list] = {}
_guest_question_history: dict[str, list] = {}


def _default_game_state() -> dict:
    return {
        "xp": 0, "level": 1, "streak": 0, "best_streak": 0,
        "daily_streak": 0, "bosses_defeated": 0,
        "total_answered": 0, "total_correct": 0,
        "last_played_at": None, "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _is_guest(user_id: str) -> bool:
    return user_id.startswith("guest_")


# ── Supabase client (lazy, optional) ─────────────────────────────────────────

def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


# ── Token verification ────────────────────────────────────────────────────────

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()

    # Guest shortcut
    if GUEST_MODE and token.startswith("guest_"):
        return {"sub": token, "guest": True}

    # Normal Supabase JWT
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured. Set SUPABASE_JWT_SECRET or enable GUEST_MODE.")
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], options={"verify_aud": False})
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ── Game state ────────────────────────────────────────────────────────────────

async def get_game_state(user_id: str) -> dict:
    if _is_guest(user_id):
        if user_id not in _guest_game_state:
            _guest_game_state[user_id] = _default_game_state()
        return dict(_guest_game_state[user_id])

    sb = get_supabase()
    if not sb:
        return _default_game_state()
    res = sb.table("game_state").select("*").eq("user_id", user_id).single().execute()
    return res.data or _default_game_state()


async def update_game_state(user_id: str, updates: dict) -> dict:
    if _is_guest(user_id):
        state = _guest_game_state.setdefault(user_id, _default_game_state())
        state.update(updates)
        return dict(state)

    sb = get_supabase()
    if not sb:
        return updates
    res = sb.table("game_state").update(updates).eq("user_id", user_id).execute()
    return res.data[0] if res.data else {}


# ── Topic progress ────────────────────────────────────────────────────────────

async def get_topic_progress(user_id: str) -> list[dict]:
    if _is_guest(user_id):
        return list(_guest_topic_progress.get(user_id, []))

    sb = get_supabase()
    if not sb:
        return []
    res = sb.table("topic_progress").select("*").eq("user_id", user_id).execute()
    return res.data or []


async def upsert_topic_progress(user_id: str, topic_id: str, correct_delta: int, answered_delta: int):
    if _is_guest(user_id):
        progress = _guest_topic_progress.setdefault(user_id, [])
        for p in progress:
            if p["topic_id"] == topic_id:
                p["correct"] += correct_delta
                p["answered"] += answered_delta
                return
        progress.append({"topic_id": topic_id, "correct": max(correct_delta, 0),
                          "answered": answered_delta, "boss_defeated": False, "last_seen_at": None})
        return

    sb = get_supabase()
    if not sb:
        return
    existing = (
        sb.table("topic_progress")
        .select("*").eq("user_id", user_id).eq("topic_id", topic_id).execute()
    )
    if existing.data:
        row = existing.data[0]
        sb.table("topic_progress").update({
            "correct": row["correct"] + correct_delta,
            "answered": row["answered"] + answered_delta,
            "last_seen_at": "now()",
        }).eq("user_id", user_id).eq("topic_id", topic_id).execute()
    else:
        sb.table("topic_progress").insert({
            "user_id": user_id, "topic_id": topic_id,
            "correct": max(correct_delta, 0), "answered": answered_delta,
            "last_seen_at": "now()",
        }).execute()


# ── Question history ──────────────────────────────────────────────────────────

async def get_recent_question_hashes(user_id: str, topic_id: str, limit: int = 10) -> list[str]:
    if _is_guest(user_id):
        history = _guest_question_history.get(user_id, [])
        return [h["question_hash"] for h in history if h["topic_id"] == topic_id][-limit:]

    sb = get_supabase()
    if not sb:
        return []
    res = (
        sb.table("question_history")
        .select("question_hash")
        .eq("user_id", user_id).eq("topic_id", topic_id)
        .order("answered_at", desc=True).limit(limit).execute()
    )
    return [r["question_hash"] for r in (res.data or [])]


async def insert_question_history(
    user_id: str, topic_id: str, difficulty: str,
    question_hash: str, is_correct: bool, time_taken_ms: int | None = None,
):
    if _is_guest(user_id):
        history = _guest_question_history.setdefault(user_id, [])
        history.append({"topic_id": topic_id, "difficulty": difficulty,
                        "question_hash": question_hash, "is_correct": is_correct})
        return

    sb = get_supabase()
    if not sb:
        return
    sb.table("question_history").insert({
        "user_id": user_id, "topic_id": topic_id, "difficulty": difficulty,
        "question_hash": question_hash, "is_correct": is_correct,
        "time_taken_ms": time_taken_ms,
    }).execute()


# ── Leaderboard ───────────────────────────────────────────────────────────────

async def get_leaderboard() -> list[dict]:
    sb = get_supabase()
    if not sb:
        return []
    res = sb.from_("leaderboard").select("*").order("rank").limit(100).execute()
    return res.data or []


async def get_player_rank(user_id: str) -> int | None:
    if _is_guest(user_id):
        return None
    sb = get_supabase()
    if not sb:
        return None
    res = sb.from_("leaderboard").select("rank").eq("id", user_id).execute()
    return res.data[0]["rank"] if res.data else None
