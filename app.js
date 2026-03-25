const API_URL = "/api/departures";

function parseIsoToTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDelayMinutes(scheduled, predicted) {
  if (!scheduled || !predicted) return 0;

  const scheduledDate = new Date(scheduled);
  const predictedDate = new Date(predicted);

  if (
    Number.isNaN(scheduledDate.getTime()) ||
    Number.isNaN(predictedDate.getTime())
  ) {
    return 0;
  }

  return Math.max(0, Math.round((predictedDate - scheduledDate) / 60000));
}

function statusLabel(rawItem) {
  const delay = getDelayMinutes(
    rawItem?.departure_timestamp?.scheduled,
    rawItem?.departure_timestamp?.predicted ||
      rawItem?.departure_timestamp?.scheduled
  );

  if (delay === 0) return "ON TIME";
  return `+${delay}`;
}

function statusClass(rawItem) {
  const delay = getDelayMinutes(
    rawItem?.departure_timestamp?.scheduled,
    rawItem?.departure_timestamp?.predicted ||
      rawItem?.departure_timestamp?.scheduled
  );

  if (delay === 0) return "bg-emerald-500/20 text-emerald-300";
  if (delay <= 5) return "bg-amber-500/20 text-amber-300";
  return "bg-red-500/20 text-red-300";
}

function mapDeparture(item, index) {
  return {
    id:
      item?.id ||
      `${item?.route?.short_name || "spoj"}-${item?.trip?.headsign || index}`,
    line: item?.route?.short_name || "—",
    direction: item?.trip?.headsign || item?.stop?.name || "Neznámý směr",
    plannedTime: parseIsoToTime(item?.departure_timestamp?.scheduled),
    expectedTime: parseIsoToTime(
      item?.departure_timestamp?.predicted ||
        item?.departure_timestamp?.scheduled
    ),
    platform:
      item?.stop?.platform_code ||
      item?.platform_code ||
      item?.trip?.platform_code ||
      "—",
    raw: item,
  };
}

function BoardRow({ item }) {
  const delayed = item.plannedTime !== item.expectedTime;

  return (
    <div className="grid grid-cols-[140px_140px_140px_1fr_120px_150px] items-center gap-6 border-b border-slate-700 px-8 py-6">
      <div className="text-4xl font-bold tracking-wide text-white">
        {item.plannedTime}
      </div>

      <div
        className={
          delayed
            ? "text-4xl font-bold tracking-wide text-red-400"
            : "text-4xl font-bold tracking-wide text-slate-200"
        }
      >
        {item.expectedTime}
      </div>

      <div className="text-3xl font-bold text-cyan-300">
        {item.line}
      </div>

      <div className="truncate text-3xl font-semibold text-slate-100">
        {item.direction}
      </div>

      <div className="text-center text-3xl font-bold text-white">
        {item.platform}
      </div>

      <div className="text-right">
        <span
          className={`inline-block rounded-xl px-4 py-2 text-2xl font-bold ${statusClass(
            item.raw
          )}`}
        >
          {statusLabel(item.raw)}
        </span>
      </div>
    </div>
  );
}

function PrahaLibenDeparturesApp() {
  const [departures, setDepartures] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [lastUpdated, setLastUpdated] = React.useState(null);

  async function loadDepartures() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();

      const rows = Array.isArray(data?.departures)
        ? data.departures
        : Array.isArray(data)
        ? data
        : [];

      setDepartures(rows.map(mapDeparture));
      setLastUpdated(new Date());
    } catch (err) {
      setError(`Nepodařilo se načíst data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadDepartures();
    const intervalId = setInterval(loadDepartures, 30000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full">
        <div className="border-b border-slate-700 bg-slate-900 px-8 py-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white">
                PRAHA-LIBEŇ
              </h1>
              <p className="mt-2 text-xl font-medium uppercase tracking-[0.2em] text-slate-400">
                DEPARTURES
              </p>
            </div>

            {lastUpdated && (
              <div className="text-right text-xl text-slate-400">
                Aktualizace{" "}
                {lastUpdated.toLocaleTimeString("cs-CZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="px-8 py-10 text-3xl text-slate-300">
            Načítám odjezdy…
          </div>
        )}

        {!loading && error && (
          <div className="m-6 rounded-2xl bg-red-500/15 px-6 py-5 text-2xl text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && departures.length === 0 && (
          <div className="px-8 py-10 text-3xl text-slate-300">
            Momentálně nejsou k dispozici žádné odjezdy.
          </div>
        )}

        {!loading && !error && departures.length > 0 && (
          <div>
            <div className="grid grid-cols-[140px_140px_140px_1fr_120px_150px] gap-6 bg-slate-900 px-8 py-4 text-xl font-bold uppercase tracking-[0.15em] text-slate-400">
              <div>Odjezd</div>
              <div>Oček.</div>
              <div>Spoj</div>
              <div>Směr</div>
              <div className="text-center">Nást.</div>
              <div className="text-right">Stav</div>
            </div>

            {departures.map((item) => (
              <BoardRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PrahaLibenDeparturesApp />);
