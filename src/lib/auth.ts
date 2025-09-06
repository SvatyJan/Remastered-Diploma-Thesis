import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "@/db"; // tvůj singleton
import { cache } from "react";

// jednoduchý cookie-based session skeleton (pro produkci zvaž jwt+rotaci/iron-session/Auth.js)
const SESSION_COOKIE = "rpg_session";

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(pw, salt);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  // velmi jednoduché – pro produkci vynes do tabulky Session a použi náhodný token
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
});
