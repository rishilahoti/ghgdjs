"""Forecast selection + accuracy metrics. Pure stdlib; MW throughout; error = forecast - actual."""
import json, math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA = Path(__file__).parent / "data"
CUTOFF_HOUR = 9  # UTC on D-1; EPEX/N2EX day-ahead gates close ~09:20/09:50 London (== UTC in Jan)


def ts(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def load(data=DATA):
    act = {ts(x["startTime"]): x["generation"] for x in json.load(open(data / "actuals.json"))}
    fc = defaultdict(list)  # hour -> [(publishTime, MW)] sorted by publishTime
    for x in json.load(open(data / "forecasts.json")):
        fc[ts(x["startTime"])].append((ts(x["publishTime"]), x["generation"]))
    for v in fc.values():
        v.sort()
    return act, fc


def day_rows(day, act, fc, cutoff_hour=CUTOFF_HOUR):
    """Hourly rows for delivery `day` (date) using the latest forecast published <= D-1 cutoff_hour:00 UTC."""
    d0 = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    cutoff = d0 - timedelta(days=1) + timedelta(hours=cutoff_hour)
    rows = []
    for h in range(24):
        t = d0 + timedelta(hours=h)
        usable = [p for p in fc.get(t, []) if p[0] <= cutoff]
        a = [act[t + timedelta(minutes=m)] for m in (0, 30) if t + timedelta(minutes=m) in act]
        if not usable:
            continue
        pub, f = usable[-1]
        rows.append({"hour": t.isoformat().replace("+00:00", "Z"), "forecast": f, "publishTime": pub.isoformat().replace("+00:00", "Z"),
                     "horizonH": (t - pub).total_seconds() / 3600,
                     "actual": sum(a) / len(a) if len(a) == 2 else None})  # ponytail: hour needs both half-hours
    return rows


def pct(xs, p):  # nearest-rank
    xs = sorted(xs)
    return xs[max(0, math.ceil(p / 100 * len(xs)) - 1)]


def metrics(rows):
    r = [x for x in rows if x["actual"] is not None]
    if not r:
        return None
    e = [x["forecast"] - x["actual"] for x in r]
    n, mean_act = len(e), sum(x["actual"] for x in r) / len(r)
    mae = sum(map(abs, e)) / n
    return {"n": n, "bias": sum(e) / n, "mae": mae, "rmse": math.sqrt(sum(v * v for v in e) / n),
            "mape_pct": 100 * mae / mean_act, "p95_abs": pct(list(map(abs, e)), 95),
            "p90_overforecast": max(0, pct(e, 90))}  # MW of wind that failed to show up, 90% of hours


def accuracy(days, act, fc, cutoff_hour=CUTOFF_HOUR):
    per_day = {d: day_rows(d, act, fc, cutoff_hour) for d in days}
    allrows = [x for v in per_day.values() for x in v]
    by_h = defaultdict(list)
    for x in allrows:
        by_h[int(x["horizonH"] // 12) * 12].append(x)
    return {"overall": metrics(allrows),
            "daily": [{"day": d.isoformat(), **(metrics(v) or {})} for d, v in per_day.items()],
            "by_horizon": [{"horizon": f"{k}-{k + 12}h", **metrics(v)} for k, v in sorted(by_h.items())]}


if __name__ == "__main__":  # self-check on a tiny fixture
    from datetime import date
    T = lambda s: ts(s + ":00Z")
    act = {T("2026-01-02T00:00"): 100, T("2026-01-02T00:30"): 120, T("2026-01-02T01:00"): 200, T("2026-01-02T01:30"): 200}
    fc = {T("2026-01-02T00:00"): [(T("2026-01-01T02:30"), 90), (T("2026-01-01T07:30"), 130), (T("2026-01-01T09:30"), 999)],
          T("2026-01-02T01:00"): [(T("2026-01-01T09:00"), 150)]}  # publish == cutoff is usable
    rows = day_rows(date(2026, 1, 2), act, fc)
    assert [x["forecast"] for x in rows] == [130, 150], rows  # 09:30 excluded, 07:30 beats 02:30
    assert rows[0]["actual"] == 110 and rows[0]["horizonH"] == 16.5
    m = metrics(rows)  # errors: +20, -50
    assert m["bias"] == -15 and m["mae"] == 35 and abs(m["rmse"] - math.sqrt(1450)) < 1e-9, m
    assert m["p90_overforecast"] == 20 and pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90) == 9
    assert metrics([{"forecast": 1, "actual": None}]) is None
    # real data: every Jan day has 24 usable hours
    a, f = load()
    jan = [date(2026, 1, i) for i in range(1, 32)]
    acc = accuracy(jan, a, f)
    assert acc["overall"]["n"] == 31 * 24, acc["overall"]
    print(json.dumps(acc["overall"], indent=1)); print(acc["by_horizon"])
    print("ok")
