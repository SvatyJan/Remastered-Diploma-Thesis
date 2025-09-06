import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const createCharacterSchema = z.object({
  name: z.string().min(3).max(64),
  ancestryId: z.coerce.bigint(),
});
