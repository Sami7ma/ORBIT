import { canonicalTimezone, coordinates, makeCity, normalizeText, validTimezone } from "../domain/city.ts";
import { CITIES, type City } from "./cities.ts";
import { searchText } from "./time.ts";

export const keyOf = (city: City) => city.id;

const ZONES: City[] = (() => {
  const zones: City[] = [makeCity("UTC", "Coordinated Universal Time", "UTC")];
  try {
    const all = (Intl as typeof Intl & { supportedValuesOf(key: string): string[] }).supportedValuesOf("timeZone");
    const known = new Set(CITIES.map((city) => `${normalizeText(city.name)}|${canonicalTimezone(city.tz)}`));
    for (const tz of all) {
      const parts = tz.split("/");
      const name = parts[parts.length - 1].replace(/_/g, " ");
      if (!known.has(`${normalizeText(name)}|${canonicalTimezone(tz)}`)) zones.push(makeCity(name, parts[0], tz));
    }
  } catch { /* Older webviews still have the bundled cities and UTC. */ }
  return zones;
})();

let index: { hour: number; entries: { city: City; text: string }[] } | undefined;

export function searchLocal(query: string, limit = 40, now = new Date()): City[] {
  const hour = Math.floor(now.getTime() / 3_600_000);
  if (index?.hour !== hour) index = {
    hour, entries: [...CITIES, ...ZONES].map((city) => ({ city, text: normalizeText(searchText(city.tz, city.name, city.country, now)) })),
  };
  const q = normalizeText(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  return index.entries.filter(({ text }) => words.every((word) => text.includes(word)))
    .sort((a, b) => Number(normalizeText(b.city.name).startsWith(q)) - Number(normalizeText(a.city.name).startsWith(q)))
    .slice(0, limit).map(({ city }) => city);
}

export function parseSearchResults(raw: unknown): City[] {
  if (!raw || typeof raw !== "object") throw new Error("Invalid search response");
  const results = (raw as { results?: unknown }).results;
  if (results === undefined) return [];
  if (!Array.isArray(results)) throw new Error("Invalid search results");
  const cities: City[] = [];
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const value = result as Record<string, unknown>;
    const position = coordinates(value.latitude, value.longitude);
    if (typeof value.name !== "string" || !value.name.trim() || !validTimezone(value.timezone) || !position) continue;
    const country = [value.admin1, value.country].filter((part): part is string => typeof part === "string" && !!part).join(", ");
    cities.push(makeCity(value.name, country, value.timezone, position.lat, position.lon));
  }
  return cities;
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<City[]> {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`, { signal });
  if (!response.ok) throw new Error(`City search failed (${response.status})`);
  return parseSearchResults(await response.json());
}
