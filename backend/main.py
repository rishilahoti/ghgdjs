from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

import core

app = FastAPI(title="Wind forecast accuracy")
ACT, FC = core.load()
JAN = [date(2026, 1, 1) + timedelta(days=i) for i in range(31)]


@app.get("/api/forecast")
def forecast(day: date, cutoff_hour: int = Query(core.CUTOFF_HOUR, ge=0, le=23)):
    """Hourly forecast (latest published before the D-1 cutoff) vs actual for one delivery day."""
    if day not in JAN:
        raise HTTPException(422, "day must be in January 2026")
    rows = core.day_rows(day, ACT, FC, cutoff_hour)
    return {"day": day, "cutoff_hour": cutoff_hour, "rows": rows,
            "latest_publish": max(r["publishTime"] for r in rows), "metrics": core.metrics(rows)}


@app.get("/api/accuracy")
def accuracy(cutoff_hour: int = Query(core.CUTOFF_HOUR, ge=0, le=23)):
    """Overall, per-day and per-horizon error metrics for all January delivery days."""
    return {"cutoff_hour": cutoff_hour, **core.accuracy(JAN, ACT, FC, cutoff_hour)}

# Docker image ships the built React app next to this file; mounted last so /api/* wins.
STATIC = Path(__file__).parent / "static"
if STATIC.is_dir():
    app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
