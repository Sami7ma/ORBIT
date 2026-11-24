import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--grep", "captures current browser-preview"], {
  stdio: "inherit", env: { ...process.env, ORBIT_CAPTURE_VISUALS: "1" },
});
process.exit(result.status ?? 1);
