import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { buildOrderTotal, canCheckout } from "./checkout.logic.js";

class InsufficientStockError extends Error {
  constructor(productName: string) {
    super(`Insufficient stock for ${productName}.`);
    this.name = "InsufficientStockError";
  }
}

class EmptyCartError extends Error {
  constructor() {
    super("Cart is empty.");
    this.name = "EmptyCartError";
  }
}

class ConcurrentCheckoutError extends Error {
  constructor() {
    super("Checkout already in progress or cart changed.");
    this.name = "ConcurrentCheckoutError";
  }
}

export const checkoutRouter = Router();

checkoutRouter.post("/", requireAuth, async (request, response) => {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: request.user!.id },
        include: { product: true },
      });

      if (!canCheckout(cartItems.length)) {
        throw new EmptyCartError();
      }

      // Atomically claim the user's cart rows inside the transaction so concurrent
      // checkouts from the same user cannot create duplicate orders.
      const cleared = await tx.cartItem.deleteMany({
        where: { userId: request.user!.id },
      });

      if (cleared.count !== cartItems.length) {
        throw new ConcurrentCheckoutError();
      }

      for (const item of cartItems) {
        if (!item.product.isActive || item.quantity > item.product.stock) {
          throw new InsufficientStockError(item.product.name);
        }

        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          throw new InsufficientStockError(item.product.name);
        }
      }

      const totalInCents = buildOrderTotal(
        cartItems.map((item) => ({
          quantity: item.quantity,
          priceInCents: item.product.priceInCents,
        }))
      );

      return tx.order.create({
        data: {
          userId: request.user!.id,
          totalInCents,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceInCents: item.product.priceInCents,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return response.status(201).json(order);
  } catch (error) {
    if (error instanceof EmptyCartError) {
      return response.status(400).json({ message: error.message });
    }
    if (error instanceof InsufficientStockError || error instanceof ConcurrentCheckoutError) {
      return response.status(409).json({ message: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return response.status(409).json({ message: "Checkout conflicted with another cart or stock update. Please retry." });
    }
    throw error;
  }
});
