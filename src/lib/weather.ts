import { useEffect, useState } from "react";
import type { City } from "./cities";

export type Kind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";
export type Hour = { time: string; temp: number; kind: Kind; night: boolean };
export type Weather = { temp: number; kind: Kind; night: boolean; hours: Hour[] };

export function kindOf(code: number): Kind {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

export const LABEL: Record<Kind, string> = {
  clear: "Clear", cloud: "Cloudy", fog: "Foggy", rain: "Rain", snow: "Snow", storm: "Thunderstorm",
};

export function glyph(k: Kind, night: boolean): string {
  if (k === "clear") return night ? "🌙" : "☀️";
  return { cloud: "☁️", fog: "🌫️", rain: "🌧️", snow: "❄️", storm: "⛈️" }[k];
}

async function load(c: City): Promise<Weather | null> {
  if (!Number.isFinite(c.lat)) return null;
  const u =
    `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
    `&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day` +
    `&forecast_hours=12&timezone=auto`;
  const j = await (await fetch(u)).json();
  const now: string = j.current.time;
  const hours: Hour[] = j.hourly.time
    .map((t: string, i: number) => ({
      time: t,
      temp: Math.round(j.hourly.temperature_2m[i]),
      kind: kindOf(j.hourly.weather_code[i]),
      night: !j.hourly.is_day[i],
    }))
    .filter((h: Hour) => h.time > now)
    .slice(0, 8);
  return { temp: Math.round(j.current.temperature_2m), kind: kindOf(j.current.weather_code), night: !j.current.is_day, hours };
}

/** Fetches weather for every ring, refreshes every 15 minutes. Failures just mean "no weather". */
export function useWeather(cities: City[]): Record<string, Weather | null> {
  const [data, setData] = useState<Record<string, Weather | null>>({});
  const key = cities.map((c) => `${c.name}|${c.lat}|${c.lon}`).join(";");
  useEffect(() => {
    let dead = false;
    const run = () =>
      cities.forEach(async (c) => {
        try {
          const w = await load(c);
          if (!dead) setData((d) => ({ ...d, [`${c.name}|${c.tz}`]: w }));
        } catch {
          /* offline: keep the last value */
        }
      });
    run();
    const id = setInterval(run, 15 * 60 * 1000);
    return () => { dead = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}
