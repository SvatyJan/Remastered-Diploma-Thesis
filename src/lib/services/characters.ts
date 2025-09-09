"use server";

import { prisma } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { createCharacterSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export async function createCharacter(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nepřihlášený uživatel");

  const parsed = createCharacterSchema.safeParse({
    name: formData.get("name"),
    ancestryId: formData.get("ancestryId"), // Zod => bigint
  });
  if (!parsed.success) throw new Error("Neplatná data");

  const { name, ancestryId } = parsed.data; // ancestryId: bigint

  // limit na počet postav
  const count = await prisma.character.count({ where: { userId: user.id } });
  if (count >= 3) throw new Error("Limit 3 postav na účet");

  // načtení templátů (máš slugy v modelu)
  const gold = await prisma.itemTemplate.findUniqueOrThrow({ where: { slug: "gold-coin" } });
  const starterWeapon = await prisma.itemTemplate.findUnique({ where: { slug: "rusty-sword" } });

    await prisma.$transaction(async (tx: {
        character: {
          create: (arg0: {
            data: {
              name: string; userId: any; // BigInt
              ancestryId: bigint; // BigInt (viz Zod níže)
              level: number; xp: bigint; // BigInt literal!
              // ✅ správný nested create pro CharacterInventory
              inventories: { create: { amount: number; template: { connect: { id: any; }; }; }[]; };
            };
          }) => any;
        };
      }) => {
      await tx.character.create({
        data: {
          name,
          userId: user.id,   // BigInt
          ancestryId,        // BigInt (viz Zod níže)
          level: 1,
          xp: BigInt(0),            // BigInt literal!

          // ✅ správný nested create pro CharacterInventory
          inventories: {
            create: [
              {
                amount: 100,
                template: { connect: { id: gold.id } },          // <— relace "template"
              },
              ...(starterWeapon
                ? [{
                    amount: 1,
                    template: { connect: { id: starterWeapon.id } },
                  }]
                : []),
            ],
          },
        },
      });
    });

  redirect("/characters");
}
