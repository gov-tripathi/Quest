from __future__ import annotations
DIFFICULTIES = ["medium", "hard", "expert"]


def next_difficulty(current: str) -> str:
    idx = DIFFICULTIES.index(current) if current in DIFFICULTIES else 0
    return DIFFICULTIES[min(idx + 1, len(DIFFICULTIES) - 1)]


def prev_difficulty(current: str) -> str:
    idx = DIFFICULTIES.index(current) if current in DIFFICULTIES else 0
    return DIFFICULTIES[max(idx - 1, 0)]


def calibrate_difficulty(recent_answers: list[bool], current_difficulty: str) -> tuple[str, str | None]:
    """Return (new_difficulty, reason_or_None). reason is set when difficulty changes."""
    if len(recent_answers) < 3:
        return current_difficulty, None
    last_3 = recent_answers[-3:]
    if all(last_3):
        new = next_difficulty(current_difficulty)
        if new != current_difficulty:
            return new, "3 consecutive correct"
    elif not any(last_3):
        new = prev_difficulty(current_difficulty)
        if new != current_difficulty:
            return new, "3 consecutive wrong"
    return current_difficulty, None
