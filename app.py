from contextlib import asynccontextmanager, closing
import os
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


PROJECT_DIR = Path(__file__).resolve().parent
WEB_DIR = PROJECT_DIR / "web"
PORTFOLIO_DIR = next(
    (
        parent
        for parent in PROJECT_DIR.parents
        if parent.name.casefold() == "frontend" and (parent / "index.html").is_file()
    ),
    None,
)
DATABASE_PATH = Path(os.getenv("NINJA_GAME_DB", str(PROJECT_DIR / "scores.sqlite3")))


def connect_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect_database()) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL CHECK (score >= 0),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Ninja Last Stand", version="1.0.0", lifespan=lifespan)


class ScoreSubmission(BaseModel):
    name: str = Field(min_length=1, max_length=24)
    score: int = Field(ge=0, le=1_000_000_000)


class ScoreEntry(BaseModel):
    name: str
    score: int
    created_at: str


@app.get("/", include_in_schema=False)
def game_home() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/leaderboard", response_model=list[ScoreEntry])
def get_leaderboard() -> list[dict[str, object]]:
    with closing(connect_database()) as connection:
        rows = connection.execute(
            "SELECT name, score, created_at FROM scores ORDER BY score DESC, id ASC LIMIT 10"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/scores", response_model=ScoreEntry, status_code=201)
def save_score(submission: ScoreSubmission) -> dict[str, object]:
    name = submission.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be blank")

    with closing(connect_database()) as connection:
        cursor = connection.execute(
            "INSERT INTO scores (name, score) VALUES (?, ?)",
            (name, submission.score),
        )
        connection.commit()
        row = connection.execute(
            "SELECT name, score, created_at FROM scores WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return dict(row)


app.mount("/static", StaticFiles(directory=WEB_DIR), name="game-static")
if PORTFOLIO_DIR is not None:
    app.mount(
        "/portfolio/projects/ninja-sword-game",
        StaticFiles(directory=WEB_DIR, html=True),
        name="portfolio-game",
    )
    app.mount("/portfolio", StaticFiles(directory=PORTFOLIO_DIR, html=True), name="portfolio")
