const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: 'hero@example.com' },
    update: {},
    create: { email: 'hero@example.com', name: 'Hero' },
  });

  const sword = await db.item.upsert({
    where: { id: 'seed-sword' },
    update: {},
    create: {
      id: 'seed-sword',
      name: 'Iron Sword',
      type: 'weapon',
      rarity: 'common',
      baseStats: { atk: 5 },
      stackable: false,
    },
  });

  const character = await db.character.create({
    data: {
      userId: user.id,
      name: 'Aldor',
      class: 'Warrior',
      stats: { str: 10, agi: 5, int: 2 },
      items: { create: [{ itemId: sword.id, qty: 1 }] },
      quests: { create: [] },
    },
  });

  await db.quest.create({
    data: {
      code: 'Q_START',
      title: 'First Steps',
      description: 'Talk to the village elder.',
      progress: { create: [{ characterId: character.id, state: 'in_progress' }] },
    },
  });

  console.log('Seed done.');
}

main().finally(() => db.$disconnect());
