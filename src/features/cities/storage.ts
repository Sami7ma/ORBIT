import { parseCity, type City } from "../../domain/city.ts";
import { defaultCities } from "../../lib/cities.ts";
import { preserveBackup, type StorageWriter } from "../../platform/storage.ts";
export { resetOrbitStorage } from "../../platform/storage.ts";

export const CITIES_KEY = "orbit.cities.v3";
export const LEGACY_CITIES_KEY = "orbit.cities.v2";
export type CityStorage = StorageWriter;
export type CityLoad = { cities: City[]; notice: string | null; writable: boolean; backup?: { key: string; raw: string } };

export function loadCities(storage: CityStorage, homeTz: string): CityLoad {
  let raw: string | null;
  let legacy = false;
  try {
    raw = storage.getItem(CITIES_KEY);
    if (raw === null) { raw = storage.getItem(LEGACY_CITIES_KEY); legacy = true; }
  } catch {
    return { cities: defaultCities(homeTz), notice: "Saved cities are unavailable. Changes will stay in this session.", writable: false };
  }
  if (raw === null) return { cities: defaultCities(homeTz), notice: null, writable: true };
  const backup = { key: `${legacy ? LEGACY_CITIES_KEY : CITIES_KEY}.backup`, raw };
  try {
    const saved: unknown = JSON.parse(raw);
    if (!legacy && saved && typeof saved === "object" && "version" in saved && (saved as { version: unknown }).version !== 3) {
      return { cities: defaultCities(homeTz), notice: "These cities were saved by another version of ORBIT. Your saved data is preserved; changes here are temporary.", writable: false };
    }
    const entries = legacy ? saved : (saved as { cities?: unknown } | null)?.cities;
    if (!Array.isArray(entries)) throw new Error("Invalid city list");
    const seen = new Set<string>();
    const cities: City[] = [];
    for (const entry of entries) {
      const city = parseCity(entry, homeTz, legacy);
      if (city && !seen.has(city.id)) { seen.add(city.id); cities.push(city); }
    }
    const repaired = cities.length !== entries.length || cities.length === 0;
    return {
      cities: cities.length ? cities : defaultCities(homeTz), writable: true, backup: legacy || repaired ? backup : undefined,
      notice: repaired ? "Your valid cities were kept. Damaged or duplicate entries were repaired; a backup is preserved."
        : legacy && cities.some((city) => city.kind === "local") ? "Your cities were restored. Choose a weather location for Local time when you need it." : null,
    };
  } catch {
    return { cities: defaultCities(homeTz), writable: true, backup, notice: "The saved city list could not be read. Defaults were restored and the original data will be backed up." };
  }
}

/** Back up before writing the replacement; storage failure never destroys the original. */
export function saveCities(storage: CityStorage, cities: City[], backup?: CityLoad["backup"]): void {
  if (backup) preserveBackup(storage, backup.key, backup.raw);
  storage.setItem(CITIES_KEY, JSON.stringify({ version: 3, cities }));
}
