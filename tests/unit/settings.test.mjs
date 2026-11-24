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
