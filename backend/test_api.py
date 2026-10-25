from fastapi.testclient import TestClient

from main import app

c = TestClient(app)

if __name__ == "__main__":
    r = c.get("/api/forecast", params={"day": "2026-01-15"}).json()
    assert len(r["rows"]) == 24 and r["latest_publish"] <= "2026-01-14T09:00:00Z", r["latest_publish"]
    assert c.get("/api/forecast", params={"day": "2026-02-01"}).status_code == 422
    assert c.get("/api/forecast", params={"day": "2026-01-15", "cutoff_hour": 24}).status_code == 422
    assert c.get("/api/forecast").status_code == 422
    r = c.get("/api/forecast", params={"day": "2026-01-01"}).json()  # D-1 is Dec 31: data must exist
    assert len(r["rows"]) == 24
    a = c.get("/api/accuracy").json()
    assert len(a["daily"]) == 31 and a["overall"]["n"] == 744 and a["by_horizon"]
    early = c.get("/api/accuracy", params={"cutoff_hour": 0}).json()["overall"]
    assert early["n"] < 744 and early["mae"] != a["overall"]["mae"]  # earlier cutoff: older forecasts, some hours have none
    print("ok")
