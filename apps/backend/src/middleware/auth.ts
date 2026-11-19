import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "CUSTOMER" | "ADMIN";
      };
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const payload = verifyToken(authHeader.replace("Bearer ", ""));
    request.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid authentication token." });
  }
}
