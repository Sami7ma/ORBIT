import test from "node:test";
import assert from "node:assert/strict";
import { makeCity, makeLocal, parseCity, withLocalWeather } from "../../src/domain/city.ts";
import { CITIES } from "../../src/lib/cities.ts";
import { parseSearchResults, searchLocal } from "../../src/lib/search.ts";
import { CITIES_KEY, LEGACY_CITIES_KEY, loadCities, saveCities, resetOrbitStorage } from "../../src/features/cities/storage.ts";

class MemoryStorage {
  values = new Map();
  constructor(values = {}) { for (const [key, value] of Object.entries(values)) this.values.set(key, value); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

test("bundled cities remain valid and different places have stable distinct IDs", () => {
  assert.ok(CITIES.length >= 143);
  for (const city of CITIES) assert.deepEqual(parseCity(city, "UTC"), city);
  const a = makeCity("Springfield", "Illinois", "America/Chicago", 39.8, -89.6);
  const b = makeCity("Springfield", "Missouri", "America/Chicago", 37.2, -93.3);
  assert.notEqual(a.id, b.id);
  assert.equal(parseCity(JSON.parse(JSON.stringify(a)), "UTC").id, a.id);
});

test("invalid timezones are rejected and invalid coordinate pairs become time-only entries", () => {
  assert.equal(parseCity({ name: "Broken", tz: "Invalid/Zone" }, "UTC"), null);
  assert.equal(parseCity({ name: "Missing longitude", tz: "UTC", lat: 5 }, "UTC").kind, "timezone");
  assert.equal(parseCity({ name: "Out of bounds", tz: "UTC", lat: 100, lon: 5 }, "UTC").lat, null);
});

test("Local follows the device while retaining only explicitly chosen weather", () => {
  const local = makeLocal("America/New_York");
  assert.equal(local.lat, null);
  const selected = withLocalWeather(local, CITIES.find((city) => city.name === "London"));
  const restored = parseCity(selected, "Asia/Tokyo");
  assert.equal(restored.tz, "Asia/Tokyo");
  assert.equal(restored.lat, selected.lat);
  assert.match(restored.weatherLocation, /London/);
  const legacy = parseCity({ name: "Local", tz: "UTC", lat: 40.71, lon: -74.01 }, "Africa/Addis_Ababa", true);
  assert.equal(legacy.lat, null);
  assert.equal(legacy.tz, "Africa/Addis_Ababa");
});

test("legacy migration keeps good cities, drops bad entries, deduplicates, and backs up first", () => {
  const raw = JSON.stringify([CITIES[0], { name: "Bad", tz: "Broken" }, CITIES[0], { name: "Local", tz: "UTC" }]);
  const storage = new MemoryStorage({ [LEGACY_CITIES_KEY]: raw });
  const loaded = loadCities(storage, "Asia/Kathmandu");
  assert.equal(loaded.cities.length, 2);
  assert.ok(loaded.notice);
  assert.equal(storage.getItem(CITIES_KEY), null);
  saveCities(storage, loaded.cities, loaded.backup);
  assert.equal(storage.getItem(`${LEGACY_CITIES_KEY}.backup`), raw);
  assert.equal(storage.getItem(LEGACY_CITIES_KEY), raw);
  assert.equal(JSON.parse(storage.getItem(CITIES_KEY)).version, 3);
});

test("malformed storage preserves the original before restoring defaults", () => {
  const storage = new MemoryStorage({ [CITIES_KEY]: "broken json" });
  const loaded = loadCities(storage, "UTC");
  assert.equal(loaded.cities.length, 4);
  saveCities(storage, loaded.cities, loaded.backup);
  assert.equal(storage.getItem(`${CITIES_KEY}.backup`), "broken json");
});

test("newer schemas and unavailable storage remain untouched", () => {
  const raw = JSON.stringify({ version: 99, cities: [] });
  const storage = new MemoryStorage({ [CITIES_KEY]: raw });
  assert.equal(loadCities(storage, "UTC").writable, false);
  assert.equal(storage.getItem(CITIES_KEY), raw);
  assert.equal(loadCities({ getItem() { throw new Error("blocked"); } }, "UTC").writable, false);
});

test("backup failure leaves the original data intact", () => {
  const storage = new MemoryStorage({ [CITIES_KEY]: "broken" });
  const loaded = loadCities(storage, "UTC");
  storage.setItem = () => { throw new Error("quota"); };
  assert.throws(() => saveCities(storage, loaded.cities, loaded.backup), /quota/);
  assert.equal(storage.getItem(CITIES_KEY), "broken");
});

test("later repairs retain both the earlier backup and the new damaged value", () => {
  const storage = new MemoryStorage({ [CITIES_KEY]: "second damaged value", [`${CITIES_KEY}.backup`]: "first damaged value" });
  const loaded = loadCities(storage, "UTC");
  saveCities(storage, loaded.cities, loaded.backup);
  saveCities(storage, loaded.cities, loaded.backup);
  assert.equal(storage.getItem(`${CITIES_KEY}.backup`), "first damaged value");
  assert.equal(storage.getItem(`${CITIES_KEY}.backup.1`), "second damaged value");
  assert.equal(storage.getItem(`${CITIES_KEY}.backup.2`), null);
});

test("reset removes only ORBIT keys", () => {
  const storage = new MemoryStorage({ "orbit.cities.v3": "saved", "orbit.bg.custom": "image", "another-app": "keep" });
  resetOrbitStorage(storage);
  assert.equal(storage.length, 1);
  assert.equal(storage.getItem("another-app"), "keep");
});

test("offline search handles accents and includes a dedicated UTC clock", () => {
  assert.ok(searchLocal("Montreal").some((city) => city.name === "Montréal"));
  assert.ok(searchLocal("Sao Paulo").some((city) => city.name === "São Paulo"));
  assert.equal(searchLocal("UTC")[0].name, "UTC");
  assert.ok(searchLocal("UTC+5:45").some((city) => city.name === "Kathmandu"));
});

test("online results reject invalid locations without losing valid results", () => {
  const cities = parseSearchResults({ results: [
    { name: "Valid", timezone: "UTC", latitude: 0, longitude: 0, country: "Country" },
    { name: "Bad zone", timezone: "Nope", latitude: 0, longitude: 0 },
    { name: "Bad coords", timezone: "UTC", latitude: null, longitude: 0 },
  ] });
  assert.equal(cities.length, 1);
  assert.equal(cities[0].name, "Valid");
  assert.throws(() => parseSearchResults({ results: "broken" }));
});
