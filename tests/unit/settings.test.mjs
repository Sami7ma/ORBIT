import test from "node:test";
import assert from "node:assert/strict";
import { cleanSettings, DEFAULTS } from "../../src/domain/settings.ts";

test("older preferences acquire temperature units without losing known settings", () => {
  const settings = cleanSettings({ h24: true, scale: 1.2, bg: "forest" });
  assert.equal(settings.h24, true);
  assert.equal(settings.scale, 1.2);
  assert.equal(settings.bg, "forest");
  assert.equal(settings.temperatureUnit, "celsius");
});

test("damaged preferences cannot produce invalid scales, styles, or units", () => {
  const settings = cleanSettings({ scale: NaN, clear: Infinity, style: "bad", temperatureUnit: "kelvin", bg: "arbitrary", weather: "yes" });
  assert.deepEqual(settings, DEFAULTS);
  assert.equal(cleanSettings({ scale: 100 }).scale, 1.5);
  assert.equal(cleanSettings({ scale: -5 }).scale, 0.7);
});


test("viewport preferences migrate independently of clock scale and reject damaged dimensions", () => {
  const older = cleanSettings({ scale: 1.2 });
  assert.equal(older.viewportWidth, 520);
  assert.equal(older.viewportHeight, 188);
  const damaged = cleanSettings({ viewportWidth: NaN, viewportHeight: -1 });
  assert.equal(damaged.viewportWidth, 520);
  assert.equal(damaged.viewportHeight, 188);
  const narrow = cleanSettings({ viewportWidth: 160, viewportHeight: 348, scale: 1 });
  assert.equal(narrow.viewportWidth, 160);
  assert.equal(narrow.scale, 1);
});
