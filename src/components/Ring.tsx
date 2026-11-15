import { useId } from "react";
import type { City } from "../lib/cities";
import { clock, zoneLabel, type Fmt } from "../lib/time";
import { glyph, type Weather } from "../lib/weather";
import Fx from "./Fx";

const SIZE = 104, STROKE = 6, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R;

type Props = { city: City; now: Date; homeTz: string; fmt: Fmt; weather?: Weather | null; active: boolean; onEnter: () => void };

export default function Ring({ city, now, homeTz, fmt, weather, active, onEnter }: Props) {
  const id = useId();
  const t = clock(city.tz, now, homeTz, fmt.h24);
  const h = Math.floor(t.frac * 24);
  const night = weather ? weather.night : h < 6 || h >= 18;
  const shift = t.dayShift === 1 ? "Tomorrow" : t.dayShift === -1 ? "Yesterday" : "";
  const label = zoneLabel(city.tz, now, fmt.utc);
  const small = `:${t.minute}${!fmt.h24 && fmt.ampm ? ` ${t.period}` : ""}`;

  return (
    <div className={`ring-item ${active ? "active" : ""}`} onMouseEnter={onEnter}>
      <div className={`ring ${night ? "night" : "day"}`}>
        <div className="disc">{weather && <Fx kind={weather.kind} night={night} />}</div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
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
        <div className="time">
          <b>{t.hour}</b>
          <span>{small}</span>
        </div>
        {weather && <div className="badge">{glyph(weather.kind, night)}</div>}
      </div>
      <div className="name">{city.name === "Local" ? "Local" : city.name}</div>
      <div className="zone">{shift ? `${shift} · ${label}` : label}</div>
    </div>
  );
}
