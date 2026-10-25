import { useState } from "react";
import Accuracy from "./Accuracy.jsx";
import Forecast from "./Forecast.jsx";
import { CutoffSelect } from "./ui.jsx";

const TABS = [["forecast", "Day view"], ["accuracy", "Accuracy"]];

export default function App() {
  const [tab, setTab] = useState(location.hash === "#accuracy" ? "accuracy" : "forecast");
  const [cutoff, setCutoff] = useState(9);
  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>Wind<em>/</em>Day-Ahead</h1>
          <p>GB national wind · Elexon · January 2026</p>
        </div>
        <div role="tablist" className="tabs" aria-label="View">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <CutoffSelect value={cutoff} onChange={setCutoff} />
      </header>
      <main key={tab} className="view">
        {tab === "forecast" ? <Forecast cutoff={cutoff} /> : <Accuracy cutoff={cutoff} />}
      </main>
    </>
  );
}
