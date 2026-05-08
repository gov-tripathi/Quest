from __future__ import annotations
from fastapi import APIRouter, Header
from typing import Optional
from services.supabase_client import (
    verify_token, get_game_state, get_topic_progress,
    get_leaderboard, get_player_rank, get_supabase, _is_guest,
)

router = APIRouter()

GUEST_ACHIEVEMENTS = [
    {"id": "first_blood",   "name": "First Strike",   "description": "Answer your first question correctly", "icon": "⚔️",  "xp_reward": 25,  "earned": False, "earned_at": None},
    {"id": "on_fire",       "name": "On Fire",         "description": "Achieve a 10-question streak",         "icon": "🔥", "xp_reward": 100, "earned": False, "earned_at": None},
    {"id": "boss_slayer",   "name": "Boss Slayer",     "description": "Defeat your first boss",               "icon": "🐉", "xp_reward": 150, "earned": False, "earned_at": None},
    {"id": "wordsmith",     "name": "Wordsmith",       "description": "50 vocabulary questions correct",      "icon": "📚", "xp_reward": 100, "earned": False, "earned_at": None},
    {"id": "perfectionist", "name": "Perfectionist",   "description": "10 questions, 100% accuracy",          "icon": "✨", "xp_reward": 150, "earned": False, "earned_at": None},
]


@router.get("/me/state")
async def my_state(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    return await get_game_state(payload["sub"])


@router.get("/me/progress")
async def my_progress(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    return await get_topic_progress(payload["sub"])


@router.get("/leaderboard")
async def leaderboard(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    if _is_guest(user_id):
        return {"leaderboard": [], "playerEntry": None, "playerRank": None}

    board = await get_leaderboard()
    player_rank = await get_player_rank(user_id)
    player_entry = None
    if player_rank and not any(e["id"] == user_id for e in board):
        gs = await get_game_state(user_id)
        sb = get_supabase()
        if sb:
            profile = sb.table("profiles").select("username,avatar_url").eq("id", user_id).single().execute()
            if profile.data:
                player_entry = {
                    "id": user_id,
                    "username": profile.data["username"],
                    "avatar_url": profile.data.get("avatar_url"),
                    "xp": gs.get("xp", 0),
                    "level": gs.get("level", 1),
                    "rank": player_rank,
                }

    return {"leaderboard": board, "playerEntry": player_entry, "playerRank": player_rank}


@router.get("/daily-challenge")
async def daily_challenge(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    if _is_guest(user_id):
        from datetime import date
        return {
            "challenge": {
                "id": "guest-daily",
                "date": date.today().isoformat(),
                "topic_id": "vocab",
                "difficulty": "medium",
                "bonus_xp": 100,
            },
            "completed": False,
        }

    sb = get_supabase()
    if not sb:
        return {"challenge": None}

    from datetime import date
    today = date.today().isoformat()
    challenge = sb.table("daily_challenges").select("*").eq("date", today).single().execute()
    if not challenge.data:
        return {"challenge": None}

    completed = (
        sb.table("daily_challenge_completions")
        .select("*").eq("user_id", user_id).eq("challenge_id", challenge.data["id"]).execute()
    )
    return {"challenge": challenge.data, "completed": bool(completed.data)}


@router.get("/me/achievements")
async def my_achievements(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    if _is_guest(user_id):
        return GUEST_ACHIEVEMENTS

    sb = get_supabase()
    if not sb:
        return GUEST_ACHIEVEMENTS

    all_ach = sb.table("achievements").select("*").execute()
    earned = sb.table("user_achievements").select("achievement_id,earned_at").eq("user_id", user_id).execute()
    earned_map = {e["achievement_id"]: e["earned_at"] for e in (earned.data or [])}

    return [
        {**ach, "earned": ach["id"] in earned_map, "earned_at": earned_map.get(ach["id"])}
        for ach in (all_ach.data or [])
    ]
