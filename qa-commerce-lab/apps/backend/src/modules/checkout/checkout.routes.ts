import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { buildOrderTotal, canCheckout } from "./checkout.logic.js";

export const checkoutRouter = Router();

checkoutRouter.post("/", requireAuth, async (request, response) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: request.user!.id },
    include: { product: true },
  });

  if (!canCheckout(cartItems.length)) {
    return response.status(400).json({ message: "Cart is empty." });
  }

  for (const item of cartItems) {
    if (item.quantity > item.product.stock) {
      return response.status(400).json({
        message: `Insufficient stock for ${item.product.name}.`,
      });
    }
  }

  const totalInCents = buildOrderTotal(
    cartItems.map((item) => ({
      quantity: item.quantity,
      priceInCents: item.product.priceInCents,
    }))
  );

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
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

    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({
      where: { userId: request.user!.id },
    });

    return createdOrder;
  });

  return response.status(201).json(order);
});
