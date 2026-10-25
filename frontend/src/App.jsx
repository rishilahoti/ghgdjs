import Forecast from './Forecast.jsx';

export default function App() {
	return (
		<main>
			<h1>GB wind – day-ahead forecast</h1>
			<p className="sub">
				Latest forecast available before the day-ahead gate vs. actual
				metered wind (Elexon, January 2026)
			</p>
			<Forecast />
		</main>
	);
}
