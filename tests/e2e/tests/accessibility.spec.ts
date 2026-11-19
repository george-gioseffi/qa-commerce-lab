import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/auth";

test.describe("Accessibility Suite @a11y", () => {
  test("home page has no critical or serious accessibility violations", async ({
    homePage,
    page,
  }) => {
    await expect(homePage.searchInput).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? "")
    );
    expect(blocking).toEqual([]);
  });

  test("authenticated cart and orders view has no critical or serious accessibility violations", async ({
    homePage,
    isolatedUser,
    page,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();
    await homePage.addToCart("Noise Cancelling Headset");
    await expect(page.getByTestId("cart-item-Noise Cancelling Headset")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? "")
    );
    expect(blocking).toEqual([]);
  });

  test("keyboard navigation reaches search, filter, and auth controls", async ({
    homePage,
    page,
  }) => {
    await homePage.searchInput.focus();
    await expect(homePage.searchInput).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(homePage.categoryFilter).toBeFocused();
  });
});
