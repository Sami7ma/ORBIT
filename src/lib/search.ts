import { CITIES, type City } from "./cities";
import { searchText } from "./time";

export const keyOf = (c: City) => `${c.name}|${c.tz}`;

// Every IANA zone the system knows (~400), so any zone name works even without a bundled city.
const ZONES: City[] = (() => {
  try {
    const all = (Intl as any).supportedValuesOf("timeZone") as string[];
    const seen = new Set(CITIES.map((c) => `${c.name.toLowerCase()}|${c.tz}`));
    return all
      .filter((tz) => tz.includes("/"))
      .map((tz) => {
        const parts = tz.split("/");
        return { name: parts[parts.length - 1].replace(/_/g, " "), country: parts[0].replace(/_/g, " "), tz, lat: NaN, lon: NaN };
      })
      .filter((c) => !seen.has(`${c.name.toLowerCase()}|${c.tz}`));
  } catch { return []; }
})();

let index: { c: City; s: string }[] | null = null;

export function searchLocal(query: string, limit = 40): City[] {
  if (!index) index = [...CITIES, ...ZONES].map((c) => ({ c, s: searchText(c.tz, c.name, c.country) }));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = index.filter(({ s }) => words.every((w) => s.includes(w)));
  // prefer names that start with the query
  const q = query.trim().toLowerCase();
  hits.sort((a, b) => Number(b.c.name.toLowerCase().startsWith(q)) - Number(a.c.name.toLowerCase().startsWith(q)));
  return hits.slice(0, limit).map((x) => x.c);
}

/** Any city on Earth (needs internet). Open-Meteo geocoding, no key. */
export async function searchOnline(q: string, signal?: AbortSignal): Promise<City[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
    { signal }
  );
  const j = await r.json();
  return (j.results ?? [])
    .filter((x: any) => x.timezone)
    .map((x: any) => ({
      name: x.name as string,
      country: [x.admin1, x.country].filter(Boolean).join(", "),
      tz: x.timezone as string,
      lat: x.latitude as number,
      lon: x.longitude as number,
    }));
}
