import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

describe("API contract and integration coverage", () => {
  let customerToken = "";
  let secondUserToken = "";
  let keyboardProduct: { id: string; stock: number; priceInCents: number; name: string };

  beforeAll(async () => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const userARes = await request(app).post("/api/auth/register").send({
      name: "API Test User A",
      email: `api.user.a.${uniqueSuffix}@example.com`,
      password: "Password123!",
    });
    expect(userARes.status).toBe(201);
    customerToken = userARes.body.token;

    const userBRes = await request(app).post("/api/auth/register").send({
      name: "API Test User B",
      email: `api.user.b.${uniqueSuffix}@example.com`,
      password: "Password123!",
    });
    expect(userBRes.status).toBe(201);
    secondUserToken = userBRes.body.token;

    const productsResponse = await request(app).get("/api/products");
    expect(productsResponse.status).toBe(200);
    keyboardProduct = productsResponse.body.find((p: { name: string }) => p.name === "Mechanical Keyboard");
    expect(keyboardProduct).toBeTruthy();
  });

  describe("Health", () => {
    it("returns ok health status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });

  describe("Authentication & Authorization", () => {
    it("registers user with valid data and returns JWT + user without passwordHash", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "New User",
        email: `new.user.${Date.now()}@example.com`,
        password: "Password123!",
      });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.role).toBe("CUSTOMER");
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it("rejects invalid email and short password on register", async () => {
      const badEmail = await request(app).post("/api/auth/register").send({
        name: "Broken User",
        email: "invalid-email",
        password: "Password123!",
      });
      expect(badEmail.status).toBe(400);

      const shortPass = await request(app).post("/api/auth/register").send({
        name: "Short Pass",
        email: `short.${Date.now()}@example.com`,
        password: "123",
      });
      expect(shortPass.status).toBe(400);
    });

    it("rejects duplicate email registration (case-insensitive)", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "Duplicate User",
        email: "QA.CUSTOMER@EXAMPLE.COM",
        password: "Password123!",
      });

      expect(response.status).toBe(409);
    });

    it("logs in with valid credentials and rejects wrong password or unknown email", async () => {
      const valid = await request(app).post("/api/auth/login").send({
        email: "qa.customer@example.com",
        password: "Password123!",
      });
      expect(valid.status).toBe(200);
      expect(valid.body.token).toBeTruthy();

      const wrongPass = await request(app).post("/api/auth/login").send({
        email: "qa.customer@example.com",
        password: "wrong-password",
      });
      expect(wrongPass.status).toBe(401);

      const unknownEmail = await request(app).post("/api/auth/login").send({
        email: "nobody@example.com",
        password: "Password123!",
      });
      expect(unknownEmail.status).toBe(401);
    });

    it("enforces JWT authentication on /api/auth/me and rejects invalid/expired tokens", async () => {
      const noToken = await request(app).get("/api/auth/me");
      expect(noToken.status).toBe(401);

      const badToken = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer not.a.valid.jwt");
      expect(badToken.status).toBe(401);

      const expiredToken = jwt.sign(
        { sub: "fake-id", email: "expired@example.com", role: "CUSTOMER" },
        env.JWT_SECRET,
        { expiresIn: -10 }
      );
      const expiredRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(expiredRes.status).toBe(401);

      const validMe = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(validMe.status).toBe(200);
      expect(validMe.body.email).toContain("api.user.a");
    });
  });

  describe("Products", () => {
    it("lists products and supports search, category, combined filters, and empty results", async () => {
      const listResponse = await request(app).get("/api/products");
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.length).toBeGreaterThanOrEqual(4);

      const searchResponse = await request(app).get("/api/products").query({ search: "keyboard" });
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.some((p: { name: string }) => p.name === "Mechanical Keyboard")).toBe(true);

      const categoryResponse = await request(app).get("/api/products").query({ category: "Audio" });
      expect(categoryResponse.status).toBe(200);
      expect(categoryResponse.body.every((p: { category: string }) => p.category === "Audio")).toBe(true);

      const combinedResponse = await request(app)
        .get("/api/products")
        .query({ search: "Headset", category: "Audio" });
      expect(combinedResponse.status).toBe(200);
      expect(combinedResponse.body).toHaveLength(1);

      const emptyResponse = await request(app)
        .get("/api/products")
        .query({ search: "NonExistentProductXYZ" });
      expect(emptyResponse.status).toBe(200);
      expect(emptyResponse.body).toEqual([]);
    });

    it("returns product by ID and 404 for missing product", async () => {
      const found = await request(app).get(`/api/products/${keyboardProduct.id}`);
      expect(found.status).toBe(200);
      expect(found.body.id).toBe(keyboardProduct.id);

      const missing = await request(app).get("/api/products/not-found");
      expect(missing.status).toBe(404);
    });
  });

  describe("Cart & Stock Validation", () => {
    it("blocks unauthenticated cart access", async () => {
      const response = await request(app).get("/api/cart");
      expect(response.status).toBe(401);
    });

    it("validates invalid quantities, missing products, and missing cart items", async () => {
      const zeroQty = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: keyboardProduct.id, quantity: 0 });
      expect(zeroQty.status).toBe(400);

      const missingProduct = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: "missing-product-id", quantity: 1 });
      expect(missingProduct.status).toBe(404);

      const overStock = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: keyboardProduct.id, quantity: 999 });
      expect(overStock.status).toBe(400);

      const patchMissingCartItem = await request(app)
        .patch(`/api/cart/items/${keyboardProduct.id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ quantity: 1 });
      expect(patchMissingCartItem.status).toBe(404);

      const deleteMissingCartItem = await request(app)
        .delete(`/api/cart/items/${keyboardProduct.id}`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(deleteMissingCartItem.status).toBe(404);
    });

    it("adds, increments, updates, and deletes cart items", async () => {
      const add1 = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: keyboardProduct.id, quantity: 1 });
      expect(add1.status).toBe(201);
      expect(add1.body.quantity).toBe(1);

      const add2 = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: keyboardProduct.id, quantity: 1 });
      expect(add2.status).toBe(201);
      expect(add2.body.quantity).toBe(2);

      const update = await request(app)
        .patch(`/api/cart/items/${keyboardProduct.id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ quantity: 1 });
      expect(update.status).toBe(200);
      expect(update.body.quantity).toBe(1);

      const remove = await request(app)
        .delete(`/api/cart/items/${keyboardProduct.id}`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(remove.status).toBe(204);
    });
  });

  describe("Checkout, Stock Decrement, Orders & Isolation", () => {
    it("blocks unauthenticated checkout and empty cart checkout", async () => {
      const unauth = await request(app).post("/api/checkout").send();
      expect(unauth.status).toBe(401);

      const empty = await request(app)
        .post("/api/checkout")
        .set("Authorization", `Bearer ${customerToken}`)
        .send();
      expect(empty.status).toBe(400);
    });

    it("completes checkout, decrements stock in DB, empties cart, and isolates orders per user", async () => {
      const beforeProduct = await prisma.product.findUniqueOrThrow({
        where: { id: keyboardProduct.id },
      });

      const addRes = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: keyboardProduct.id, quantity: 1 });
      expect(addRes.status).toBe(201);

      const checkoutRes = await request(app)
        .post("/api/checkout")
        .set("Authorization", `Bearer ${customerToken}`)
        .send();
      expect(checkoutRes.status).toBe(201);
      expect(checkoutRes.body.totalInCents).toBe(beforeProduct.priceInCents);
      expect(checkoutRes.body.items).toHaveLength(1);

      const afterProduct = await prisma.product.findUniqueOrThrow({
        where: { id: keyboardProduct.id },
      });
      expect(afterProduct.stock).toBe(beforeProduct.stock - 1);

      const cartAfter = await request(app)
        .get("/api/cart")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(cartAfter.status).toBe(200);
      expect(cartAfter.body).toEqual([]);

      const userAOrders = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(userAOrders.status).toBe(200);
      expect(userAOrders.body.some((o: { id: string }) => o.id === checkoutRes.body.id)).toBe(true);

      const userBOrders = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${secondUserToken}`);
      expect(userBOrders.status).toBe(200);
      expect(userBOrders.body.some((o: { id: string }) => o.id === checkoutRes.body.id)).toBe(false);

      // Restore stock so repeated local runs stay deterministic
      await prisma.product.update({
        where: { id: keyboardProduct.id },
        data: { stock: { increment: 1 } },
      });
    });

    it("prevents duplicate orders when two concurrent checkouts run for the same user", async () => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const regRes = await request(app).post("/api/auth/register").send({
        name: "Race Condition User",
        email: `race.${unique}@example.com`,
        password: "Password123!",
      });
      expect(regRes.status).toBe(201);
      const raceToken = regRes.body.token as string;

      const headset = await prisma.product.findFirstOrThrow({
        where: { name: "Noise Cancelling Headset" },
      });
      const originalStock = headset.stock;
      expect(originalStock).toBeGreaterThanOrEqual(2);

      const addRes = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${raceToken}`)
        .send({ productId: headset.id, quantity: 1 });
      expect(addRes.status).toBe(201);

      try {
        const [res1, res2] = await Promise.all([
          request(app).post("/api/checkout").set("Authorization", `Bearer ${raceToken}`).send(),
          request(app).post("/api/checkout").set("Authorization", `Bearer ${raceToken}`).send(),
        ]);

        const statuses = [res1.status, res2.status].sort((a, b) => a - b);
        expect(statuses[0]).toBe(201);
        expect([400, 409]).toContain(statuses[1]);

        const ordersRes = await request(app)
          .get("/api/orders")
          .set("Authorization", `Bearer ${raceToken}`);
        expect(ordersRes.status).toBe(200);
        expect(ordersRes.body).toHaveLength(1);

        const afterHeadset = await prisma.product.findUniqueOrThrow({ where: { id: headset.id } });
        expect(afterHeadset.stock).toBe(originalStock - 1);
      } finally {
        await prisma.product.update({
          where: { id: headset.id },
          data: { stock: originalStock },
        });
      }
    });

    it("rejects checkout if the cart quantity changes after it was read", async () => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const registered = await request(app).post("/api/auth/register").send({
        name: "Cart Update Race",
        email: `cart.update.${unique}@example.com`,
        password: "Password123!",
      });
      expect(registered.status).toBe(201);
      const token = registered.body.token as string;
      const product = await prisma.product.findFirstOrThrow({ where: { name: "Noise Cancelling Headset" } });
      expect(product.stock).toBeGreaterThanOrEqual(2);
      expect((await request(app).post("/api/cart/items")
        .set("Authorization", `Bearer ${token}`)
        .send({ productId: product.id, quantity: 1 })).status).toBe(201);

      // A statement trigger plus an advisory lock creates a real PostgreSQL barrier:
      // checkout reads quantity 1, waits before DELETE, and PATCH commits quantity 2.
      // This runs only against the disposable test database.
      const lockKey = 781230019;
      await prisma.$executeRawUnsafe(`CREATE FUNCTION qa_checkout_barrier() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN PERFORM pg_advisory_xact_lock(${lockKey}); RETURN NULL; END; $$`);
      await prisma.$executeRawUnsafe(`CREATE TRIGGER qa_checkout_barrier_trigger BEFORE DELETE ON "CartItem"
        FOR EACH STATEMENT EXECUTE FUNCTION qa_checkout_barrier()`);
      let checkout: Promise<request.Response> | undefined;
      try {
        await prisma.$transaction(async (barrier) => {
          await barrier.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
          checkout = request(app).post("/api/checkout")
            .set("Authorization", `Bearer ${token}`).then((result) => result);

          let reachedBarrier = false;
          for (let attempt = 0; attempt < 100; attempt++) {
            const rows = await barrier.$queryRaw<Array<{ blocked: boolean }>>`
              SELECT EXISTS (SELECT 1 FROM pg_locks
                WHERE locktype = 'advisory' AND NOT granted) AS blocked`;
            if (rows[0]?.blocked) {
              reachedBarrier = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          expect(reachedBarrier).toBe(true);
          const updated = await request(app).patch(`/api/cart/items/${product.id}`)
            .set("Authorization", `Bearer ${token}`).send({ quantity: 2 });
          expect(updated.status).toBe(200);
        }, { timeout: 15000 });

        const result = await checkout;
        expect(result?.status).toBe(409);
        const orders = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`);
        expect(orders.body).toHaveLength(0);
        const cart = await request(app).get("/api/cart").set("Authorization", `Bearer ${token}`);
        expect(cart.body).toHaveLength(1);
        expect(cart.body[0].quantity).toBe(2);
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS qa_checkout_barrier_trigger ON "CartItem"');
        await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS qa_checkout_barrier()");
        await prisma.product.update({ where: { id: product.id }, data: { stock: product.stock } });
      }
    }, 20000);

    it("allows at most one order when two users compete for the last unit", async () => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const users: Array<{ id: string; token: string }> = [];
      let productId: string | undefined;
      try {
        for (const index of [1, 2]) {
          const response = await request(app).post("/api/auth/register").send({
            name: `Stock race ${index}`,
            email: `stock-race-${unique}-${index}@example.com`,
            password: "Password123!",
          });
          expect(response.status).toBe(201);
          users.push({ id: response.body.user.id, token: response.body.token });
        }
        const product = await prisma.product.create({ data: {
          name: `Last unit ${unique}`, description: "Synthetic isolated product",
          category: "Test", priceInCents: 2500, stock: 1, imageUrl: "https://example.invalid/product.png",
        } });
        productId = product.id;
        for (const user of users) {
          const response = await request(app).post("/api/cart/items")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ productId, quantity: 1 });
          expect(response.status).toBe(201);
        }

        const responses = await Promise.all(users.map((user) => request(app).post("/api/checkout")
          .set("Authorization", `Bearer ${user.token}`).send()));
        expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
        const orders = await prisma.order.findMany({ where: { userId: { in: users.map((user) => user.id) } }, include: { items: true } });
        expect(orders).toHaveLength(1);
        const order = orders[0];
        if (!order) throw new Error("Expected exactly one order");
        expect(order.items).toHaveLength(1);
        const item = order.items[0];
        if (!item) throw new Error("Expected exactly one order item");
        expect(item.productId).toBe(productId);
        expect(item.quantity).toBe(1);
        expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(0);
        expect(await prisma.cartItem.count({ where: { productId } })).toBe(1);
      } finally {
        // Only remove this test's synthetic accounts and product in the isolated test database.
        if (users.length) await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
        if (productId) await prisma.product.delete({ where: { id: productId } });
      }
    });

    it("prevents overselling when stock drops before checkout", async () => {
      const dockProduct = await prisma.product.findFirstOrThrow({
        where: { name: "USB-C Dock" },
      });
      const originalStock = dockProduct.stock;

      const addRes = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${secondUserToken}`)
        .send({ productId: dockProduct.id, quantity: 2 });
      expect(addRes.status).toBe(201);

      // Simulate another buyer reducing stock to 1 before checkout
      await prisma.product.update({
        where: { id: dockProduct.id },
        data: { stock: 1 },
      });

      try {
        const checkoutRes = await request(app)
          .post("/api/checkout")
          .set("Authorization", `Bearer ${secondUserToken}`)
          .send();
        expect([400, 409]).toContain(checkoutRes.status);
      } finally {
        await prisma.product.update({
          where: { id: dockProduct.id },
          data: { stock: originalStock },
        });
        await prisma.cartItem.deleteMany({
          where: { productId: dockProduct.id },
        });
      }
    });
  });
});
