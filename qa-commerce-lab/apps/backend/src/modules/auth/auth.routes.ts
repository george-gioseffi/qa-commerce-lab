import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { signToken } from "../../lib/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", async (request, response) => {
  const payload = registerSchema.safeParse(request.body);

  if (!payload.success) {
    return response.status(400).json({ message: "Invalid registration payload." });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.data.email.toLowerCase() },
  });

  if (existingUser) {
    return response.status(409).json({ message: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: payload.data.name,
      email: payload.data.email.toLowerCase(),
      passwordHash,
    },
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return response.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post("/login", async (request, response) => {
  const payload = loginSchema.safeParse(request.body);

  if (!payload.success) {
    return response.status(400).json({ message: "Invalid login payload." });
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.data.email.toLowerCase() },
  });

  if (!user) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await bcrypt.compare(payload.data.password, user.passwordHash);

  if (!passwordMatches) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: request.user!.id },
    select: { id: true, name: true, email: true, role: true },
  });

  return response.json(user);
});
