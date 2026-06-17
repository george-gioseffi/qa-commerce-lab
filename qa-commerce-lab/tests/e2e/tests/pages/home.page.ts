import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId("search-input");
    this.categoryFilter = page.getByTestId("category-filter");
    this.checkoutButton = page.getByTestId("checkout-button");
  }

  async goto() {
    await this.page.goto("/");
  }
}
