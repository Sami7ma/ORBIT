import type { City } from "../lib/cities";
import { dateText, diffText, hourLabel, offsetText } from "../lib/time";
import { glyph, LABEL, temperature, weatherIsStale, type WeatherState } from "../lib/weather";

type Props = {
  city: City; now: Date; home: string; h24: boolean; utc: boolean;
  weatherOn: boolean; weather?: WeatherState; onChooseWeather: () => void;
};

export default function Panel({ city, now, home, h24, utc, weatherOn, weather, onChooseWeather }: Props) {
  const data = weather?.data;
  const stale = !!data && (weather?.status === "error" || weatherIsStale(data, now.getTime()));
  const age = data ? Math.max(0, Math.floor((now.getTime() - data.observedAt * 1000) / 60_000)) : 0;
  const hours = data?.hours.filter((hour) => hour.time > now.getTime() / 1000) ?? [];
  return (
    <section className="panel" id="city-details" aria-label={`${city.name} details`}>
      <div className="panel-head">
        <div>
          <strong>{city.kind === "local" ? "Your time" : city.name}</strong>
          <small>{city.country || city.tz.replace(/_/g, " ")}</small>
        </div>
        {weatherOn && data && <div className={`now ${stale ? "stale" : ""}`}>
          {data.kind && <span aria-hidden="true">{glyph(data.kind, data.night)}</span>}
          <b>{temperature(data.temp, data.unit)}</b>
          <small>{data.kind ? data.kind === "clear" && data.night ? "Clear night" : LABEL[data.kind] : "Conditions unavailable"}</small>
        </div>}
        {weatherOn && !data && <small role="status">{
          weather?.status === "unavailable" ? city.kind === "local" ? "Choose a weather location" : "No coordinates for this timezone"
          : weather?.status === "error" ? "Forecast unavailable. Will retry." : "Loading forecast…"
        }</small>}
      </div>
      <div className="facts">
        <div className="fact"><small>Date</small><b>{dateText(city.tz, now)}</b></div>
        <div className="fact"><small>Offset</small><b>{offsetText(city.tz, now, utc)}</b></div>
        <div className="fact"><small>From you</small><b>{diffText(city.tz, home, now)}</b></div>
      </div>
      {weatherOn && data && <p className={`weather-status ${stale ? "stale" : ""}`} role="status">
        {stale ? "Saved forecast · " : ""}{weather?.status === "error" ? "Could not refresh · " : ""}
        Observed {age < 1 ? "just now" : `${age} min ago`}{weather?.refreshing ? " · Refreshing…" : ""}
      </p>}
      {weatherOn && city.kind === "local" && <button className="text-button local-weather" onClick={onChooseWeather}>
        {city.weatherLocation ? `Weather: ${city.weatherLocation} · Change` : "Choose Local weather location"}
      </button>}
      {weatherOn && data && hours.length > 0 && <div className="hours" tabIndex={0} aria-label="Hourly forecast" onWheel={(event) => { event.currentTarget.scrollLeft += event.deltaY; }}>
        {hours.map((hour) => <div className="hour" key={hour.time}>
          <small>{hourLabel(hour.time, h24, city.tz)}</small>
          <span aria-label={hour.kind ? LABEL[hour.kind] : "Conditions unavailable"}>{hour.kind ? glyph(hour.kind, hour.night) : "—"}</span>
          <b>{temperature(hour.temp, data.unit)}</b>
        </div>)}
      </div>}
    </section>
  );
}
