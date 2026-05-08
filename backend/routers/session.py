from __future__ import annotations
import asyncio
import uuid
from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from models.events import (
    sse_run_started, sse_agent_action, sse_state_snapshot,
    sse_text_start, sse_text_content, sse_text_end,
    sse_state_delta, sse_question_ready, sse_level_up,
    sse_streak_milestone, sse_difficulty_shift, sse_run_finished, sse_error,
)
from models.game import SessionState, BOSS_NAMES
from services.supabase_client import (
    verify_token, get_game_state, get_recent_question_hashes, get_topic_progress,
)
from services.question_engine import generate_question, stream_explanation
from services.difficulty import calibrate_difficulty
from services.game_service import process_correct_answer, process_wrong_answer

router = APIRouter()

# In-memory session store (use Redis in production)
_sessions: dict[str, SessionState] = {}


class StartSessionRequest(BaseModel):
    topic_id: str
    mode: str = "practice"
    difficulty: Optional[str] = None


class AnswerRequest(BaseModel):
    session_id: str
    answer: str
    time_taken_ms: Optional[int] = None


class HintRequest(BaseModel):
    session_id: str


async def _session_start_generator(
    session_id: str,
    user_id: str,
    topic_id: str,
    difficulty: str,
    game_state: dict,
    is_daily: bool,
    recent_hashes: list[str],
    recent_answers: list[bool],
):
    run_id = session_id  # client uses runId from RUN_STARTED as session_id
    try:
        yield sse_run_started(run_id, topic_id, "practice")
        yield sse_agent_action("calibrating", "Calibrating difficulty…")

        new_diff, shift_reason = calibrate_difficulty(recent_answers, difficulty)
        if shift_reason:
            yield sse_difficulty_shift(difficulty, new_diff, shift_reason)
            difficulty = new_diff

        yield sse_state_snapshot(game_state)
        yield sse_agent_action("generating", "Generating your question…")

        question = await generate_question(topic_id, difficulty, recent_hashes)

        session = SessionState(
            session_id=session_id,
            user_id=user_id,
            topic_id=topic_id,
            difficulty=difficulty,
            question=question,
            is_daily=is_daily,
            recent_answers=recent_answers,
        )
        _sessions[session_id] = session

        msg_id = str(uuid.uuid4())
        yield sse_text_start(msg_id, "question")

        full_text = question.get("question_text", "")
        if question.get("passage"):
            full_text = question["passage"] + "\n\n" + full_text

        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield sse_text_content(msg_id, chunk)
            await asyncio.sleep(0.02)

        yield sse_text_end(msg_id)

        allow_multiple = topic_id == "sentence_equivalence"
        yield sse_question_ready(question["options"], topic_id, allow_multiple)

        patch = [{"op": "replace", "path": "/currentDifficulty", "value": difficulty}]
        yield sse_state_delta(patch)
        yield sse_run_finished(run_id)
    except Exception as e:
        yield sse_error(f"Session start failed: {e}")
        yield sse_run_finished(run_id)


