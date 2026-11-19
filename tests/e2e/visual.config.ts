import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/visual.spec.ts",
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "visual-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Serve the built bundle: Vite's development module fan-out exhausted
    // socket buffers on a Windows runner before React could mount.
    command: "npm run preview --workspace @qa-commerce-lab/frontend -- --host 127.0.0.1 --strictPort",
    port: 4173,
    reuseExistingServer: false,
    cwd: "../../",
  },
});
