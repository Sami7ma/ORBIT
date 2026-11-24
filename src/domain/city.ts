export type City = {
  id: string;
  kind: "local" | "place" | "timezone";
  name: string;
  country: string;
  tz: string;
  lat: number | null;
  lon: number | null;
  weatherLocation?: string;
};

export const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export function canonicalTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en", { timeZone: tz }).resolvedOptions().timeZone;
}

export function coordinates(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  return typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lon === "number" && Number.isFinite(lon) && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

export function makeCity(name: string, country: string, tz: string, lat: number | null = null, lon: number | null = null): City {
  const position = coordinates(lat, lon);
  const zone = canonicalTimezone(tz);
  return {
    id: position ? `place:${normalizeText(name.trim())}|${zone}|${position.lat.toFixed(2)}|${position.lon.toFixed(2)}` : `zone:${zone}`,
    kind: position ? "place" : "timezone", name: name.trim(), country, tz,
    lat: position?.lat ?? null, lon: position?.lon ?? null,
  };
}

export function makeLocal(tz: string): City {
  return { id: "local", kind: "local", name: "Local", country: "", tz, lat: null, lon: null };
}

export function withLocalWeather(local: City, place: City): City {
  if (!coordinates(place.lat, place.lon)) return local;
  return { ...local, lat: place.lat, lon: place.lon, weatherLocation: [place.name, place.country].filter(Boolean).join(", ") };
}

/** Validate entries independently. Legacy Local coordinates were guessed and must be selected again. */
export function parseCity(raw: unknown, homeTz: string, legacy = false): City | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const isLocal = value.kind === "local" || (legacy && value.name === "Local");
  if (isLocal) {
    const local = makeLocal(homeTz);
    if (!legacy && typeof value.weatherLocation === "string" && value.weatherLocation.trim() && coordinates(value.lat, value.lon)) {
      return { ...local, lat: value.lat as number, lon: value.lon as number, weatherLocation: value.weatherLocation };
    }
    return local;
  }
  if (typeof value.name !== "string" || !value.name.trim() || !validTimezone(value.tz)) return null;
  const position = coordinates(value.lat, value.lon);
  return makeCity(value.name, typeof value.country === "string" ? value.country : "", value.tz, position?.lat, position?.lon);
}
