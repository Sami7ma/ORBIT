import test from "node:test";
import assert from "node:assert/strict";
import { clock, dayShiftText, diffText, hourLabel, offsetText, sameMinute } from "../../src/lib/time.ts";
import { searchLocal } from "../../src/lib/search.ts";

test("resume and manual changes compare the entire minute, not its minute field", () => {
  assert.equal(sameMinute(new Date("2026-11-23T09:12:10Z"), new Date("2026-11-23T10:12:10Z")), false);
  assert.equal(sameMinute(new Date("2026-11-23T09:12:10Z"), new Date("2026-11-24T09:12:10Z")), false);
  assert.equal(sameMinute(new Date("2026-11-23T09:12:10Z"), new Date("2026-11-23T09:12:59Z")), true);
});

test("DST advances and repeats the correct local hour", () => {
  assert.equal(clock("America/New_York", new Date("2026-03-08T06:59Z"), "UTC").hour, "1");
  assert.equal(clock("America/New_York", new Date("2026-03-08T07:01Z"), "UTC").hour, "3");
  const before = new Date("2026-11-01T05:30Z"), after = new Date("2026-11-01T06:30Z");
  assert.equal(clock("America/New_York", before, "UTC").hour, "1");
  assert.equal(clock("America/New_York", after, "UTC").hour, "1");
  assert.equal(offsetText("America/New_York", before, true), "UTC−4");
  assert.equal(offsetText("America/New_York", after, true), "UTC−5");
});

test("fractional offsets and midnight formatting remain accurate", () => {
  const now = new Date("2026-11-23T00:00Z");
  assert.equal(offsetText("Asia/Kathmandu", now, true), "UTC+5:45");
  assert.equal(diffText("Asia/Kathmandu", "Africa/Addis_Ababa", now), "2:45 h ahead");
  assert.equal(clock("UTC", now, "UTC", true).hour, "00");
  assert.equal(clock("UTC", now, "UTC").hour, "12");
});

test("calendar dates account for two days across the international date line", () => {
  const now = new Date("2026-01-01T10:30Z");
  assert.equal(clock("Pacific/Kiritimati", now, "Pacific/Pago_Pago").dayShift, 2);
  assert.equal(clock("Pacific/Pago_Pago", now, "Pacific/Kiritimati").dayShift, -2);
  assert.equal(dayShiftText(2), "2 days ahead");
  assert.equal(dayShiftText(-2), "2 days behind");
});

test("forecast labels use epoch timestamps and the target city's timezone", () => {
  const time = Date.parse("2026-11-23T00:00Z") / 1000;
  assert.equal(hourLabel(time, true, "Asia/Kathmandu"), "05:45");
  assert.match(hourLabel(time, false, "America/New_York"), /7:00.*PM/);
});

test("offset search refreshes through a DST change during the same app session", () => {
  assert.ok(searchLocal("New York UTC-5", 40, new Date("2026-03-08T06:30Z")).some((city) => city.name === "New York"));
  assert.ok(searchLocal("New York UTC-4", 40, new Date("2026-03-08T07:30Z")).some((city) => city.name === "New York"));
  assert.ok(!searchLocal("New York UTC-5", 40, new Date("2026-03-08T07:30Z")).some((city) => city.name === "New York"));
});
