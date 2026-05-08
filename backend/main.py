from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import session, boss, game_state

app = FastAPI(title="GREQuest API", version="1.0.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router, prefix="/api/session", tags=["session"])
app.include_router(boss.router, prefix="/api/boss", tags=["boss"])
app.include_router(game_state.router, prefix="/api", tags=["game"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "GREQuest API"}
