export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ensureValidPrice(priceInCents: number) {
  return Number.isInteger(priceInCents) && priceInCents > 0;
}

export function ensureStockAvailable(requestedQuantity: number, availableStock: number) {
  return requestedQuantity > 0 && requestedQuantity <= availableStock;
}

export function calculateCartTotal(
  items: Array<{ quantity: number; priceInCents: number }>
) {
  return items.reduce((total, item) => total + item.quantity * item.priceInCents, 0);
}
