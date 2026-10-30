import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 180000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8765",
    viewport: { width: 390, height: 844 },
    channel: "chrome",
    deviceScaleFactor: 1,
    hasTouch: true,
    serviceWorkers: "block",
  },
  webServer: {
    command: "python3 -m http.server 8765 --bind 127.0.0.1",
    port: 8765,
    reuseExistingServer: true,
  },
});
