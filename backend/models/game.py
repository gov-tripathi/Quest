from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


LEVEL_THRESHOLDS = [
    (1, "Initiate", 0),
    (2, "Scribe", 200),
    (3, "Scholar", 500),
    (4, "Adept", 900),
    (5, "Sage", 1500),
    (6, "Logician", 2300),
    (7, "Rhetorician", 3400),
    (8, "Master", 5000),
    (9, "Oracle", 7000),
    (10, "Lexicon Lord", 10000),
]

XP_REWARDS = {
    "medium": 50,
    "hard": 70,
    "expert": 100,
    "boss": 100,
}

STREAK_MILESTONES = {5, 10, 20}

BOSS_NAMES = {
    "vocab": "The Lexical Wraith",
    "text_completion": "The Syntax Specter",
    "critical_reasoning": "The Logic Lich",
    "sentence_equivalence": "The Parallel Phantom",
    "reading_comprehension": "The Passage Predator",
}

TOPIC_LABELS = {
    "vocab": "Vocabulary",
    "text_completion": "Text Completion",
    "critical_reasoning": "Critical Reasoning",
    "sentence_equivalence": "Sentence Equivalence",
    "reading_comprehension": "Reading Comprehension",
}


def xp_to_level(xp: int) -> tuple[int, str]:
    current = (1, "Initiate")
    for level, title, threshold in LEVEL_THRESHOLDS:
        if xp >= threshold:
            current = (level, title)
        else:
            break
    return current


def calculate_xp(difficulty: str, streak: int, is_daily: bool = False) -> int:
    base = XP_REWARDS.get(difficulty, 50)
    streak_tiers = min(streak // 5, 5)
    streak_bonus = streak_tiers * 10
    total = base + streak_bonus
    if is_daily:
        total *= 2
    return total


class Question(BaseModel):
    question_text: str
    options: dict[str, str]
    correct_answers: list[str]
    explanation: str
    topic_id: str
    difficulty: str
    question_hash: str
    passage: Optional[str] = None


class SessionState(BaseModel):
    session_id: str
    user_id: str
    topic_id: str
    difficulty: str
    question: Optional[dict] = None  # raw dict from question_engine
    hint_used: bool = False
    is_daily: bool = False
    recent_answers: list[bool] = []


class BossState(BaseModel):
    run_id: str
    user_id: str
    topic_id: str
    boss_hp: int = 5
    player_hp: int = 3
    questions_asked: int = 0
    xp_earned: int = 0
