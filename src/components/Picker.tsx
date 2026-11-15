import { useEffect, useState } from "react";
import { localCity, type City } from "../lib/cities";
import { keyOf, searchLocal, searchOnline } from "../lib/search";
import { zoneLabel } from "../lib/time";

type Props = { cities: City[]; utc: boolean; onAdd: (c: City) => void; onRemove: (i: number) => void; onClose: () => void };

export default function Picker({ cities, utc, onAdd, onRemove, onClose }: Props) {
  const [q, setQ] = useState("");
  const [online, setOnline] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const taken = new Set(cities.map(keyOf));
  const query = q.trim();

  useEffect(() => {
    setOnline([]);
    if (query.length < 3) { setBusy(false); return; }
    const ctl = new AbortController();
    setBusy(true);
    const id = setTimeout(() => {
      searchOnline(query, ctl.signal).then(setOnline).catch(() => {}).finally(() => setBusy(false));
    }, 350);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [query]);

  const local = localCity();
  const showLocal = !cities.some((c) => c.name === "Local") && (!query || "local my time".includes(query.toLowerCase()));
  const base = searchLocal(query || "", query ? 40 : 30);
  const seen = new Set<string>();
  const hits = [...base, ...online].filter((c) => {
    const k = keyOf(c);
    if (taken.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <div className="picker" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="picker-top">
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="City, country or zone: “Lagos”, “Central”, “UTC+5:30”"
        />
        <button className="pill" onClick={onClose}>Done</button>
      </div>
      <div className="chips">
        {cities.map((c, i) => (
          <span className="chip" key={keyOf(c)}>
            {c.name}
            {cities.length > 1 && <button aria-label={`Remove ${c.name}`} onClick={() => onRemove(i)}>×</button>}
          </span>
        ))}
      </div>
      <div className="results">
        {showLocal && (
          <button className="result" onClick={() => onAdd(local)}>
            <span><b>My local time</b><small>{local.tz.replace(/_/g, " ")}</small></span>
            <small>{zoneLabel(local.tz, new Date(), utc)}</small>
          </button>
        )}
        {hits.map((c) => (
          <button key={keyOf(c)} className="result" onClick={() => onAdd(c)}>
            <span><b>{c.name}</b><small>{c.country}</small></span>
            <small>{zoneLabel(c.tz, new Date(), utc)}</small>
          </button>
        ))}
        {busy && <p className="empty">Searching worldwide…</p>}
        {!busy && hits.length === 0 && !showLocal && <p className="empty">No match yet. Try a bigger nearby city or a zone like “Pacific”.</p>}
      </div>
    </div>
  );
}
