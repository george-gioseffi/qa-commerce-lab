import { expect, test } from "./fixtures/auth";

test.describe("Catalog, Search & Filters @catalog @regression", () => {
  test("displays all seeded product categories and cards", async ({ homePage, page }) => {
    const cards = page.getByTestId("product-card");
    await expect(cards).toHaveCount(4);
    await expect(homePage.categoryFilter.locator("option")).toHaveCount(5);
  });

  test("filters by category without losing other category options", async ({ homePage, page }) => {
    await homePage.categoryFilter.selectOption("Audio");
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByText("Noise Cancelling Headset")).toBeVisible();

    // Category options remain intact so user can switch back
    await expect(homePage.categoryFilter.locator("option")).toHaveCount(5);
    await homePage.categoryFilter.selectOption("All");
    await expect(page.getByTestId("product-card")).toHaveCount(4);
  });

  test("combines search and category filter", async ({ homePage, page }) => {
    await homePage.categoryFilter.selectOption("Peripherals");
    await homePage.searchInput.fill("Keyboard");
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByText("Mechanical Keyboard")).toBeVisible();
  });

  test("shows empty state when no products match", async ({ homePage, page }) => {
    await homePage.searchInput.fill("NonExistentProduct999");
    await expect(page.getByTestId("catalog-empty")).toBeVisible();
    await expect(page.getByTestId("product-card")).toHaveCount(0);
  });

  test("displays error banner when catalog API fails", async ({ page }) => {
    await page.route("**/api/products*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Catalog service unavailable." }),
      });
    });

    await page.goto("/");
    await expect(page.getByTestId("catalog-error")).toContainText("Catalog service unavailable.");
  });
});
