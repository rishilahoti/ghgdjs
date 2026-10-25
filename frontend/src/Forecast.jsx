import { useEffect, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Legend, Stat, gw, num, signed, utc } from "./ui.jsx";

const MIN = "2026-01-01", MAX = "2026-01-31";
const shift = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const long = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const C = { fc: "#7cc4ff", act: "#f5a524", over: "#ff6b5e", under: "#62d2a2" };

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const e = r.actual == null ? null : r.forecast - r.actual;
  return (
    <div className="tip">
      <b>{r.label} UTC</b>
      <div><i style={{ "--c": C.fc }} />Forecast <span>{num(r.forecast)} MW</span></div>
      <div><i style={{ "--c": C.act }} />Actual <span>{num(r.actual)} MW</span></div>
      {e != null && <div className={e > 0 ? "bad" : "ok"}>{e > 0 ? "Over-forecast" : "Under-forecast"} <span>{signed(e)} MW</span></div>}
      <small>forecast made {r.horizonH.toFixed(1)} h ahead</small>
    </div>
  );
}

export default function Forecast({ cutoff }) {
  const [day, setDay] = useState("2026-01-15");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setBusy(true); setErr(null);
    fetch(`/api/forecast?day=${day}&cutoff_hour=${cutoff}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
      .then((d) => { setData(d); setBusy(false); })
      .catch((e) => { if (e.name !== "AbortError") { setData(null); setErr(e.message); setBusy(false); } });
    return () => ac.abort();
  }, [day, cutoff]);

  // keyboard: left/right = previous/next day (no animation: this is a high-frequency action)
  useEffect(() => {
    const k = (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const n = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      if (n) setDay((d) => { const x = shift(d, n); return x < MIN || x > MAX ? d : x; });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const rows = data?.rows.map((r) => ({
    ...r,
    label: r.hour.slice(11, 16),
    over: r.actual != null && r.forecast > r.actual ? [r.actual, r.forecast] : null,
    under: r.actual != null && r.forecast <= r.actual ? [r.forecast, r.actual] : null,
  }));
  const vintages = data ? new Set(data.rows.map((r) => r.publishTime)).size : 0;
  const cutoffAt = new Date(Date.parse(day + "T00:00:00Z") - 864e5 + cutoff * 36e5);
  const age = data ? (cutoffAt - Date.parse(data.latest_publish)) / 36e5 : 0;
  const m = data?.metrics;

  return (
    <section aria-busy={busy} className={busy ? "busy" : ""}>
      <div className="daybar">
        <button className="step" aria-label="Previous day" disabled={day <= MIN} onClick={() => setDay(shift(day, -1))}>←</button>
        <div className="daytitle">
          <h2>{long(day)}</h2>
          <input type="date" aria-label="Delivery day" min={MIN} max={MAX} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </div>
        <button className="step" aria-label="Next day" disabled={day >= MAX} onClick={() => setDay(shift(day, 1))}>→</button>
      </div>

      {err && <p className="err" role="alert">Could not load forecast ({err}).</p>}
      {data && (
        <>
          <p className="decision">
            Bidding at <b>{String(cutoff).padStart(2, "0")}:00 UTC</b> on the day before, the freshest forecast you could see was published
            <b> {utc(data.latest_publish)}</b>, {age.toFixed(1)} h before the gate
            {vintages > 1 && <> ({vintages} forecast runs feed this day)</>}.
          </p>

          <div className="stats">
            <Stat label="Bias" value={signed(m?.bias)} tone={m?.bias > 0 ? "bad" : "ok"} hint={m?.bias > 0 ? "forecast above actual" : "forecast below actual"} />
            <Stat label="Mean abs error" value={num(m?.mae)} />
            <Stat label="RMSE" value={num(m?.rmse)} />
            <Stat label="Compared" value={m?.n ?? "–"} unit="hours" />
          </div>

          <div className="panel">
            <Legend items={[[C.fc, "Forecast"], [C.act, "Actual"], [C.over, "Over-forecast gap (risk of under-buying)", "box"], [C.under, "Under-forecast gap", "box"]]} />
            <div className="chart" role="img" aria-label={`Hourly forecast versus actual wind for ${day}; bias ${signed(m?.bias)} MW`}>
              <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" interval={2} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
                  <YAxis tickFormatter={gw} tickLine={false} axisLine={false} width={56} domain={[0, "auto"]} />
                  <Tooltip content={<Tip />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} isAnimationActive={false} />
                  <Area dataKey="over" stroke="none" fill={C.over} fillOpacity={0.35} isAnimationActive={false} activeDot={false} />
                  <Area dataKey="under" stroke="none" fill={C.under} fillOpacity={0.3} isAnimationActive={false} activeDot={false} />
                  <Line dataKey="forecast" stroke={C.fc} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line dataKey="actual" stroke={C.act} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="hint">Tip: use the ← → keys to step through days.</p>
        </>
      )}
    </section>
  );
}
