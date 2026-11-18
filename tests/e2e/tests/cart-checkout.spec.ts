import { expect, test } from "./fixtures/auth";

test.describe("Cart & Checkout Flows @cart @checkout @regression", () => {
  test("blocks adding to cart when unauthenticated", async ({ homePage }) => {
    await homePage.addToCart("Mechanical Keyboard");
    await expect(homePage.authError).toContainText("Please log in");
  });

  test("updates cart total, persists across reload, and removes item", async ({
    homePage,
    isolatedUser,
    page,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await homePage.addToCart("USB-C Dock");
    await expect(page.getByTestId("cart-item-USB-C Dock")).toBeVisible();
    await expect(homePage.cartTotal).toHaveText("$649.90");

    await homePage.updateQuantity("USB-C Dock", 2);
    await expect(homePage.cartTotal).toHaveText("$1,299.80");

    await page.reload();
    await expect(page.getByTestId("cart-item-USB-C Dock")).toBeVisible();
    await expect(homePage.cartTotal).toHaveText("$1,299.80");

    await homePage.removeFromCart("USB-C Dock");
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(homePage.cartTotal).toHaveText("$0.00");
  });

  test("blocks checkout with empty cart", async ({ homePage, isolatedUser }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await homePage.checkoutButton.click();
    await expect(homePage.authError).toContainText("Cart is empty.");
  });

  test("completes checkout, empties cart, creates order, and updates orders panel", async ({
    homePage,
    isolatedUser,
    page,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await homePage.addToCart("Noise Cancelling Headset");
    await expect(page.getByTestId("cart-item-Noise Cancelling Headset")).toBeVisible();

    await homePage.checkoutButton.click();
    await expect(homePage.checkoutSuccess).toBeVisible();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(homePage.ordersPanel.getByTestId("order-card").first()).toBeVisible();
  });

  test("handles backend checkout error without clearing cart", async ({
    homePage,
    isolatedUser,
    page,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await homePage.addToCart("USB-C Dock");
    await expect(page.getByTestId("cart-item-USB-C Dock")).toBeVisible();

    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Insufficient stock for USB-C Dock." }),
      });
    });

    await homePage.checkoutButton.click();
    await expect(homePage.authError).toContainText("Insufficient stock for USB-C Dock.");
    await expect(page.getByTestId("cart-item-USB-C Dock")).toBeVisible();
  });
});
