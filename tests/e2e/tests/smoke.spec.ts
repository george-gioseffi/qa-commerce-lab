import { credentials, expect, test } from "./fixtures/auth";

test.describe("Smoke Suite @smoke", () => {
  test("user sees seeded products on home page", async ({ homePage, page }) => {
    await expect(homePage.searchInput).toBeVisible();
    await expect(page.getByTestId("product-card").first()).toBeVisible();
  });

  test("user searches a product", async ({ homePage, page }) => {
    await homePage.searchInput.fill("Keyboard");
    await expect(page.getByText("Mechanical Keyboard")).toBeVisible();
  });

  test("user logs in, adds product, updates quantity and checks out", async ({
    homePage,
    isolatedUser,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await homePage.addToCart("Mechanical Keyboard");
    await homePage.updateQuantity("Mechanical Keyboard", 2);
    await homePage.checkoutButton.click();

    await expect(homePage.checkoutSuccess).toBeVisible();
  });

  test("negative login flow shows error", async ({ homePage }) => {
    await homePage.login(credentials.email, "wrong-pass");
    await expect(homePage.authError).toContainText("Invalid credentials");
  });

  test("checkout without login is blocked", async ({ homePage }) => {
    await homePage.checkoutButton.click();
    await expect(homePage.authError).toContainText("Login is required");
  });
});
