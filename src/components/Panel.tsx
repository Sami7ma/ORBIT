import type { City } from "../lib/cities";
import { hourLabel } from "../lib/time";
import { glyph, LABEL, type Weather } from "../lib/weather";

export default function Panel({ city, weather, h24 }: { city: City; weather?: Weather | null; h24: boolean }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <strong>{city.name === "Local" ? "Your time" : city.name}</strong>
          <small>{city.country || city.tz}</small>
        </div>
        {weather ? (
          <div className="now">
            <span>{glyph(weather.kind, weather.night)}</span>
            <b>{weather.temp}°</b>
            <small>{weather.kind === "clear" && weather.night ? "Clear night" : LABEL[weather.kind]}</small>
          </div>
        ) : (
          <small>Weather unavailable</small>
        )}
      </div>
      {weather && (
        <div className="hours" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
          {weather.hours.map((h) => (
            <div className="hour" key={h.time}>
              <small>{hourLabel(h.time, h24)}</small>
              <span>{glyph(h.kind, h.night)}</span>
              <b>{h.temp}°</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
