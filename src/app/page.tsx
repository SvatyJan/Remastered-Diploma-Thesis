import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/db";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const hasCharacter = await prisma.character.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (hasCharacter) redirect("/game");
  redirect("/game/new");
}
