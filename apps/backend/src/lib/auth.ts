import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  role: "CUSTOMER" | "ADMIN";
  email: string;
};

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "2h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
