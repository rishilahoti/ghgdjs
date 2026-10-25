"""Snapshot Jan-2026 wind actuals + forecasts from Elexon into backend/data/*.json."""
import json, re, urllib.request
from pathlib import Path

B = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
OUT = Path(__file__).parent / "data"
ACT = f"{B}/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31&fuelType=WIND"
# forecasts for Jan targets are published from ~2 days before D-1 up to Jan 31
FOR = f"{B}/WINDFOR/stream?publishDateTimeFrom=2025-12-20T00:00:00Z&publishDateTimeTo=2026-02-01T00:00:00Z"


def iso(t):  # Elexon emits unpadded minutes/seconds, e.g. 23:0:00Z
    return re.sub(r"T(\d+):(\d+):(\d+)Z", lambda m: "T%02d:%02d:%02dZ" % tuple(map(int, m.groups())), t)


def get(url, keys):
    with urllib.request.urlopen(url, timeout=60) as r:
        rows = json.load(r)
    out = [{"startTime": iso(x["startTime"]), "generation": x["generation"],
            **({"publishTime": iso(x["publishTime"])} if "publishTime" in keys else {})} for x in rows]
    return sorted(out, key=lambda x: (x["startTime"], x.get("publishTime", "")))


if __name__ == "__main__":
    a, f = get(ACT, []), get(FOR, ["publishTime"])
    # self-check
    assert len(a) == 31 * 48 and len({x["startTime"] for x in a}) == len(a), len(a)
    assert all(isinstance(x["generation"], (int, float)) for x in a + f)
    assert len({(x["startTime"], x["publishTime"]) for x in f}) == len(f)
    assert a[0]["startTime"] == "2026-01-01T00:00:00Z" and a[-1]["startTime"] == "2026-01-31T23:30:00Z"
    (OUT / "actuals.json").write_text(json.dumps(a, separators=(",", ":")))
    (OUT / "forecasts.json").write_text(json.dumps(f, separators=(",", ":")))
    print(len(a), "actuals;", len(f), "forecasts;", f[0]["startTime"], "->", f[-1]["startTime"])
