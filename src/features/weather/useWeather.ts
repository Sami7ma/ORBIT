import { useEffect, useRef, useState } from "react";
import { coordinates, type City } from "../../domain/city.ts";
import { loadWeather, WEATHER_REFRESH_MS, type TemperatureUnit, type Weather, type WeatherState } from "./api.ts";

type CacheEntry = { signature: string; data: Weather };

export function useWeather(cities: City[], unit: TemperatureUnit): Record<string, WeatherState> {
  const [data, setData] = useState<Record<string, WeatherState>>({});
  const cache = useRef(new Map<string, CacheEntry>());
  const key = JSON.stringify(cities.map(({ id, tz, lat, lon }) => ({ id, tz, lat, lon })));
  useEffect(() => {
    const places = JSON.parse(key) as City[];
    const controller = new AbortController();
    const signatures = new Map(places.map((city) => [city.id, `${city.tz}|${city.lat}|${city.lon}|${unit}`]));
    for (const [id, entry] of cache.current) if (signatures.get(id) !== entry.signature) cache.current.delete(id);
    const initial: Record<string, WeatherState> = {};
    for (const city of places) {
      const cached = cache.current.get(city.id)?.data;
      initial[city.id] = !coordinates(city.lat, city.lon) ? { status: "unavailable" } : cached ? { status: "ready", data: cached } : { status: "loading" };
    }
    setData(initial);
    let running = false;
    const run = async (force = false) => {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        await Promise.all(places.map(async (city) => {
          if (!coordinates(city.lat, city.lon)) return;
          const cached = cache.current.get(city.id)?.data;
          const age = cached ? Date.now() - cached.fetchedAt : Infinity;
          if (!force && cached && age >= 0 && age < WEATHER_REFRESH_MS) return;
          setData((previous) => ({ ...previous, [city.id]: { status: cached ? "ready" : "loading", data: cached, refreshing: true } }));
          try {
            const next = await loadWeather(city, unit, controller.signal);
            if (controller.signal.aborted) return;
            if (next) cache.current.set(city.id, { signature: signatures.get(city.id)!, data: next });
            setData((previous) => ({ ...previous, [city.id]: next ? { status: "ready", data: next } : { status: "unavailable" } }));
          } catch {
            if (!controller.signal.aborted) setData((previous) => ({ ...previous, [city.id]: { status: "error", data: cached } }));
          }
        }));
      } finally { running = false; }
    };
    const resume = () => { if (!document.hidden) void run(); };
    const online = () => { void run(true); };
    void run();
    const interval = window.setInterval(() => { void run(); }, WEATHER_REFRESH_MS);
    window.addEventListener("online", online);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort(); clearInterval(interval);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [key, unit]);
  // Never display the previous unit/location while its replacement effect is starting.
  return Object.fromEntries(cities.map((city) => {
    const entry = data[city.id];
    const signature = `${city.tz}|${city.lat}|${city.lon}|${unit}`;
    if (!coordinates(city.lat, city.lon)) return [city.id, { status: "unavailable" }];
    if (entry?.data && cache.current.get(city.id)?.signature !== signature) return [city.id, { status: "loading" }];
    return [city.id, entry ?? { status: "loading" }];
  }));
}
