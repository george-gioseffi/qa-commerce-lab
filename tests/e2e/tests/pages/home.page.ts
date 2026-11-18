import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly checkoutButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly authSubmit: Locator;
  readonly authModeToggle: Locator;
  readonly authError: Locator;
  readonly logoutButton: Locator;
  readonly cartPanel: Locator;
  readonly cartTotal: Locator;
  readonly checkoutSuccess: Locator;
  readonly ordersPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId("search-input");
    this.categoryFilter = page.getByTestId("category-filter");
    this.checkoutButton = page.getByTestId("checkout-button");
    this.emailInput = page.getByTestId("email-input");
    this.passwordInput = page.getByTestId("password-input");
    this.nameInput = page.getByTestId("name-input");
    this.authSubmit = page.getByTestId("auth-submit");
    this.authModeToggle = page.getByTestId("auth-mode-toggle");
    this.authError = page.getByTestId("auth-error");
    this.logoutButton = page.getByTestId("logout-button");
    this.cartPanel = page.getByTestId("cart-panel");
    this.cartTotal = page.getByTestId("cart-total");
    this.checkoutSuccess = page.getByTestId("checkout-success");
    this.ordersPanel = page.getByTestId("orders-panel");
  }

  async goto() {
    await this.page.goto("/");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.authSubmit.click();
  }

  async register(name: string, email: string, password: string) {
    await this.authModeToggle.click();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.authSubmit.click();
  }

  async addToCart(productName: string) {
    await this.page.getByTestId(`add-to-cart-${productName}`).click();
  }

  async updateQuantity(productName: string, quantity: number) {
    await this.page.getByTestId(`quantity-input-${productName}`).fill(String(quantity));
  }

  async removeFromCart(productName: string) {
    await this.page.getByTestId(`remove-item-${productName}`).click();
  }
}
