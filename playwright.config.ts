import { defineConfig, devices } from "@playwright/test";
import { loadTestEnvironment, isLoopbackUrl } from "./scripts/testing/environment.mjs";

const { env, safety } = loadTestEnvironment();
Object.assign(process.env, env);
const port = process.env.PORT || (process.env.PLAYWRIGHT_BASE_URL ? new URL(process.env.PLAYWRIGHT_BASE_URL).port : "") || "3109";
if (!/^\d{2,5}$/.test(port) || Number(port) > 65535) throw new Error("Invalid test port");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
if (!isLoopbackUrl(baseURL)) throw new Error("BLOCKED: E2E app target must be loopback");
// An existing developer server might be connected to production.
if (process.env.PLAYWRIGHT_SKIP_WEBSERVER === "true") throw new Error("BLOCKED: E2E requires its own isolated server");
console.log(`E2E Auth/DB: ${safety.ready ? "test target validated" : safety.reason}`);

export default defineConfig({
  expect: { timeout: 10_000 }, fullyParallel: false, retries: process.env.CI ? 1 : 0,
  testDir: "./e2e", timeout: 60_000, workers: 1,
  reporter: [[process.env.CI ? "github" : "list"], ["json", { outputFile: "artifacts/security-testing/e2e.json" }]],
  use: { baseURL, trace: "off", screenshot: "off", video: "off" },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: { ...env, NEXT_PUBLIC_SITE_URL: baseURL, PORT: port },
    reuseExistingServer: false, timeout: 180_000, url: baseURL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
