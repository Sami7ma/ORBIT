import { useEffect, useState } from "react";
import { coordinates } from "../domain/city.ts";
import { localCity, type City } from "../lib/cities";
import { keyOf, searchLocal, searchOnline } from "../lib/search";
import { zoneLabel } from "../lib/time";

type Props = {
  cities: City[]; utc: boolean; weatherLocation: boolean;
  onAdd: (city: City) => void; onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void; onClose: () => void;
};

export default function Picker({ cities, utc, weatherLocation, onAdd, onRemove, onMove, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const taken = new Set(weatherLocation ? [] : cities.map(keyOf));
  const q = query.trim();
  useEffect(() => {
    let active = true;
    setOnline([]); setFailed(false);
    if (q.length < 3) { setBusy(false); return; }
    const controller = new AbortController();
    setBusy(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const id = setTimeout(() => {
      timeout = setTimeout(() => controller.abort(), 12_000);
      searchOnline(q, controller.signal).then((results) => { if (active) setOnline(results); })
        .catch(() => { if (active) setFailed(true); })
        .finally(() => { clearTimeout(timeout); if (active) setBusy(false); });
    }, 350);
    return () => { active = false; clearTimeout(id); clearTimeout(timeout); controller.abort(); };
  }, [q]);

  const local = localCity();
  const showLocal = !weatherLocation && !cities.some((city) => city.kind === "local") && (!q || "local my time".includes(q.toLowerCase()));
  const base = searchLocal(q, q ? 40 : 30);
  const seen = new Set<string>();
  const hits = [...base, ...online].filter((city) => {
    if (weatherLocation && !coordinates(city.lat, city.lon)) return false;
    const key = keyOf(city);
    if (taken.has(key) || seen.has(key)) return false;
    seen.add(key); return true;
  });

  return (
    <section className="picker" aria-label={weatherLocation ? "Choose Local weather location" : "Manage cities"} onKeyDown={(event) => event.key === "Escape" && onClose()}>
      <div className="picker-top">
        <input autoFocus aria-label="Search cities, countries, or timezones" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="City, country or zone: Lagos, Central, UTC+5:30" />
        <button className="pill" onClick={onClose}>Done</button>
      </div>
      {weatherLocation ? <p className="picker-hint">Choose where Local gets its weather. Your clock will keep following your device timezone.</p> :
        <div className="chips" aria-label="Selected cities">
          {cities.map((city, index) => <span className="chip" key={city.id}>
            <span title={[city.name, city.country].filter(Boolean).join(", ")}>{city.name}</span>
            <button disabled={index === 0} aria-label={`Move ${city.name} earlier`} onClick={() => onMove(index, -1)}>←</button>
            <button disabled={index === cities.length - 1} aria-label={`Move ${city.name} later`} onClick={() => onMove(index, 1)}>→</button>
            {cities.length > 1 && <button aria-label={`Remove ${city.name}`} onClick={() => onRemove(index)}>×</button>}
          </span>)}
        </div>}
      <div className="results" aria-busy={busy}>
        {showLocal && <button className="result" onClick={() => onAdd(local)}>
          <span><b>My local time</b><small>{local.tz.replace(/_/g, " ")}</small></span>
          <small>{zoneLabel(local.tz, new Date(), utc)}</small>
        </button>}
        {hits.map((city) => <button key={city.id} className="result" onClick={() => onAdd(city)}>
          <span><b>{city.name}</b><small>{city.country}{city.kind === "timezone" ? " · Time only" : ""}</small></span>
          <small>{zoneLabel(city.tz, new Date(), utc)}</small>
        </button>)}
        {busy && <p className="empty" role="status">Searching worldwide…</p>}
        {failed && <p className="empty" role="status">Worldwide search is unavailable. Offline results are still shown.</p>}
        {!busy && hits.length === 0 && !showLocal && <p className="empty">No matching place. Try another city or country.</p>}
      </div>
    </section>
  );
}
