import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const productsRouter = Router();

productsRouter.get("/", async (request, response) => {
  const search = typeof request.query.search === "string" ? request.query.search : undefined;
  const category = typeof request.query.category === "string" ? request.query.category : undefined;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
      category: category ? { equals: category, mode: "insensitive" } : undefined,
    },
    orderBy: { name: "asc" },
  });

  return response.json(products);
});

productsRouter.get("/:id", async (request, response) => {
  const product = await prisma.product.findFirst({
    where: { id: request.params.id, isActive: true },
  });

  if (!product) {
    return response.status(404).json({ message: "Product not found." });
  }

  return response.json(product);
});
