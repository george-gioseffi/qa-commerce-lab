import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { credentials } from "./fixtures/auth";
import { HomePage } from "./pages/home.page";

test("user sees seeded products on home page", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
});

test("user searches a product", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.searchInput.fill("Keyboard");
  await expect(page.getByText("Mechanical Keyboard")).toBeVisible();
});

test("user logs in, adds product, updates quantity and checks out", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();

  await page.getByTestId("email-input").fill(credentials.email);
  await page.getByTestId("password-input").fill(credentials.password);
  await page.getByTestId("auth-submit").click();

  await page.getByTestId("add-to-cart-Mechanical Keyboard").click();
  await page.getByTestId("quantity-input-Mechanical Keyboard").fill("2");
  await home.checkoutButton.click();

  await expect(page.getByTestId("checkout-success")).toBeVisible();
});

test("negative login flow shows error", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await page.getByTestId("email-input").fill(credentials.email);
  await page.getByTestId("password-input").fill("wrong-pass");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("auth-error")).toContainText("Invalid credentials");
});

test("checkout without login is blocked", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.checkoutButton.click();
  await expect(page.getByTestId("auth-error")).toContainText("Login is required");
});

test("home page has no critical accessibility violations", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toHaveLength(0);
});

test("checkout area has no critical accessibility violations", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  const results = await new AxeBuilder({ page }).include("[data-testid='cart-panel']").analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toHaveLength(0);
});
