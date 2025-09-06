import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
export const runtime = 'nodejs';

export async function GET() {
  const characters = await db.character.findMany({
    include: {
      inventories: { include: { template: { include: { attributes: { include: { attribute: true } } } } } },
      equipment: true,
      spellbook: true,
      loadouts: true,
      guildMember: { include: { guild: true } },
    },
  });
  return NextResponse.json(characters);
}
