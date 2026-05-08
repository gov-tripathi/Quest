from __future__ import annotations
import os
import hashlib
import json
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


QUESTION_FUNCTION = {
    "name": "submit_question",
    "description": "Submit the generated GRE/GMAT question with all required fields.",
    "parameters": {
        "type": "object",
        "properties": {
            "question_text": {
                "type": "string",
                "description": "The question stem ONLY — do NOT include answer choices here.",
            },
            "passage": {
                "type": "string",
                "description": "Separate reading passage (Reading Comprehension only). Omit otherwise.",
            },
            "options": {
                "type": "object",
                "description": (
                    "Answer choices as a JSON object mapping letter to choice text. "
                    "Example: {\"A\": \"verbose\", \"B\": \"laconic\", \"C\": \"garrulous\", \"D\": \"terse\", \"E\": \"effusive\"}"
                ),
                "properties": {
                    "A": {"type": "string"},
                    "B": {"type": "string"},
                    "C": {"type": "string"},
                    "D": {"type": "string"},
                    "E": {"type": "string"},
                },
                "required": ["A", "B", "C", "D", "E"],
            },
            "correct_answers": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Correct letter(s). One for most types; exactly two for Sentence Equivalence.",
            },
            "explanation": {
                "type": "string",
                "description": "Clear explanation of the correct answer and why distractors are wrong.",
            },
        },
        "required": ["question_text", "options", "correct_answers", "explanation"],
    },
}

TOPIC_SYSTEM_PROMPTS = {
    "vocab": (
        "You are an expert GRE vocabulary question writer. "
        "Generate a question testing the meaning of one advanced GRE-level English word. "
        "Use 5 options (A–E). Only one is correct."
    ),
    "text_completion": (
        "You are an expert GRE Text Completion question writer. "
        "Generate a sentence with exactly one blank shown as _____. "
        "Use 5 options (A–E). Only one is correct."
    ),
    "critical_reasoning": (
        "You are an expert GMAT Critical Reasoning question writer. "
        "Generate a short argument (3–5 sentences) followed by a question "
        "(strengthen / weaken / assumption / inference). "
        "Use 5 options (A–E). Only one is correct."
    ),
    "sentence_equivalence": (
        "You are an expert GRE Sentence Equivalence question writer. "
        "Generate a sentence with one blank completable by TWO words that keep the meaning equivalent. "
        "Use 6 options (A–F). Exactly two are correct."
    ),
    "reading_comprehension": (
        "You are an expert GRE Reading Comprehension question writer. "
        "Generate a focused passage (150–200 words) and ONE question about it. "
        "Use 5 options (A–E). Only one is correct."
    ),
}

DIFFICULTY_LABELS = {
    "medium": "medium difficulty (GRE score range 550–650)",
    "hard":   "hard difficulty (GRE score range 650–700)",
    "expert": "expert difficulty (GRE score range 700+)",
    "boss":   "expert/boss difficulty (GRE 700+, maximally challenging)",
}

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


async def generate_question(
    topic_id: str,
    difficulty: str,
    recent_hashes: list[str] | None = None,
) -> dict:
    client = get_client()
    system = TOPIC_SYSTEM_PROMPTS.get(topic_id, TOPIC_SYSTEM_PROMPTS["vocab"])
    diff_label = DIFFICULTY_LABELS.get(difficulty, "medium difficulty")

    user_content = (
        f"Generate a {diff_label} question. "
        "Put ONLY the question stem in question_text (no answer choices). "
        "Put answer choices A through E as separate entries in the options object."
    )
    if recent_hashes:
        user_content += (
            f"\n\nRecently used question hashes (do NOT duplicate): "
            f"{', '.join(recent_hashes[:8])}"
        )

    response = await client.chat.completions.create(
        model=MODEL,
        tools=[{"type": "function", "function": QUESTION_FUNCTION}],
        tool_choice={"type": "function", "function": {"name": "submit_question"}},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    )

    tool_call = response.choices[0].message.tool_calls[0]
    data = json.loads(tool_call.function.arguments)

    # Fallback: parse options embedded in question_text if model didn't separate them
    if not data.get("options"):
        import re
        found = re.findall(r'\b([A-F])\)\s*([^\n]+)', data.get("question_text", ""))
        if found:
            data["options"] = {letter: text.strip() for letter, text in found}
            # Strip option lines from question_text
            data["question_text"] = re.sub(r'\n?[A-F]\)\s*[^\n]+', '', data["question_text"]).strip()

    if not data.get("options"):
        raise ValueError(f"generate_question: model returned no options for topic={topic_id}")

    q_hash = hashlib.sha256(data["question_text"].encode()).hexdigest()[:16]
    data["question_hash"] = q_hash
    data["topic_id"] = topic_id
    data["difficulty"] = difficulty
    if "passage" not in data:
        data["passage"] = None
    return data


async def stream_explanation(
    question_text: str,
    options: dict,
    correct_answers: list[str],
    user_answer: str,
    topic_id: str,
    difficulty: str,
):
    client = get_client()
    is_correct = user_answer.upper() in [a.upper() for a in correct_answers]
    result_word = "correct" if is_correct else "incorrect"

    prompt = (
        f"The student answered '{user_answer}', which is {result_word}.\n\n"
        f"Question: {question_text}\n\n"
        f"Options:\n" + "\n".join(f"{k}: {v}" for k, v in options.items()) + "\n\n"
        f"Correct answer(s): {', '.join(correct_answers)}\n\n"
        "In 2–3 sentences explain why the correct answer is right. "
        "If the student was wrong, briefly explain their mistake. Be educational and encouraging."
    )

    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def stream_boss_narration(
    boss_name: str,
    topic_id: str,
    phase: str,
    question_result: dict | None = None,
) -> list[str]:
    client = get_client()
    prompts = {
        "intro":   f"You are {boss_name}, a fearsome boss testing {topic_id.replace('_', ' ')} mastery. Introduce yourself dramatically in 2–3 sentences.",
        "correct": f"You are {boss_name}. The student answered correctly and wounded you. React in 1–2 sentences showing you are hurt but still dangerous.",
        "wrong":   f"You are {boss_name}. The student failed and you struck them. React triumphantly in 1–2 sentences.",
        "defeat":  f"You are {boss_name}. You have been defeated. Give a dramatic 2–3 sentence concession speech.",
        "victory": f"You are {boss_name}. You defeated the student. Give a triumphant 1–2 sentence victory speech.",
    }
    prompt = prompts.get(phase)
    if not prompt:
        return []

    chunks: list[str] = []
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            chunks.append(delta)
    return chunks
