import { expect, test } from "@playwright/test";

// Demonstration only: deliberately simulates an outage and fails an assertion.
// It is never part of the normal CI suite and does not represent a product defect.
test("DEMO: capture a trace for a controlled catalog outage", async ({ page }) => {
  await page.route("**/api/products*", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ message: "Controlled demonstration outage." }),
  }));
  await page.goto("/");
  const error = page.getByTestId("catalog-error");
  await expect(error).toContainText("Controlled demonstration outage.");
  // This intentionally contradictory assertion guarantees a real failure trace.
  await expect(error).toHaveCount(0, { timeout: 1000 });
});
