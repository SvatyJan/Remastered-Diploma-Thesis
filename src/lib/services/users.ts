"use server";

import { prisma } from "@/db";
import { hashPassword, createSession, verifyPassword } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

/**
 * Registrace nového uživatele.
 * - vyžaduje: username, email, password
 * - kontrola duplicit na username i email
 * - ukládá hash do pole `password`
 */
export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) throw new Error("Neplatná data");

  const { username, email, password } = parsed.data;

  // kolize na username nebo email
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
    select: { id: true, username: true, email: true },
  });
  if (existing) {
    if (existing.username === username) throw new Error("Uživatelské jméno je již obsazené");
    if (existing.email === email) throw new Error("E-mail je již používán");
    throw new Error("Uživatel už existuje");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: passwordHash, // <-- HASH ukládáme do `password`
      isActive: true,
    },
    select: { id: true },
  });

  await createSession(user.id.toString()); // id je bigint
  revalidatePath("/");
  return { ok: true };
}

/**
 * Login uživatele.
 * - přijímá identifier = email NEBO username (vezme `email` z formuláře, a když není validní email, zkusí username)
 * - heslo ověřuje proti poli `password`
 */
export async function loginUser(formData: FormData) {
  const identifierValue = formData.get("email") ?? formData.get("username") ?? "";
  const identifier = typeof identifierValue === "string" ? identifierValue : "";
  const parsed = loginSchema.safeParse({
    // podporujeme obě cesty: pokud FE pošle 'email', použijeme ho;
    // když pošle 'username', loginSchema to také zvládne (viz úprava níže).
    email: identifier,
    password: formData.get("password"),
  });
  if (!parsed.success) throw new Error("Neplatná data");

  const password = parsed.data.password;

  // rozlišíme podle formátu, ale stejně hledáme OR na obě pole
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user || !user.password) throw new Error("Špatné přihlašovací údaje");

  const ok = await verifyPassword(password, user.password);
  if (!ok) throw new Error("Špatné přihlašovací údaje");

  await createSession(user.id.toString());
  return { ok: true };
}
