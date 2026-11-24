import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const instant = new Date("2026-11-23T12:15:00Z");
const epoch = instant.getTime() / 1000;

async function weather(page: Page, failed = false, observedAt = epoch) {
  await page.route("https://api.open-meteo.com/**", async (route) => {
    if (failed) return route.abort();
    const unit = new URL(route.request().url()).searchParams.get("temperature_unit");
    await route.fulfill({ json: {
      current: { time: observedAt, temperature_2m: unit === "fahrenheit" ? 68 : 20, weather_code: 2, is_day: 1 },
      hourly: {
        time: Array.from({ length: 10 }, (_, i) => Math.ceil(observedAt / 3600) * 3600 + i * 3600),
        temperature_2m: Array(10).fill(unit === "fahrenheit" ? 68 : 20),
        weather_code: Array(10).fill(2), is_day: Array(10).fill(1),
      },
    } });
  });
  await page.route("https://geocoding-api.open-meteo.com/**", (route) => route.abort());
}

async function open(page: Page) {
  await page.clock.install({ time: instant });
  await weather(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Local,/ })).toBeVisible();
}

test("keeps ring design, opens details with keyboard, and updates after an hour's sleep", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  const local = page.getByRole("button", { name: /^Local,/ });
  await expect(local).toHaveAccessibleName(/3:15 PM/);
  await local.focus();
  await expect(page.locator(".panel")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Local details" })).toBeVisible();
  await expect(local).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".hud")).toHaveCSS("opacity", "1");
  await page.clock.fastForward(3_600_000);
  await expect(local).toHaveAccessibleName(/4:15 PM/);
  expect(errors).toEqual([]);
});

test("Local follows a runtime device timezone change without altering selected cities", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    Intl.DateTimeFormat = new Proxy(Intl.DateTimeFormat, {
      apply(target, receiver, args) {
        return Reflect.apply(target, receiver, [args[0], { ...args[1], timeZone: args[1]?.timeZone ?? "Asia/Tokyo" }]);
      },
    });
  });
  await page.clock.runFor(1100);
  await expect(page.getByRole("button", { name: /^Local,/ })).toHaveAccessibleName(/9:15 PM/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.cities.v3")!).cities);
  expect(saved.find((city: { kind: string }) => city.kind === "local").tz).toBe("Asia/Tokyo");
  expect(saved.find((city: { name: string }) => city.name === "London").tz).toBe("Europe/London");
});

test("repairs saved cities without losing good entries or unrelated storage", async ({ page }) => {
  const legacy = JSON.stringify([
    { name: "London", country: "United Kingdom", tz: "Europe/London", lat: 51.51, lon: -0.13 },
    { name: "Bad", tz: "Invalid/Zone" },
    { name: "Local", tz: "UTC", lat: 40.71, lon: -74.01 },
  ]);
  await page.addInitScript(({ legacy }) => { localStorage.setItem("orbit.cities.v2", legacy); localStorage.setItem("unrelated", "keep"); }, { legacy });
  await open(page);
  await expect(page.getByRole("button", { name: /^London,/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bad,/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("orbit.cities.v2.backup"))).toBe(legacy);
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe("keep");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.cities.v3")!));
  expect(saved.cities).toHaveLength(2);
  expect(saved.cities.find((city: { kind: string }) => city.kind === "local").lat).toBeNull();
});

test("searches offline, reorders cities, and persists a selected UTC clock", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.getByRole("button", { name: "Move London earlier", exact: true }).click();
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.cities.v3")!).cities);
  expect(saved.map((city: { name: string }) => city.name)).toEqual(["Local", "London", "New York", "Tokyo"]);
  const search = page.getByRole("textbox", { name: "Search cities, countries, or timezones" });
  await search.fill("Montreal");
  await expect(page.getByRole("button", { name: /Montréal Canada/ })).toBeVisible();
  await search.fill("UTC");
  await page.getByRole("button", { name: /UTC Coordinated Universal Time/ }).click();
  await page.reload();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.cities.v3")!).cities);
  expect(saved.at(-1).tz).toBe("UTC");
});

test("preserves an unknown city schema and backs up damaged settings", async ({ page }) => {
  const future = JSON.stringify({ version: 99, cities: ["future data"] });
  await page.addInitScript(({ future }) => {
    localStorage.setItem("orbit.cities.v3", future);
    localStorage.setItem("orbit.settings.v2", "damaged settings");
  }, { future });
  await open(page);
  await expect(page.getByRole("status")).toContainText("saved by another version");
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.getByRole("button", { name: "Move London earlier", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("orbit.cities.v3"))).toBe(future);
  expect(await page.evaluate(() => localStorage.getItem("orbit.settings.v2.backup"))).toBe("damaged settings");
});

test("selects Local weather explicitly and changes temperature units", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Local,/ }).click();
  await page.getByRole("button", { name: "Choose Local weather location", exact: true }).click();
  await page.getByRole("textbox").fill("London");
  await page.getByRole("button", { name: /^London United Kingdom/ }).click();
  await expect(page.getByRole("region", { name: "Local details" }).getByText("20°C", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Weather: London, United Kingdom/ })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "°F", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Blur what's behind" })).toBeDisabled();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: /^Local,/ }).click();
  await expect(page.getByRole("region", { name: "Local details" }).getByText("68°F", { exact: true }).first()).toBeVisible();
  await page.reload();
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.cities.v3")!).cities.find((city: { kind: string }) => city.kind === "local"));
  expect(local.weatherLocation).toBe("London, United Kingdom");
});

