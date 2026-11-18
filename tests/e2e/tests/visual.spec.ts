import { expect, test } from "@playwright/test";

test.describe("Visual regression @visual", () => {
  // The reviewed baseline was created on Windows with Playwright Chromium.
  test.skip(process.platform !== "win32", "Visual baseline is maintained for Windows Chromium only.");
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });

  test("home hero keeps its reviewed layout", async ({ page }) => {
    // Prevent external product images and changing catalog data from affecting the snapshot.
    await page.route("**/api/products*", (route) => route.fulfill({ status: 200, json: [] }));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Fake commerce, real QA engineering depth." })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("home-page")).toHaveScreenshot("home-hero.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    });
  });
});
