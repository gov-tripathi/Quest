from __future__ import annotations
from datetime import date, datetime, timezone
from models.game import (
    LEVEL_THRESHOLDS,
    calculate_xp,
    xp_to_level,
    STREAK_MILESTONES,
    BOSS_NAMES,
)
from services.supabase_client import (
    get_game_state,
    update_game_state,
    upsert_topic_progress,
    insert_question_history,
)


async def process_correct_answer(
    user_id: str,
    topic_id: str,
    difficulty: str,
    question_hash: str,
    hint_used: bool,
    is_daily: bool,
    time_taken_ms: int | None,
) -> dict:
    """
    Returns dict with: xp_earned, new_xp, new_level, old_level, new_streak,
    streak_milestone, leveled_up, level_title
    """
    game = await get_game_state(user_id)

    current_streak = game.get("streak", 0) + 1
    best_streak = max(game.get("best_streak", 0), current_streak)

    xp_earned = calculate_xp(difficulty, current_streak, is_daily)
    if hint_used:
        xp_earned = max(xp_earned // 2, 1)

    new_xp = game.get("xp", 0) + xp_earned
    old_level, _ = xp_to_level(game.get("xp", 0))
    new_level, new_title = xp_to_level(new_xp)

    today = date.today().isoformat()
    last_played = game.get("last_played_at")
    if last_played:
        last_date = datetime.fromisoformat(last_played).date().isoformat()
    else:
        last_date = None

    # Daily streak logic
    daily_streak = game.get("daily_streak", 0)
    if last_date != today:
        yesterday = (date.today().replace(day=date.today().day - 1)).isoformat()
        if last_date == yesterday:
            daily_streak += 1
        else:
            daily_streak = 1

    updates = {
        "xp": new_xp,
        "level": new_level,
        "streak": current_streak,
        "best_streak": best_streak,
        "daily_streak": daily_streak,
        "last_played_at": datetime.now(timezone.utc).isoformat(),
        "total_answered": game.get("total_answered", 0) + 1,
        "total_correct": game.get("total_correct", 0) + 1,
    }
    await update_game_state(user_id, updates)
    await upsert_topic_progress(user_id, topic_id, correct_delta=1, answered_delta=1)
    await insert_question_history(
        user_id, topic_id, difficulty, question_hash, True, time_taken_ms
    )

    streak_milestone = current_streak if current_streak in STREAK_MILESTONES else None

    return {
        "xp_earned": xp_earned,
        "new_xp": new_xp,
        "new_level": new_level,
        "old_level": old_level,
        "new_streak": current_streak,
        "streak_milestone": streak_milestone,
        "leveled_up": new_level > old_level,
        "level_title": new_title,
        "daily_streak": daily_streak,
    }


async def process_wrong_answer(
    user_id: str,
    topic_id: str,
    difficulty: str,
    question_hash: str,
    time_taken_ms: int | None,
) -> dict:
    game = await get_game_state(user_id)

    updates = {
        "streak": 0,
        "total_answered": game.get("total_answered", 0) + 1,
        "last_played_at": datetime.now(timezone.utc).isoformat(),
    }
    await update_game_state(user_id, updates)
    await upsert_topic_progress(user_id, topic_id, correct_delta=0, answered_delta=1)
    await insert_question_history(
        user_id, topic_id, difficulty, question_hash, False, time_taken_ms
    )

    return {
        "xp_earned": 0,
        "new_xp": game.get("xp", 0),
        "new_level": game.get("level", 1),
        "new_streak": 0,
    }


async def mark_boss_defeated(user_id: str, topic_id: str) -> dict:
    game = await get_game_state(user_id)
    new_xp = game.get("xp", 0) + 200
    new_level, new_title = xp_to_level(new_xp)

    updates = {
        "xp": new_xp,
        "level": new_level,
        "bosses_defeated": game.get("bosses_defeated", 0) + 1,
    }
    await update_game_state(user_id, updates)

    # Mark boss_defeated in topic_progress
    from services.supabase_client import get_supabase, _is_guest, _guest_topic_progress
    if _is_guest(user_id):
        for p in _guest_topic_progress.get(user_id, []):
            if p["topic_id"] == topic_id:
                p["boss_defeated"] = True
    else:
        sb = get_supabase()
        if sb:
            sb.table("topic_progress").upsert({
                "user_id": user_id,
                "topic_id": topic_id,
                "boss_defeated": True,
            }, on_conflict="user_id,topic_id").execute()

    return {"new_xp": new_xp, "boss_name": BOSS_NAMES.get(topic_id, "The Boss")}