test("keeps saved forecasts visibly stale after network failure", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^London,/ }).click();
  await expect(page.getByRole("region", { name: "London details" }).getByText("20°C", { exact: true }).first()).toBeVisible();
  await page.unroute("https://api.open-meteo.com/**");
  await weather(page, true);
  await page.clock.fastForward(31 * 60_000);
  await expect(page.getByRole("status").filter({ hasText: "Saved forecast" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Could not refresh" })).toBeVisible();
  await expect(page.locator(".ring-item").filter({ has: page.getByRole("button", { name: /^London,/ }) }).locator(".badge")).toHaveClass(/is-stale/);
  await page.unroute("https://api.open-meteo.com/**");
  await weather(page, false, epoch + 31 * 60);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("status").filter({ hasText: "Saved forecast" })).toHaveCount(0);
  await expect(page.locator(".ring-item").filter({ has: page.getByRole("button", { name: /^London,/ }) }).locator(".badge")).not.toHaveClass(/is-stale/);
});

test("handles initial weather and search failures without breaking the clocks", async ({ page }) => {
  await page.clock.install({ time: instant });
  await weather(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: /^London,/ }).click();
  await expect(page.getByText("Forecast unavailable. Will retry.")).toBeVisible();
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.getByRole("textbox").fill("Montreal");
  await page.clock.runFor(500);
  await expect(page.getByText("Worldwide search is unavailable. Offline results are still shown.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Montréal Canada/ })).toBeVisible();
});

test("captures current browser-preview design references", async ({ page }) => {
  test.skip(!process.env.ORBIT_CAPTURE_VISUALS, "Run npm run screenshots to refresh documented previews.");
  await open(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /^London,/ }).click();
  await expect(page.getByRole("region", { name: "London details" }).getByText("20°C", { exact: true }).first()).toBeVisible();
  await mkdir("docs/screenshots", { recursive: true });
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-forecast.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".panel")).toHaveCount(0);
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-overview.png", animations: "disabled" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-settings.png", animations: "disabled" });
  await page.locator(".sbody").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-weather-settings.png", animations: "disabled" });
  await page.locator(".sbody").evaluate((element) => { element.scrollTop = 0; });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Add a city", exact: true }).click();
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-cities.png", animations: "disabled" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Solid black", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-solid.png", animations: "disabled" });
  await page.getByRole("separator", { name: "Resize from right", exact: true }).focus();
  for (let i = 0; i < 23; i++) await page.keyboard.press("ArrowLeft");
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-single-city.png", animations: "disabled" });
  await page.getByRole("separator", { name: "Resize from bottom", exact: true }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
  await page.locator(".shell").screenshot({ path: "docs/screenshots/browser-two-rows.png", animations: "disabled" });
});


test("stays compact until the clock center is activated, with weather always present when enabled", async ({ page }) => {
  await open(page);
  const london = page.locator(".ring-item").filter({ has: page.getByRole("button", { name: /^London,/ }) });
  await expect(london.getByRole("img", { name: "Cloudy", exact: true })).toBeVisible();
  await london.locator(".name").hover();
  await expect(page.locator(".panel")).toHaveCount(0);
  await expect(page.locator(".shell")).toHaveCSS("height", "188px");
  await london.locator(".badge").click();
  await expect(page.locator(".panel")).toHaveCount(0);
  await london.getByRole("button").click();
  await expect(page.getByRole("region", { name: "London details" })).toBeVisible();
  await page.getByRole("button", { name: "Close city details" }).click();
  await expect(page.locator(".panel")).toHaveCount(0);
  await london.getByRole("button").click();
  await page.mouse.move(5, 5);
  await page.clock.runFor(400);
  await expect(page.locator(".panel")).toHaveCount(0);
  await expect(london.locator(".badge")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Show weather", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".badge")).toHaveCount(0);
  await expect(page.locator(".fx")).toHaveCount(0);
});

test("shows weather failure and missing-location states without opening details", async ({ page }) => {
  await page.clock.install({ time: instant });
  await weather(page, true);
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Choose Local weather location in Settings" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Weather unavailable; will retry" })).toHaveCount(3);
  await expect(page.locator(".panel")).toHaveCount(0);
});

test("resizes the visible area to one city, keeps other clocks scrollable and restores the size", async ({ page }) => {
  await open(page);
  const shell = page.locator(".shell");
  const edge = page.getByRole("separator", { name: "Resize from right", exact: true });
  const box = await edge.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x - 450, box!.y + box!.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(shell).toHaveCSS("width", "160px");
  await expect(edge).toHaveAttribute("aria-valuenow", "160");
  await expect(edge).toHaveAttribute("aria-valuetext", "160 by 188 pixels");
  await expect(shell).toHaveCSS("height", "188px");
  await expect(page.locator(".panel")).toHaveCount(0);
  const local = page.getByRole("button", { name: /^Local,/ });
  const tokyo = page.getByRole("button", { name: /^Tokyo,/ });
  await expect(local).toBeInViewport();
  await page.locator(".strip").hover();
  await page.mouse.wheel(0, 600);
  await page.clock.runFor(700);
  await expect(tokyo).toBeInViewport();
  await page.reload();
  await expect(shell).toHaveCSS("width", "160px");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("orbit.settings.v2")!));
  expect(saved.scale).toBe(1);
  expect(saved.viewportWidth).toBe(160);
  await page.getByRole("separator", { name: "Resize from bottom", exact: true }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
  await expect(shell).toHaveCSS("height", "348px");
  await expect(page.locator(".strip")).toHaveCSS("grid-template-rows", "142px 142px");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Lock position" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("separator")).toHaveCount(0);
});
