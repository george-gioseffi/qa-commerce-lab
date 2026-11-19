import { credentials, expect, test } from "./fixtures/auth";

test.describe("Authentication & Session @auth @regression", () => {
  test("user registers a new account and sees authenticated state", async ({ homePage, page }) => {
    const email = `reg.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
    await homePage.register("New QA User", email, "Password123!");

    await expect(page.getByRole("heading", { name: "Welcome, New QA User" })).toBeVisible();
    await expect(homePage.logoutButton).toBeVisible();
  });

  test("duplicate email registration displays conflict error", async ({ homePage }) => {
    await homePage.register("Duplicate", credentials.email, "Password123!");
    await expect(homePage.authError).toContainText("Email already registered");
  });

  test("invalid credentials display error and keep user logged out", async ({ homePage }) => {
    await homePage.login(credentials.email, "invalid-password");
    await expect(homePage.authError).toContainText("Invalid credentials");
    await expect(homePage.logoutButton).toBeHidden();
  });

  test("session persists across page reload and clears on logout", async ({
    homePage,
    isolatedUser,
    page,
  }) => {
    await homePage.login(isolatedUser.email, isolatedUser.password);
    await expect(homePage.logoutButton).toBeVisible();

    await page.reload();
    await expect(homePage.logoutButton).toBeVisible();
    await expect(page.getByRole("heading", { name: `Welcome, ${isolatedUser.name}` })).toBeVisible();

    await homePage.logoutButton.click();
    await expect(homePage.authSubmit).toBeVisible();

    await page.reload();
    await expect(homePage.authSubmit).toBeVisible();
  });

  test("invalid stored token recovers cleanly to logged-out state", async ({ page, homePage }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "qa-commerce-auth",
        JSON.stringify({
          token: "invalid.jwt.token",
          user: { id: "fake", name: "Stale User", email: "stale@example.com", role: "CUSTOMER" },
        })
      );
    });

    await page.reload();
    await expect(homePage.authSubmit).toBeVisible();
    await expect(homePage.authError).toContainText("Session expired");
  });
});
