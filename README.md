# Ninja: Last Stand

A full-stack 2D arena fighter with movement, jumps, quick and heavy sword attacks, guard, dash, enemy telegraphs, and a FastAPI leaderboard backed by SQLite.

## Run locally

From this directory, install the Python dependencies and start the server:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8003
```

Open <http://127.0.0.1:8003/> to play. The FastAPI docs are at <http://127.0.0.1:8003/docs>.

## Deploy to Render

This game needs a Python web server for its API. GitHub Pages can host static files but cannot run FastAPI. The included `render.yaml` configures the app as a Render web service and uses `/api/health` for its health check.

1. Push this project to your GitHub repository.
2. Sign in to Render and create a **Blueprint** from that repository.
3. Render reads `render.yaml` and deploys the service. Open the service URL shown in the Render dashboard to play; add `/docs` to view the API documentation.

The free service stores leaderboard data in its local SQLite file, which may be reset when the service restarts or redeploys.

## Play

Choose a fighter name and select **Enter the Dojo**. Move with **A/D** or the arrow keys. Jump with **W/Up**, guard with **L**, dash with **Shift**, use a quick strike with **J/Space**, and a heavy strike with **K**. On-screen controls support touch play. Ronins are fast, Brutes are durable, and Wisps must be hit while airborne. Read the red attack telegraph and guard, dash, or jump to evade. Defeat each challenger to advance; your run score is submitted to the leaderboard when your health reaches zero.

Scores are stored in `scores.sqlite3` next to `app.py`. To use another SQLite file, set `NINJA_GAME_DB` before starting the server.
