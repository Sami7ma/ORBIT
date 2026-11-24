import { coordinates, type City } from "../../domain/city.ts";

export type Kind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";
export type TemperatureUnit = "celsius" | "fahrenheit";
export type Hour = { time: number; temp: number | null; kind: Kind | null; night: boolean };
export type Weather = {
  temp: number | null; kind: Kind | null; night: boolean; hours: Hour[];
  observedAt: number; fetchedAt: number; unit: TemperatureUnit;
};
export type WeatherState = { status: "loading" | "ready" | "unavailable" | "error"; data?: Weather; refreshing?: boolean };
export const WEATHER_REFRESH_MS = 15 * 60_000;
export const WEATHER_STALE_MS = 30 * 60_000;

export function kindOf(code: unknown): Kind | null {
  if (typeof code !== "number" || !Number.isInteger(code) || code < 0) return null;
  if (code <= 1) return "clear";
  if (code <= 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) ? "rain" : null;
}

export const LABEL: Record<Kind, string> = {
  clear: "Clear", cloud: "Cloudy", fog: "Foggy", rain: "Rain", snow: "Snow", storm: "Thunderstorm",
};
export function glyph(kind: Kind, night: boolean): string {
  return kind === "clear" ? night ? "🌙" : "☀️" : { cloud: "☁️", fog: "🌫️", rain: "🌧️", snow: "❄️", storm: "⛈️" }[kind];
}
export function temperature(value: number | null, unit: TemperatureUnit): string {
  return `${value === null ? "—" : Math.round(value)}°${unit === "fahrenheit" ? "F" : "C"}`;
}
export function weatherIsStale(weather: Weather, now = Date.now()): boolean {
  return now - Math.min(weather.fetchedAt, weather.observedAt * 1000) >= WEATHER_STALE_MS;
}

const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const timestamp = (value: unknown): value is number => numeric(value) && value > 0 && Number.isFinite(new Date(value * 1000).getTime());
const temp = (value: unknown) => numeric(value) ? Math.round(value) : null;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid weather response");
  return value as Record<string, unknown>;
}

/** Epoch seconds avoid ambiguous repeated local hours at the end of daylight saving. */
export function parseWeather(raw: unknown, unit: TemperatureUnit, fetchedAt = Date.now()): Weather {
  const value = object(raw), current = object(value.current);
  if (!timestamp(current.time) || ![0, 1].includes(current.is_day as number)) throw new Error("Invalid current weather");
  const hours: Hour[] = [];
  if (value.hourly !== undefined) {
    const hourly = object(value.hourly);
    if (!Array.isArray(hourly.time) || !Array.isArray(hourly.temperature_2m) || !Array.isArray(hourly.weather_code) || !Array.isArray(hourly.is_day)) throw new Error("Invalid hourly weather");
    const seen = new Set<number>();
    for (let i = 0; i < hourly.time.length; i++) {
      const time = hourly.time[i];
      if (!timestamp(time) || time <= current.time || seen.has(time) || ![0, 1].includes(hourly.is_day[i] as number)) continue;
      seen.add(time);
      hours.push({ time, temp: temp(hourly.temperature_2m[i]), kind: kindOf(hourly.weather_code[i]), night: hourly.is_day[i] === 0 });
    }
  }
  hours.sort((a, b) => a.time - b.time);
  return { temp: temp(current.temperature_2m), kind: kindOf(current.weather_code), night: current.is_day === 0, hours: hours.slice(0, 8), observedAt: current.time, fetchedAt, unit };
}

export async function loadWeather(city: City, unit: TemperatureUnit, signal?: AbortSignal): Promise<Weather | null> {
  if (!coordinates(city.lat, city.lon)) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12_000);
  try {
    const query = new URLSearchParams({
      latitude: String(city.lat), longitude: String(city.lon),
      current: "temperature_2m,weather_code,is_day", hourly: "temperature_2m,weather_code,is_day",
      forecast_hours: "12", timezone: city.tz, timeformat: "unixtime", temperature_unit: unit,
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
    return parseWeather(await response.json(), unit);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
