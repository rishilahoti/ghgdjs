export const num = (v) => (v == null ? "–" : Math.round(v).toLocaleString("en-GB"));
export const signed = (v) => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-GB"));
export const gw = (v) => `${v / 1000} GW`;
export const utc = (iso) => iso.slice(0, 16).replace("T", " ") + " UTC";

export function Stat({ label, value, unit = "MW", hint, tone }) {
  return (
    <div className={`stat ${tone || ""}`}>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}<small>{unit}</small></b>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map(([c, t, kind]) => (
        <li key={t}><i className={kind || "line"} style={{ "--c": c }} />{t}</li>
      ))}
    </ul>
  );
}

export function CutoffSelect({ value, onChange }) {
  return (
    <label className="field">
      <span>Gate cutoff on D-1</span>
      <select value={value} onChange={(e) => onChange(+e.target.value)}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}:00 UTC{h === 9 ? " (default)" : ""}</option>
        ))}
      </select>
    </label>
  );
}
