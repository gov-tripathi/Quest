from __future__ import annotations
import json
from enum import Enum
from typing import Any


class EventType(str, Enum):
    RUN_STARTED = "RUN_STARTED"
    STATE_SNAPSHOT = "STATE_SNAPSHOT"
    AGENT_ACTION = "AGENT_ACTION"
    TEXT_MESSAGE_START = "TEXT_MESSAGE_START"
    TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT"
    TEXT_MESSAGE_END = "TEXT_MESSAGE_END"
    STATE_DELTA = "STATE_DELTA"
    INTERRUPT = "INTERRUPT"
    LEVEL_UP = "LEVEL_UP"
    BOSS_DEFEATED = "BOSS_DEFEATED"
    STREAK_MILESTONE = "STREAK_MILESTONE"
    DIFFICULTY_SHIFT = "DIFFICULTY_SHIFT"
    QUESTION_READY = "QUESTION_READY"
    RUN_FINISHED = "RUN_FINISHED"
    ERROR = "ERROR"


def sse(event_type: EventType, payload: Any) -> dict:
    return {"data": json.dumps({"type": event_type.value, **payload})}


def sse_run_started(run_id: str, topic: str, mode: str) -> dict:
    return sse(EventType.RUN_STARTED, {"runId": run_id, "topic": topic, "mode": mode})


def sse_agent_action(action_type: str, label: str) -> dict:
    return sse(EventType.AGENT_ACTION, {"actionType": action_type, "label": label})


def sse_text_start(message_id: str, phase: str) -> dict:
    return sse(EventType.TEXT_MESSAGE_START, {"messageId": message_id, "role": "assistant", "phase": phase})


def sse_text_content(message_id: str, delta: str) -> dict:
    return sse(EventType.TEXT_MESSAGE_CONTENT, {"messageId": message_id, "delta": delta})


def sse_text_end(message_id: str) -> dict:
    return sse(EventType.TEXT_MESSAGE_END, {"messageId": message_id})


def sse_state_snapshot(game_state: dict) -> dict:
    return sse(EventType.STATE_SNAPSHOT, {"gameState": game_state})


def sse_state_delta(patch: list[dict]) -> dict:
    return sse(EventType.STATE_DELTA, {"patch": patch})


def sse_question_ready(options: dict, question_type: str, allow_multiple: bool = False) -> dict:
    return sse(EventType.QUESTION_READY, {
        "options": options,
        "questionType": question_type,
        "allowMultiple": allow_multiple,
    })


def sse_interrupt(run_id: str, reason: str) -> dict:
    return sse(EventType.INTERRUPT, {"runId": run_id, "reason": reason})


def sse_level_up(level: int, title: str, xp: int) -> dict:
    return sse(EventType.LEVEL_UP, {"level": level, "title": title, "xp": xp})


def sse_boss_defeated(topic_id: str, reward_xp: int, boss_name: str) -> dict:
    return sse(EventType.BOSS_DEFEATED, {"topicId": topic_id, "rewardXp": reward_xp, "bossName": boss_name})


def sse_streak_milestone(streak: int, bonus_xp: int) -> dict:
    return sse(EventType.STREAK_MILESTONE, {"streak": streak, "bonusXp": bonus_xp})


def sse_difficulty_shift(from_diff: str, to_diff: str, reason: str) -> dict:
    return sse(EventType.DIFFICULTY_SHIFT, {"from": from_diff, "to": to_diff, "reason": reason})


def sse_run_finished(run_id: str, status: str = "completed") -> dict:
    return sse(EventType.RUN_FINISHED, {"runId": run_id, "status": status})


def sse_error(message: str) -> dict:
    return sse(EventType.ERROR, {"message": message})
