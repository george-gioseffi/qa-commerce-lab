import { expect, test as base } from "@playwright/test";
import { HomePage } from "../pages/home.page";

export const credentials = {
  email: process.env.E2E_USER_EMAIL ?? "qa.customer@example.com",
  password: process.env.E2E_USER_PASSWORD ?? "Password123!",
};

export type RegisteredUser = {
  name: string;
  email: string;
  password: string;
  token: string;
  id: string;
};

type Fixtures = {
  homePage: HomePage;
  isolatedUser: RegisteredUser;
};

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:3333";

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    const home = new HomePage(page);
    await home.goto();
    await use(home);
  },

  isolatedUser: async ({ request }, use, testInfo) => {
    const unique = `${Date.now()}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 7)}`;
    const userPayload = {
      name: `E2E User ${testInfo.workerIndex}`,
      email: `e2e.${unique}@example.com`,
      password: "Password123!",
    };

    const response = await request.post(`${apiBaseUrl}/api/auth/register`, {
      data: userPayload,
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { token: string; user: { id: string } };

    await use({
      ...userPayload,
      token: body.token,
      id: body.user.id,
    });
  },
});

export { expect };
