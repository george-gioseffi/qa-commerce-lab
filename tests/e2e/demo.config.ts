import { defineConfig, devices } from "@playwright/test";

// A deliberately failing demonstration, kept outside the normal test directory.
export default defineConfig({
  testDir: "./demo",
  retries: 0,
  workers: 1,
  outputDir: "demo-test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "demo-report", open: "never" }],
    ["json", { outputFile: "demo-test-results/results.json" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    trace: "on",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:frontend",
    port: 4173,
    reuseExistingServer: false,
    cwd: "../../",
  },
});