async def _session_answer_generator(
    session: SessionState,
    answer: str,
    time_taken_ms: int | None,
):
    run_id = str(uuid.uuid4())
    try:
        yield sse_run_started(run_id, session.topic_id, "practice")
        yield sse_agent_action("evaluating", "Evaluating your answer…")

        question = session.question
        correct_answers = question["correct_answers"]

        if session.topic_id == "sentence_equivalence":
            user_answers = sorted(answer.split(","))
            is_correct = sorted(correct_answers) == user_answers
        else:
            is_correct = answer.upper() in [a.upper() for a in correct_answers]

        msg_id = str(uuid.uuid4())
        yield sse_text_start(msg_id, "explanation")

        async for chunk in stream_explanation(
            question["question_text"],
            question["options"],
            correct_answers,
            answer,
            session.topic_id,
            session.difficulty,
        ):
            yield sse_text_content(msg_id, chunk)

        yield sse_text_end(msg_id)

        patch = []
        if is_correct:
            result = await process_correct_answer(
                user_id=session.user_id,
                topic_id=session.topic_id,
                difficulty=session.difficulty,
                question_hash=question["question_hash"],
                hint_used=session.hint_used,
                is_daily=session.is_daily,
                time_taken_ms=time_taken_ms,
            )
            patch = [
                {"op": "replace", "path": "/xp", "value": result["new_xp"]},
                {"op": "replace", "path": "/level", "value": result["new_level"]},
                {"op": "replace", "path": "/streak", "value": result["new_streak"]},
                {"op": "replace", "path": "/xpEarned", "value": result["xp_earned"]},
                {"op": "replace", "path": "/isCorrect", "value": True},
            ]
            if result["leveled_up"]:
                yield sse_level_up(result["new_level"], result["level_title"], result["new_xp"])
            if result["streak_milestone"]:
                bonus = (result["new_streak"] // 5) * 10
                yield sse_streak_milestone(result["new_streak"], bonus)
        else:
            result = await process_wrong_answer(
                user_id=session.user_id,
                topic_id=session.topic_id,
                difficulty=session.difficulty,
                question_hash=question["question_hash"],
                time_taken_ms=time_taken_ms,
            )
            patch = [
                {"op": "replace", "path": "/streak", "value": 0},
                {"op": "replace", "path": "/xpEarned", "value": 0},
                {"op": "replace", "path": "/isCorrect", "value": False},
                {"op": "replace", "path": "/correctAnswers", "value": correct_answers},
            ]

        yield sse_state_delta(patch)
    except Exception as e:
        yield sse_error(f"Answer evaluation failed: {e}")
    finally:
        yield sse_run_finished(run_id)
        _sessions.pop(session.session_id, None)


async def _hint_generator(session: SessionState):
    run_id = str(uuid.uuid4())
    yield sse_run_started(run_id, session.topic_id, "hint")
    yield sse_agent_action("generating", "Generating a hint…")

    question = session.question
    hint_prompt = (
        f"Give a helpful hint (1-2 sentences) for this question WITHOUT revealing the answer:\n\n"
        f"Question: {question['question_text']}\n"
        f"Options: {', '.join(f'{k}: {v}' for k, v in question['options'].items())}"
    )

    from services.question_engine import get_client
    client = get_client()
    msg_id = str(uuid.uuid4())
    yield sse_text_start(msg_id, "hint")

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": hint_prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield sse_text_content(msg_id, text)

    yield sse_text_end(msg_id)
    # Mark hint used and cap XP
    session.hint_used = True
    yield sse_run_finished(run_id)


def _make_sse_response(generator) -> StreamingResponse:
    async def gen():
        async for event in generator:
            yield f"data: {event['data']}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@router.post("/start")
async def start_session(
    req: StartSessionRequest,
    authorization: Optional[str] = Header(None),
):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    game_state = await get_game_state(user_id)
    topic_progress = await get_topic_progress(user_id)
    progress_map = {p["topic_id"]: p for p in topic_progress}
    topic_prog = progress_map.get(req.topic_id, {})

    # Determine starting difficulty
    if req.difficulty:
        difficulty = req.difficulty
    else:
        answered = topic_prog.get("answered", 0)
        correct = topic_prog.get("correct", 0)
        accuracy = correct / answered if answered > 0 else 0.5
        if accuracy >= 0.8 and answered >= 5:
            difficulty = "hard"
        elif accuracy >= 0.8 and answered >= 10:
            difficulty = "expert"
        else:
            difficulty = "medium"

    recent_hashes = await get_recent_question_hashes(user_id, req.topic_id)

    # Get last 10 answers for difficulty calibration
    from services.supabase_client import get_supabase, _is_guest, _guest_question_history
    if _is_guest(user_id):
        history = _guest_question_history.get(user_id, [])
        recent_answers = [
            h["is_correct"] for h in history if h["topic_id"] == req.topic_id
        ][-10:]
    else:
        sb = get_supabase()
        if sb:
            res = (
                sb.table("question_history")
                .select("is_correct")
                .eq("user_id", user_id)
                .eq("topic_id", req.topic_id)
                .order("answered_at", desc=True)
                .limit(10)
                .execute()
            )
            recent_answers = [r["is_correct"] for r in (res.data or [])]
        else:
            recent_answers = []

    session_id = str(uuid.uuid4())
    is_daily = req.mode == "daily"

    return _make_sse_response(
        _session_start_generator(
            session_id, user_id, req.topic_id, difficulty,
            game_state, is_daily, recent_hashes, recent_answers,
        )
    )


@router.post("/answer")
async def submit_answer(
    req: AnswerRequest,
    authorization: Optional[str] = Header(None),
):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    session = _sessions.get(req.session_id)
    if not session:
        async def err():
            yield sse_error("Session not found or expired")
        return _make_sse_response(err())

    if session.user_id != user_id:
        async def err():
            yield sse_error("Unauthorized")
        return _make_sse_response(err())

    return _make_sse_response(
        _session_answer_generator(session, req.answer, req.time_taken_ms)
    )


@router.post("/hint")
async def request_hint(
    req: HintRequest,
    authorization: Optional[str] = Header(None),
):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    session = _sessions.get(req.session_id)
    if not session or session.user_id != user_id:
        async def err():
            yield sse_error("Session not found")
        return _make_sse_response(err())

    if session.hint_used:
        async def err():
            yield sse_error("Hint already used for this question")
        return _make_sse_response(err())

    return _make_sse_response(_hint_generator(session))
