import { z } from "zod";
import { isValidEmail } from "../../lib/validators.js";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().refine(isValidEmail, "Invalid email format."),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().refine(isValidEmail, "Invalid email format."),
  password: z.string().min(8),
});
