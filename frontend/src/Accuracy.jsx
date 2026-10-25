import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Legend, Stat, gw, num, signed } from "./ui.jsx";

const C = { over: "#ff6b5e", under: "#62d2a2", mae: "#f5a524", bias: "#7cc4ff", rmse: "#8b98a8" };

function Tip({ active, payload, label, title }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <b>{title ? title(label) : label}</b>
      {payload.map((p) => (<div key={p.dataKey}><i style={{ "--c": p.color || p.fill }} />{p.name}<span>{signed(p.value)} MW</span></div>))}
    </div>
  );
}

export default function Accuracy({ cutoff }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    setErr(null);
    fetch(`/api/accuracy?cutoff_hour=${cutoff}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
      .then(setData)
      .catch((e) => { if (e.name !== "AbortError") { setData(null); setErr(e.message); } });
    return () => ac.abort();
  }, [cutoff]);

  if (err) return <p className="err" role="alert">Could not load accuracy ({err}).</p>;
  if (!data) return null;
  const o = data.overall;
  const daily = data.daily.filter((d) => d.n).map((d) => ({ ...d, label: d.day.slice(8) }));
  const buffer = (o.p90_overforecast / 1000).toFixed(1);

  return (
    <section>
      <div className="lede">
        <p className="eyebrow">What the January record says</p>
        <h2>Hold about <em>{buffer} GW</em> of cover beyond what the forecast promises.</h2>
        <p>
          At a {String(cutoff).padStart(2, "0")}:00 UTC cutoff, the forecast was too high by {num(o.p90_overforecast)} MW or less in 9 of 10 hours,
          and ran {num(Math.abs(o.bias))} MW {o.bias >= 0 ? "high" : "low"} on average. This describes January 2026; it is not a forward guarantee.
        </p>
      </div>

      <div className="stats five">
        <Stat label="Bias" value={signed(o.bias)} tone={o.bias > 0 ? "bad" : "ok"} hint="forecast − actual" />
        <Stat label="Mean abs error" value={num(o.mae)} hint={`${o.mape_pct.toFixed(1)}% of mean wind`} />
        <Stat label="RMSE" value={num(o.rmse)} />
        <Stat label="P95 abs error" value={num(o.p95_abs)} />
        <Stat label="Compared" value={o.n} unit="hours" />
      </div>

      <div className="panel">
        <h3>Daily error by delivery day</h3>
        <Legend items={[[C.over, "Bias, over-forecast", "box"], [C.under, "Bias, under-forecast", "box"], [C.mae, "Mean abs error"]]} />
        <div className="chart" role="img" aria-label="Daily bias and mean absolute error across January 2026">
          <ResponsiveContainer>
            <ComposedChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line)" }} />
              <YAxis tickFormatter={gw} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<Tip title={(l) => `${l} Jan`} />} cursor={{ fill: "rgba(255,255,255,.04)" }} isAnimationActive={false} />
              <ReferenceLine y={0} stroke="var(--muted)" />
              <Bar dataKey="bias" name="Bias" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                {daily.map((d) => <Cell key={d.day} fill={d.bias > 0 ? C.over : C.under} />)}
              </Bar>
              <Line dataKey="mae" name="Mean abs error" stroke={C.mae} strokeWidth={2} dot={{ r: 2.5, fill: C.mae, strokeWidth: 0 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h3>Does an older forecast do worse?</h3>
        <p className="sub">Error by how many hours before the target hour the forecast was made.</p>
        <Legend items={[[C.bias, "Bias", "box"], [C.mae, "Mean abs error", "box"], [C.rmse, "RMSE", "box"]]} />
        <div className="chart short" role="img" aria-label="Error by forecast age">
          <ResponsiveContainer>
            <BarChart data={data.by_horizon} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="horizon" tickLine={false} axisLine={{ stroke: "var(--line)" }} />
              <YAxis tickFormatter={gw} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,.04)" }} isAnimationActive={false} />
              <ReferenceLine y={0} stroke="var(--muted)" />
              <Bar dataKey="bias" name="Bias" fill={C.bias} isAnimationActive={false} radius={[2, 2, 0, 0]} />
              <Bar dataKey="mae" name="Mean abs error" fill={C.mae} isAnimationActive={false} radius={[2, 2, 0, 0]} />
              <Bar dataKey="rmse" name="RMSE" fill={C.rmse} isAnimationActive={false} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="hint">
        Reading the bias: part of the steady over-forecast may come from the forecast covering more wind capacity than the metered actuals.
        We cannot confirm that with these two Elexon datasets alone.
      </p>
    </section>
  );
}
