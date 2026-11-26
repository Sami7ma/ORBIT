import { useId } from "react";
import type { City } from "../lib/cities";
import { clock, dateText, dayShiftText, zoneLabel, type Fmt } from "../lib/time";
import { glyph, LABEL, weatherIsStale, type WeatherState } from "../lib/weather";
import Fx from "./Fx";

const SIZE = 104, STROKE = 6, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R;

type Props = { city: City; now: Date; homeTz: string; fmt: Fmt; weather?: WeatherState; active: boolean; onActivate: () => void };

export default function Ring({ city, now, homeTz, fmt, weather, active, onActivate }: Props) {
  const id = useId();
  const t = clock(city.tz, now, homeTz, fmt.h24);
  const h = Math.floor(t.frac * 24);
  const freshWeather = weather?.data && weather.status !== "error" && !weatherIsStale(weather.data, now.getTime()) ? weather.data : undefined;
  const night = freshWeather ? freshWeather.night : h < 6 || h >= 18;
  const shift = dayShiftText(t.dayShift);
  const label = zoneLabel(city.tz, now, fmt.utc);

  const stale = !!weather?.data && !freshWeather;
  let badge: string | null = null, weatherLabel = "";
  if (weather?.data) {
    const data = weather.data;
    badge = data.kind ? glyph(data.kind, data.night) : "—";
    const condition = data.kind ? data.kind === "clear" && data.night ? "Clear night" : LABEL[data.kind] : "Conditions unavailable";
    weatherLabel = `${stale ? "Saved weather · " : ""}${condition}${stale ? " · refresh pending" : ""}`;
  } else if (weather?.status === "loading") {
    badge = "…"; weatherLabel = "Loading weather";
  } else if (weather?.status === "unavailable") {
    badge = "⌖"; weatherLabel = city.kind === "local" ? "Choose Local weather location in Settings" : "Weather needs a city with coordinates";
  } else if (weather) {
    badge = "!"; weatherLabel = "Weather unavailable; will retry";
  }

  return (
    <div data-city-id={city.id} className={`ring-item ${active ? "active" : ""}`}>
      <div className={`ring ${night ? "night" : "day"}`}>
        <div className="disc">{freshWeather?.kind && <Fx kind={freshWeather.kind} night={night} />}</div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={night ? "#b9c3ff" : "#ffe08a"} />
              <stop offset="1" stopColor={night ? "#7686ff" : "#ff9f43"} />
            </linearGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} className="track" strokeWidth={STROKE} fill="none" />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} strokeLinecap="round"
            stroke={`url(#${id})`} strokeDasharray={`${Math.max(t.frac, 0.012) * C} ${C}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} className="arc"
          />
        </svg>
        <button type="button" className="clock-trigger" data-city-id={city.id} onClick={onActivate}
          aria-expanded={active} aria-controls={active ? "city-details" : undefined}
          aria-label={`${city.name}, ${t.hour}:${t.minute} ${fmt.h24 ? "" : t.period}, ${dateText(city.tz, now)}, ${label}${shift ? `, ${shift}` : ""}`}
          title="Click the clock center for details. Scroll to browse cities.">
        <div className="time">
          <div className="hm"><b>{t.hour}</b><i>:{t.minute}</i></div>
          {!fmt.h24 && fmt.ampm && <span>{t.period}</span>}
        </div>
        </button>
        {badge && <span className={`badge ${stale ? "is-stale" : ""} ${!weather?.data ? "weather-pending" : ""}`} role="img" aria-label={weatherLabel} title={weatherLabel}>{badge}{stale && <small>◷</small>}</span>}
      </div>
      <div className="name">{city.name}</div>
      <div className="zone">{shift ? `${shift} · ${label}` : label}</div>
    </div>
  );
}
