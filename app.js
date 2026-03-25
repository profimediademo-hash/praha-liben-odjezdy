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

  if (delay === 0) return "Včas";
  return `+${delay}`;
}

function statusClass(rawItem) {
  const delay = getDelayMinutes(
    rawItem?.departure_timestamp?.scheduled,
    rawItem?.departure_timestamp?.predicted ||
      rawItem?.departure_timestamp?.scheduled
  );

  if (delay === 0) return "bg-slate-100 text-slate-700";
  if (delay <= 5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
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

function CompactRow({ item }) {
  const delayed = item.plannedTime !== item.expectedTime;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[72px_72px_88px_1fr_64px_56px] items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm last:border-b-0">
        <div className="font-semibold text-slate-900">{item.plannedTime}</div>
        <div className={delayed ? "font-semibold text-red-700" : "text-slate-700"}>
          {item.expectedTime}
        </div>
        <div className="truncate font-medium text-slate-900">{item.line}</div>
        <div className="truncate text-slate-800">{item.direction}</div>
        <div className="text-center text-slate-600">{item.platform}</div>
        <div>
          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${statusClass(item.raw)}`}>
            {statusLabel(item.raw)}
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden border-b border-slate-200 px-3 py-3 last:border-b-0">
        <div className="flex justify-between">
          <div>
            <div className="text-lg font-bold">{item.plannedTime}</div>
            <div className={delayed ? "text-red-700 text-sm font-semibold" : "text-sm text-slate-600"}>
              Oček. {item.expectedTime}
            </div>
          </div>

          <div className="text-right">
            <div className="font-semibold">{item.line}</div>
            <div className="text-sm text-slate-500">Nást. {item.platform}</div>
          </div>
        </div>

        <div className="mt-2 text-sm">{item.direction}</div>

        <div className="mt-2 text-right">
          <span className={`inline-block rounded px-2 py-1 text-xs ${statusClass(item.raw)}`}>
            {statusLabel(item.raw)}
          </span>
        </div>
      </div>
    </>
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
      const response = await fetch(API_URL, {
        headers: {
          Accept: "application/json",
        },
      });

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
    <div className="min-h-screen bg-slate-100 p-3 md:p-4">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white shadow">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Praha-Libeň — odjezdy
              </h1>
              <p className="text-xs text-slate-500">PID / Golemio</p>
            </div>
            {lastUpdated && (
              <div className="text-xs text-slate-500">
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
          <div className="p-4 text-sm text-slate-600">Načítám odjezdy…</div>
        )}

        {!loading && error && (
          <div className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && departures.length === 0 && (
          <div className="p-4 text-sm text-slate-600">
            Momentálně nejsou k dispozici žádné odjezdy.
          </div>
        )}

        {!loading && !error && departures.length > 0 && (
          <div>
            <div className="grid grid-cols-[64px_64px_72px_1fr_56px_52px] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid-cols-[72px_72px_88px_1fr_64px_56px]">
              <div>Odj.</div>
              <div>Oček.</div>
              <div>Spoj</div>
              <div>Směr</div>
              <div className="text-center">Nást.</div>
              <div>Stav</div>
            </div>
            <div>
              {departures.map((item) => (
                <CompactRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PrahaLibenDeparturesApp />);
