import { describe, expect, it } from "vitest";
import {
  calculateCartTotal,
  ensureStockAvailable,
  ensureValidPrice,
  isValidEmail,
} from "../lib/validators.js";
import { buildOrderTotal, canCheckout } from "../modules/checkout/checkout.logic.js";

describe("business rules", () => {
  it("calculates cart totals correctly including empty cart", () => {
    expect(calculateCartTotal([])).toBe(0);
    expect(
      calculateCartTotal([
        { quantity: 2, priceInCents: 1000 },
        { quantity: 1, priceInCents: 3550 },
      ])
    ).toBe(5550);
  });

  it("validates stock availability boundaries", () => {
    expect(ensureStockAvailable(1, 1)).toBe(true);
    expect(ensureStockAvailable(2, 5)).toBe(true);
    expect(ensureStockAvailable(6, 5)).toBe(false);
    expect(ensureStockAvailable(0, 5)).toBe(false);
    expect(ensureStockAvailable(-1, 5)).toBe(false);
    expect(ensureStockAvailable(1, 0)).toBe(false);
  });

  it("validates price boundaries", () => {
    expect(ensureValidPrice(1)).toBe(true);
    expect(ensureValidPrice(1099)).toBe(true);
    expect(ensureValidPrice(0)).toBe(false);
    expect(ensureValidPrice(-100)).toBe(false);
  });

  it("validates email format", () => {
    expect(isValidEmail("qa@example.com")).toBe(true);
    expect(isValidEmail("qa.user+tag@sub.example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("applies checkout rules", () => {
    expect(canCheckout(1)).toBe(true);
    expect(canCheckout(3)).toBe(true);
    expect(canCheckout(0)).toBe(false);
    expect(canCheckout(-1)).toBe(false);
    expect(
      buildOrderTotal([
        { quantity: 3, priceInCents: 1200 },
        { quantity: 1, priceInCents: 3000 },
      ])
    ).toBe(6600);
  });
});
