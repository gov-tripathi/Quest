from __future__ import annotations
import asyncio
import uuid
from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from models.events import (
    sse_run_started, sse_agent_action, sse_state_snapshot,
    sse_text_start, sse_text_content, sse_text_end,
    sse_state_delta, sse_question_ready, sse_interrupt,
    sse_boss_defeated, sse_level_up, sse_run_finished, sse_error,
)
from models.game import BossState, BOSS_NAMES
from services.supabase_client import verify_token, get_game_state, get_recent_question_hashes
from services.question_engine import generate_question, stream_boss_narration
from services.game_service import process_correct_answer, process_wrong_answer, mark_boss_defeated

router = APIRouter()

# run_id → asyncio.Queue for HITL resume
_boss_queues: dict[str, asyncio.Queue] = {}
# run_id → BossState
_boss_states: dict[str, BossState] = {}


class StartBossRequest(BaseModel):
    topic_id: str


class BossResumeRequest(BaseModel):
    run_id: str
    answer: str
    time_taken_ms: Optional[int] = None


async def _boss_battle_generator(run_id: str, user_id: str, topic_id: str, game_state: dict):
    boss_name = BOSS_NAMES.get(topic_id, "The Boss")
    queue: asyncio.Queue = _boss_queues[run_id]
    boss = _boss_states[run_id]

    yield sse_run_started(run_id, topic_id, "boss")
    yield sse_state_snapshot(game_state)

    # Boss intro narration
    yield sse_agent_action("narrating", f"Summoning {boss_name}…")
    intro_chunks = await stream_boss_narration(boss_name, topic_id, "intro")
    msg_id = str(uuid.uuid4())
    yield sse_text_start(msg_id, "narration")
    for chunk in intro_chunks:
        yield sse_text_content(msg_id, chunk)
        await asyncio.sleep(0.01)
    yield sse_text_end(msg_id)

    recent_hashes = await get_recent_question_hashes(user_id, topic_id)

    while boss.boss_hp > 0 and boss.player_hp > 0:
        # Generate boss question (always expert)
        yield sse_agent_action("generating", "Preparing boss question…")
        question = await generate_question(topic_id, "boss", recent_hashes)
        recent_hashes.append(question["question_hash"])

        # Stream question text
        q_msg_id = str(uuid.uuid4())
        yield sse_text_start(q_msg_id, "question")
        words = question["question_text"].split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield sse_text_content(q_msg_id, chunk)
            await asyncio.sleep(0.025)
        yield sse_text_end(q_msg_id)

        allow_multiple = topic_id == "sentence_equivalence"
        yield sse_question_ready(question["options"], topic_id, allow_multiple)

        # Emit INTERRUPT — wait for player answer
        yield sse_interrupt(run_id, "awaiting_answer")

        # Block here until resume endpoint puts the answer
        try:
            answer_data = await asyncio.wait_for(queue.get(), timeout=300)
        except asyncio.TimeoutError:
            yield sse_error("Boss battle timed out")
            yield sse_run_finished(run_id, "timeout")
            return

        answer = answer_data["answer"]
        time_taken_ms = answer_data.get("time_taken_ms")
        correct_answers = question["correct_answers"]

        if topic_id == "sentence_equivalence":
            user_answers = sorted(answer.split(","))
            is_correct = sorted(correct_answers) == user_answers
        else:
            is_correct = answer.upper() in [a.upper() for a in correct_answers]

        boss.questions_asked += 1

        # Narrate result
        phase = "correct" if is_correct else "wrong"
        narration_chunks = await stream_boss_narration(boss_name, topic_id, phase)
        r_msg_id = str(uuid.uuid4())
        yield sse_text_start(r_msg_id, "narration")
        for chunk in narration_chunks:
            yield sse_text_content(r_msg_id, chunk)
            await asyncio.sleep(0.01)
        yield sse_text_end(r_msg_id)

        if is_correct:
            boss.boss_hp -= 1
            result = await process_correct_answer(
                user_id=user_id,
                topic_id=topic_id,
                difficulty="boss",
                question_hash=question["question_hash"],
                hint_used=False,
                is_daily=False,
                time_taken_ms=time_taken_ms,
            )
            boss.xp_earned += result["xp_earned"]
        else:
            boss.player_hp -= 1
            await process_wrong_answer(
                user_id=user_id,
                topic_id=topic_id,
                difficulty="boss",
                question_hash=question["question_hash"],
                time_taken_ms=time_taken_ms,
            )

        yield sse_state_delta([
            {"op": "replace", "path": "/bossHP", "value": boss.boss_hp},
            {"op": "replace", "path": "/playerHP", "value": boss.player_hp},
        ])

    # Battle over
    if boss.boss_hp <= 0:
        result = await mark_boss_defeated(user_id, topic_id)
        defeat_chunks = await stream_boss_narration(boss_name, topic_id, "defeat")
        d_msg_id = str(uuid.uuid4())
        yield sse_text_start(d_msg_id, "narration")
        for chunk in defeat_chunks:
            yield sse_text_content(d_msg_id, chunk)
            await asyncio.sleep(0.01)
        yield sse_text_end(d_msg_id)

        yield sse_boss_defeated(topic_id, 200, boss_name)
        yield sse_state_delta([
            {"op": "replace", "path": "/xp", "value": result["new_xp"]},
            {"op": "replace", "path": "/bossDefeated", "value": True},
        ])
        yield sse_run_finished(run_id, "victory")
    else:
        victory_chunks = await stream_boss_narration(boss_name, topic_id, "victory")
        v_msg_id = str(uuid.uuid4())
        yield sse_text_start(v_msg_id, "narration")
        for chunk in victory_chunks:
            yield sse_text_content(v_msg_id, chunk)
            await asyncio.sleep(0.01)
        yield sse_text_end(v_msg_id)
        yield sse_run_finished(run_id, "defeat")

    # Cleanup
    _boss_queues.pop(run_id, None)
    _boss_states.pop(run_id, None)


def _make_sse_response(generator) -> StreamingResponse:
    async def gen():
        async for event in generator:
            yield f"data: {event['data']}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@router.post("/start")
async def start_boss(
    req: StartBossRequest,
    authorization: Optional[str] = Header(None),
):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    run_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    _boss_queues[run_id] = queue
    _boss_states[run_id] = BossState(run_id=run_id, user_id=user_id, topic_id=req.topic_id)

    game_state = await get_game_state(user_id)

    return _make_sse_response(
        _boss_battle_generator(run_id, user_id, req.topic_id, game_state)
    )


@router.post("/resume")
async def resume_boss(
    req: BossResumeRequest,
    authorization: Optional[str] = Header(None),
):
    payload = verify_token(authorization)
    user_id = payload["sub"]

    boss = _boss_states.get(req.run_id)
    if not boss or boss.user_id != user_id:
        return {"error": "Run not found or unauthorized"}

    queue = _boss_queues.get(req.run_id)
    if not queue:
        return {"error": "Run not active"}

    await queue.put({"answer": req.answer, "time_taken_ms": req.time_taken_ms})
    return {"status": "ok"}
