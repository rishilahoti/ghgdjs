import { useEffect, useState } from 'react';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

const hhmm = (iso) => iso.slice(11, 16);
const MW = (v) => (v == null ? '–' : `${Math.round(v).toLocaleString()} MW`);

export default function Forecast() {
	const [day, setDay] = useState('2026-01-15');
	const [cutoff, setCutoff] = useState(9);
	const [data, setData] = useState(null);
	const [err, setErr] = useState(null);

	useEffect(() => {
		if (!day) return;
		setErr(null);
		fetch(`/api/forecast?day=${day}&cutoff_hour=${cutoff}`)
			.then((r) =>
				r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`)),
			)
			.then(setData)
			.catch((e) => {
				setData(null);
				setErr(e.message);
			});
	}, [day, cutoff]);

	const rows = data?.rows.map((r) => ({ ...r, label: hhmm(r.hour) }));
	const vintages = data
		? [...new Set(data.rows.map((r) => r.publishTime))].sort()
		: [];
	const cutoffAt = new Date(
		Date.parse(day + 'T00:00:00Z') - 864e5 + cutoff * 36e5,
	);
	const ageH = data
		? ((cutoffAt - Date.parse(data.latest_publish)) / 36e5).toFixed(1)
		: null;
	const m = data?.metrics;

	return (
		<>
			<div className="card controls">
				<label>
					Delivery day (Jan 2026)
					<input
						type="date"
						min="2026-01-01"
						max="2026-01-31"
						value={day}
						onChange={(e) => setDay(e.target.value)}
					/>
				</label>
				<label>
					Decision cutoff, D-1 (UTC hour)
					<input
						type="number"
						min="0"
						max="23"
						value={cutoff}
						onChange={(e) =>
							setCutoff(
								Math.min(23, Math.max(0, +e.target.value || 0)),
							)
						}
					/>
				</label>
			</div>
			{err && <p className="err">Could not load forecast: {err}</p>}
			{data && (
				<>
					<div className="card">
						<span className="badge">
							Latest forecast published{' '}
							{data.latest_publish.slice(0, 16).replace('T', ' ')}{' '}
							UTC
						</span>
						<span className="badge">
							{ageH} h before cutoff{' '}
							{cutoffAt
								.toISOString()
								.slice(0, 16)
								.replace('T', ' ')}{' '}
							UTC
						</span>
						<span className="badge">
							{vintages.length} forecast vintage
							{vintages.length > 1 ? 's' : ''} used across the day
						</span>
						<div className="kpis">
							<div className="kpi">
								<b>{MW(m?.bias)}</b>
								<span>Bias (forecast − actual)</span>
							</div>
							<div className="kpi">
								<b>{MW(m?.mae)}</b>
								<span>MAE</span>
							</div>
							<div className="kpi">
								<b>{MW(m?.rmse)}</b>
								<span>RMSE</span>
							</div>
							<div className="kpi">
								<b>{m ? `${m.n} h` : '–'}</b>
								<span>Hours compared</span>
							</div>
						</div>
					</div>
					<div className="card" style={{ height: 380 }}>
						<ResponsiveContainer>
							<LineChart
								data={rows}
								margin={{
									top: 8,
									right: 16,
									bottom: 8,
									left: 8,
								}}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="label" interval={1} />
								<YAxis
									tickFormatter={(v) => `${v / 1000} GW`}
								/>
								<Tooltip formatter={(v) => MW(v)} />
								<Legend />
								<Line
									type="stepAfter"
									dataKey="forecast"
									name="Forecast"
									stroke="#1a4fb4"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="monotone"
									dataKey="actual"
									name="Actual"
									stroke="#d9480f"
									strokeWidth={2}
									dot={false}
									connectNulls={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</>
			)}
		</>
	);
}
