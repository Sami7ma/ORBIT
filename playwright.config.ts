import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:1420", timezoneId: "Africa/Addis_Ababa",
    viewport: { width: 1000, height: 950 }, trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1000, height: 950 } } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1", url: "http://127.0.0.1:1420",
    reuseExistingServer: !process.env.CI,
  },
});
