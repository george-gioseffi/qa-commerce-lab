import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { ensureStockAvailable } from "../../lib/validators.js";
import { requireAuth } from "../../middleware/auth.js";
import { addCartItemSchema, updateCartItemSchema } from "./cart.schemas.js";

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get("/", async (request, response) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: request.user!.id },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  return response.json(items);
});

cartRouter.post("/items", async (request, response) => {
  const payload = addCartItemSchema.safeParse(request.body);

  if (!payload.success) {
    return response.status(400).json({ message: "Invalid cart item payload." });
  }

  const product = await prisma.product.findFirst({
    where: { id: payload.data.productId, isActive: true },
  });

  if (!product) {
    return response.status(404).json({ message: "Product not found." });
  }

  if (!ensureStockAvailable(payload.data.quantity, product.stock)) {
    return response.status(400).json({ message: "Requested quantity exceeds available stock." });
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: request.user!.id,
        productId: product.id,
      },
    },
  });

  const nextQuantity = (existingItem?.quantity ?? 0) + payload.data.quantity;

  if (!ensureStockAvailable(nextQuantity, product.stock)) {
    return response.status(400).json({ message: "Requested quantity exceeds available stock." });
  }

  const item = await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: request.user!.id,
        productId: product.id,
      },
    },
    update: { quantity: nextQuantity },
    create: {
      userId: request.user!.id,
      productId: product.id,
      quantity: payload.data.quantity,
    },
    include: { product: true },
  });

  return response.status(201).json(item);
});

cartRouter.patch("/items/:productId", async (request, response) => {
  const payload = updateCartItemSchema.safeParse(request.body);

  if (!payload.success) {
    return response.status(400).json({ message: "Invalid cart update payload." });
  }

  const product = await prisma.product.findFirst({
    where: { id: request.params.productId, isActive: true },
  });

  if (!product) {
    return response.status(404).json({ message: "Product not found." });
  }

  if (!ensureStockAvailable(payload.data.quantity, product.stock)) {
    return response.status(400).json({ message: "Requested quantity exceeds available stock." });
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: request.user!.id,
        productId: request.params.productId,
      },
    },
  });

  if (!existingItem) {
    return response.status(404).json({ message: "Cart item not found." });
  }

  const item = await prisma.cartItem.update({
    where: {
      userId_productId: {
        userId: request.user!.id,
        productId: request.params.productId,
      },
    },
    data: { quantity: payload.data.quantity },
    include: { product: true },
  });

  return response.json(item);
});

cartRouter.delete("/items/:productId", async (request, response) => {
  const deleted = await prisma.cartItem.deleteMany({
    where: {
      userId: request.user!.id,
      productId: request.params.productId,
    },
  });

  if (deleted.count === 0) {
    return response.status(404).json({ message: "Cart item not found." });
  }

  return response.status(204).send();
});
