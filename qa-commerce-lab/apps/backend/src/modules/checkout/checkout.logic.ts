import { calculateCartTotal } from "../../lib/validators.js";

export function canCheckout(itemsCount: number) {
  return itemsCount > 0;
}

export function buildOrderTotal(items: Array<{ quantity: number; priceInCents: number }>) {
  return calculateCartTotal(items);
}
