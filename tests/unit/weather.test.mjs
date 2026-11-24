import test from "node:test";
import assert from "node:assert/strict";
import { makeCity, makeLocal } from "../../src/domain/city.ts";
import { kindOf, loadWeather, parseWeather, temperature, weatherIsStale } from "../../src/features/weather/api.ts";

const now = Date.parse("2026-11-01T04:30Z") / 1000;
const fixture = () => ({
  current: { time: now, temperature_2m: 15.6, weather_code: 0, is_day: 0 },
  hourly: { time: [now + 1800, now + 5400], temperature_2m: [17, null], weather_code: [2, null], is_day: [0, 0] },
});

test("null temperatures and conditions stay missing instead of becoming zero and rain", () => {
  const raw = fixture(); raw.current.temperature_2m = null; raw.current.weather_code = null;
  const weather = parseWeather(raw, "celsius", now * 1000);
  assert.equal(weather.temp, null);
  assert.equal(weather.kind, null);
  assert.equal(weather.hours[1].temp, null);
  assert.equal(weather.hours[1].kind, null);
  assert.equal(temperature(null, "celsius"), "—°C");
  assert.equal(temperature(68, "fahrenheit"), "68°F");
  assert.equal(kindOf(999), null);
});

test("repeated DST forecast hours retain separate epoch identities", () => {
  const weather = parseWeather(fixture(), "celsius", now * 1000);
  assert.equal(weather.hours.length, 2);
  assert.notEqual(weather.hours[0].time, weather.hours[1].time);
  assert.equal(weather.temp, 16);
});

test("malformed responses fail validation", () => {
  assert.throws(() => parseWeather({ current: { time: "yesterday", is_day: 1 } }, "celsius"));
  assert.throws(() => parseWeather({ ...fixture(), hourly: { time: [] } }, "celsius"));
  assert.throws(() => parseWeather(null, "celsius"));
  assert.throws(() => parseWeather({ current: { time: 1e300, is_day: 1 } }, "celsius"));
});

test("stale detection uses both observation age and fetch age", () => {
  const weather = parseWeather(fixture(), "celsius", now * 1000);
  assert.equal(weatherIsStale(weather, now * 1000 + 29 * 60_000), false);
  assert.equal(weatherIsStale(weather, now * 1000 + 30 * 60_000), true);
  assert.equal(weatherIsStale({ ...weather, fetchedAt: now * 1000 + 60 * 60_000 }, now * 1000 + 60 * 60_000), true);
});

test("time-only entries never send a weather request", async (t) => {
  const request = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected fetch"); });
  assert.equal(await loadWeather(makeLocal("UTC"), "celsius"), null);
  assert.equal(request.mock.callCount(), 0);
});

test("weather requests use timezone-safe timestamps, explicit units, and cancellation", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("timeformat"), "unixtime");
    assert.equal(query.get("temperature_unit"), "fahrenheit");
    assert.equal(query.get("timezone"), "America/New_York");
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => fixture() };
  });
  const city = makeCity("New York", "US", "America/New_York", 40.71, -74.01);
  assert.equal((await loadWeather(city, "fahrenheit")).unit, "fahrenheit");
});

test("HTTP errors and aborted requests reject without returning fake weather", async (t) => {
  const city = makeCity("City", "", "UTC", 0, 0);
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 429 }));
  await assert.rejects(() => loadWeather(city, "celsius"), /429/);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => {
    assert.equal(signal.aborted, true);
    throw new DOMException("Aborted", "AbortError");
  });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => loadWeather(city, "celsius", controller.signal), { name: "AbortError" });
});
