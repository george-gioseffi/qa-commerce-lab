import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../app.js";

let token = "";
let productId = "";

describe("API smoke coverage", () => {
  beforeAll(async () => {
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "qa.customer@example.com",
      password: "Password123!",
    });

    token = loginResponse.body.token;
    const productsResponse = await request(app).get("/api/products");
    productId = productsResponse.body[0]?.id;
  });

  it("registers user with valid data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "New User",
      email: `new.user.${Date.now()}@example.com`,
      password: "Password123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
  });

  it("rejects invalid email on register", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Broken User",
      email: "invalid-email",
      password: "Password123!",
    });

    expect(response.status).toBe(400);
  });

  it("rejects duplicate email registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Duplicate User",
      email: "qa.customer@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(409);
  });

  it("logs in with valid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "qa.customer@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
  });

  it("blocks invalid login", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "qa.customer@example.com",
      password: "wrong-pass",
    });

    expect(response.status).toBe(401);
  });

  it("protects cart route without token", async () => {
    const response = await request(app).get("/api/cart");
    expect(response.status).toBe(401);
  });

  it("allows protected route with token", async () => {
    const response = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it("lists products and supports filters", async () => {
    const listResponse = await request(app).get("/api/products");
    const searchResponse = await request(app).get("/api/products").query({ search: "keyboard" });
    const categoryResponse = await request(app).get("/api/products").query({ category: "Audio" });

    expect(listResponse.status).toBe(200);
    expect(searchResponse.body.length).toBeGreaterThan(0);
    expect(categoryResponse.body[0].category).toBe("Audio");
  });

  it("returns 404 for missing product", async () => {
    const response = await request(app).get("/api/products/not-found");
    expect(response.status).toBe(404);
  });

  it("manages cart items and checkout flow", async () => {
    const addResponse = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    expect(addResponse.status).toBe(201);

    const invalidAddResponse = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "missing", quantity: 1 });

    expect(invalidAddResponse.status).toBe(404);

    const updateResponse = await request(app)
      .patch(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(updateResponse.status).toBe(200);

    const checkoutResponse = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.items.length).toBeGreaterThan(0);

    const emptyCheckoutResponse = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(emptyCheckoutResponse.status).toBe(400);
  });
});
