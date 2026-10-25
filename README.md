# GB wind day-ahead forecast viewer

_Made using Claude Code._

Helps a day-ahead power buyer (a) see the **latest wind forecast available before the day-ahead gate** and (b) quantify **how wrong those forecasts have been**, so a safety buffer can be sized. Scope: national wind, Elexon `FUELHH` (actuals) and `WINDFOR` (forecasts) only, delivery days **1–31 January 2026**.

## How it works
- For delivery day D, the forecast used per hour is the latest `publishTime` at or before **D-1 09:00 UTC** (adjustable in the UI; GB gates close ~09:20–09:50 London time, = UTC in January).
- `WINDFOR` is hourly, `FUELHH` half-hourly: actual hour = mean of its two half-hours.
- Error = forecast − actual (positive = wind over-forecast = risk of under-buying). Metrics: bias, MAE, RMSE, MAPE, P95 abs error, P90 over-forecast.
- Data is a static snapshot in `backend/data/`; the app makes no live Elexon calls.

## Files
| Path | Purpose |
|---|---|
| `backend/fetch.py` | Downloads Jan 2026 data from Elexon into `backend/data/*.json` (optional re-run) |
| `backend/data/` | `actuals.json`, `forecasts.json` snapshot |
| `backend/core.py` | Forecast selection + metrics (stdlib only). `python core.py` runs a self-check |
| `backend/main.py` | FastAPI: `GET /api/forecast?day=&cutoff_hour=`, `GET /api/accuracy?cutoff_hour=`; serves built UI if `backend/static/` exists |
| `backend/test_api.py` | API checks (`python test_api.py`) |
| `frontend/` | React + Vite + Recharts UI (`src/Forecast.jsx`, `src/Accuracy.jsx`) |
| `Dockerfile` | Multi-stage build: React build → Python image serving API + UI on :8000 |
| `api/index.py`, `vercel.json`, `requirements.txt` | Vercel deployment (static UI + Python function) |
| `docs/` | `research.md` (domain + API findings), `plan.md` (implementation plan) |
| `decisions.md` | Log of every design decision and why |

## Run
**Docker** (needs Docker Desktop running):
```bash
docker build -t wind-forecast .
docker run -p 8000:8000 wind-forecast   # http://localhost:8000
```
**Local dev** (two terminals):
```bash
cd backend && pip install -r requirements.txt && python -m uvicorn main:app --port 8000
cd frontend && npm install && npm run dev                     # http://localhost:5173 (proxies /api to :8000)
```

## Deploy to Vercel
1. Push this repo to GitHub.
2. vercel.com → Add New → Project → import the repo. Leave Framework Preset as "Other"; `vercel.json` supplies build command, output dir and the Python function. No env vars needed.
3. Deploy, then check `https://<app>.vercel.app/api/accuracy` returns JSON and the UI loads.

## Known limits
- January 2026 only; historical, not live.
- Forecast bias (~+1.9 GW) may partly reflect forecast vs metered wind coverage differences (not verified with only these two datasets).
- Hours without a usable forecast or both half-hour actuals are excluded (`n` shown).
