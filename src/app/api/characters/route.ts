import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Prisma potřebuje Node runtime, ne Edge.
export const runtime = 'nodejs';

export async function GET() {
  const characters = await db.character.findMany({
    include: { items: { include: { item: true } }, quests: { include: { quest: true } } }
  });
  return NextResponse.json(characters);
}
