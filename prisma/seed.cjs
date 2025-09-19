/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // --- 1) KATALOGY: Attributes, Ancestry, Professions, Slot types ---
  const attributeNames = [
    'health',
    'armor',
    'magic resist',
    'strength',
    'agility',
    'intelligence',
  ];

  const ancestrySeed = [
    { name: 'Human', description: 'Versatile' },
    { name: 'Elf', description: 'Agile' },
    { name: 'Dwarf', description: 'Strong' },
    { name: 'Merfolk', description: 'Magic' },
  ];

  const slotTypeSeed = [
    { code: 'head', name: 'Head' },
    { code: 'neck', name: 'Neck' },
    { code: 'shoulder', name: 'Shoulder' },
    { code: 'back', name: 'Back' },
    { code: 'chest', name: 'Chest' },
    { code: 'wrist', name: 'Wrist' },
    { code: 'hands', name: 'Hands' },
    { code: 'waist', name: 'Waist' },
    { code: 'legs', name: 'Legs' },
    { code: 'feet', name: 'Feet' },
    { code: 'ring', name: 'Ring' },
    { code: 'trinket', name: 'Trinket' },
    { code: 'mainhand', name: 'Main-hand' },
    { code: 'offhand', name: 'Off-hand' },
  ];

  const spellSlotTypeSeed = [
    { code: 'spell', name: 'Spell', maxPerCharacter: 3 },
    { code: 'passive', name: 'Passive', maxPerCharacter: 1 },
    { code: 'ultimate', name: 'Ultimate', maxPerCharacter: 1 },
  ];

  const [attributes, ancestries, professions, slotTypes, spellSlotTypes] = await Promise.all([
    Promise.all(
      attributeNames.map((name) =>
        db.attribute.upsert({ where: { name }, update: {}, create: { name } })
      )
    ),
    Promise.all(
      ancestrySeed.map(({ name, description }) =>
        db.ancestry.upsert({
          where: { name },
          update: { description },
          create: { name, description },
        })
      )
    ),
    Promise.all(
      ['Alchemy', 'Blacksmithing', 'Tailoring'].map((name) =>
        db.profession.upsert({ where: { name }, update: {}, create: { name, description: null } })
      )
    ),
    Promise.all(
      slotTypeSeed.map((s) => db.slotType.upsert({ where: { code: s.code }, update: { name: s.name }, create: s }))
    ),
    Promise.all(
      spellSlotTypeSeed.map((s) =>
        db.spellSlotType.upsert({
          where: { code: s.code },
          update: { name: s.name, maxPerCharacter: s.maxPerCharacter },
          create: { code: s.code, name: s.name, maxPerCharacter: s.maxPerCharacter },
        })
      )
    ),
  ]);

  const attrByName = Object.fromEntries(attributes.map((a) => [a.name, a]));
  const ancestryByName = Object.fromEntries(ancestries.map((a) => [a.name.toLowerCase(), a]));
  const slotByCode = Object.fromEntries(slotTypes.map((s) => [s.code, s]));
  const spellSlotByCode = Object.fromEntries(spellSlotTypes.map((s) => [s.code, s]));

  // --- 2) Monsters ---
  const monstersData = [
    { name: 'Goblin', ancestryName: 'dwarf', rarity: 'common', description: 'Small and pesky.' },
    { name: 'Skeleton', ancestryName: 'human', rarity: 'common', description: 'Reanimated bones.' },
    { name: 'Merrow', ancestryName: 'merfolk', rarity: 'uncommon', description: 'Amphibious raider.' },
  ];
  for (const m of monstersData) {
    await db.monster.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        ancestryId: ancestryByName[m.ancestryName.toLowerCase()].id,
        rarity: m.rarity,
        description: m.description,
      },
    });
  }

  // --- 3) Spells ---
  const spellNames = [
    'Passive: Double Attack',
    'Passive: Double Cast',
    'Fireball',
    'Cleave',
    'Shiv',
    'Ice Lance',
    'Arcane Bolt',
    'Heal',
    'Shield',
    'Poison Dagger',
  ];
  const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-');
  await Promise.all(
    spellNames.map((name) =>
      db.spell.upsert({
        where: { name },
        update: { slotCode: 'spell' },
        create: { name, slug: slugify(name), description: null, cooldown: 0, slotCode: 'spell' },
      })
    )
  );

  // --- 4) Effects ---
  const effectsData = [
    { code: 'double_strike', name: 'Double Strike', stacking: 'refresh', effectType: 'physical' },
    { code: 'double_cast', name: 'Double Cast', stacking: 'refresh', effectType: 'magic' },
    { code: 'hot', name: 'Heal over Time', stacking: 'stack', effectType: 'magic' },
    { code: 'dot', name: 'Damage over Time', stacking: 'stack', effectType: 'poison' },
  ];
  await Promise.all(
    effectsData.map((e) =>
      db.effect.upsert({
        where: { code: e.code },
        update: {},
        create: { code: e.code, name: e.name, description: null, stacking: e.stacking, effectType: e.effectType },
      })
    )
  );

  // --- 5) Items ---
  const itemsData = [
    { name: 'Gold Coin', isConsumable: false, isEquipable: false, slotCode: null, rarity: 'common', valueGold: 1, description: 'Standard currency.', inShop: false },
    { name: 'Diamond', isConsumable: false, isEquipable: false, slotCode: null, rarity: 'epic', valueGold: 0, description: 'Premium currency.', inShop: false },
    { name: 'Rusty Sword', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'mainhand', rarity: 'common', valueGold: 5, description: null, stats: { strength: 1 } },
    { name: 'Iron Sword', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'mainhand', rarity: 'common', valueGold: 12, description: null, stats: { strength: 2 } },
    { name: 'Steel Axe', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'uncommon', valueGold: 30, description: null, stats: { strength: 3 } },
    { name: 'Wizard Staff', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'uncommon', valueGold: 28, description: null, stats: { intelligence: 3 } },
    { name: 'Leather Cap', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'common', valueGold: 6, description: null, stats: { armor: 1, agility: 1 } },
    { name: 'Leather Tunic', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'common', valueGold: 10, description: null, stats: { armor: 2 } },
    { name: 'Chainmail', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'uncommon', valueGold: 40, description: null, stats: { armor: 4 } },
    { name: 'Wizard Hat', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'uncommon', valueGold: 35, description: null, stats: { intelligence: 2, magicresist: 1 } },
    { name: 'Ruby Ring', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'rare', valueGold: 80, description: null, stats: { strength: 1, agility: 1 } },
    { name: 'Amulet of Wits', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'neck', rarity: 'rare', valueGold: 90, description: null, stats: { intelligence: 2 } },
    { name: 'Wooden Shield', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'common', valueGold: 8, description: null, stats: { armor: 2 } },
    { name: 'Kite Shield', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'uncommon', valueGold: 26, description: null, stats: { armor: 4, magicresist: 1 } },
    { name: 'Health Potion (Minor)', inShop: true, isConsumable: true, isEquipable: false, slotCode: null, rarity: 'common', valueGold: 5, description: 'Restores health.' },
    { name: 'Health Potion (Major)', inShop: true, isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 18, description: 'Restores more health.' },
    { name: 'Stamina Elixir', inShop: true, isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 14, description: 'Boosts agility briefly.' },
    { name: 'Intellect Tonic', inShop: true, isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 14, description: 'Boosts intelligence briefly.' },
    { name: 'Elven Longsword', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'rare', valueGold: 120, description: null, stats: { strength: 4, agility: 2 } },
    { name: 'Runed Circlet', inShop: true, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'epic', valueGold: 200, description: null, stats: { intelligence: 4, magicresist: 2 } },
  ];

  const statToAttributeId = (k) => {
    switch (k) {
      case 'health': return attrByName['health'].id;
      case 'strength': return attrByName['strength'].id;
      case 'agility': return attrByName['agility'].id;
      case 'intelligence': return attrByName['intelligence'].id;
      case 'armor': return attrByName['armor'].id;
      case 'magicresist': return attrByName['magic resist'].id;
      default: return null;
    }
  };

  for (const it of itemsData) {
    const created = await db.itemTemplate.upsert({
      where: { id: 0 },
      update: {},
      create: {
        name: it.name,
        slug: it.name.toLowerCase().replace(/\s+/g, '-'),
        isConsumable: it.isConsumable,
        isEquipable: it.isEquipable,
        slotCode: it.slotCode ? slotByCode[it.slotCode]?.code ?? null : null,
        rarity: it.rarity,
        valueGold: it.valueGold,
        description: it.description,
        inShop: Boolean(it.inShop),
      },
    }).catch(async () => {
      const existing = await db.itemTemplate.findFirst({ where: { name: it.name } });
      if (existing) {
        return db.itemTemplate.update({
          where: { id: existing.id },
          data: {
            isConsumable: it.isConsumable,
            isEquipable: it.isEquipable,
            slotCode: it.slotCode ? slotByCode[it.slotCode]?.code ?? null : null,
            rarity: it.rarity,
            valueGold: it.valueGold,
            description: it.description,
            inShop: Boolean(it.inShop),
          },
        });
      }
      return db.itemTemplate.create({
        data: {
          name: it.name,
          slug: it.name.toLowerCase().replace(/\s+/g, '-'),
          isConsumable: it.isConsumable,
          isEquipable: it.isEquipable,
          slotCode: it.slotCode ? slotByCode[it.slotCode]?.code ?? null : null,
          rarity: it.rarity,
          valueGold: it.valueGold,
          description: it.description,
          inShop: Boolean(it.inShop),
        },
      });
    });

    if (it.stats) {
      const pairs = Object.entries(it.stats)
        .map(([k, v]) => {
          const attrId = statToAttributeId(k);
          return attrId ? { attributeId: attrId, value: Number(v) } : null;
        })
        .filter(Boolean);
      for (const p of pairs) {
        await db.itemTemplateAttribute.upsert({
          where: { itemTemplateId_attributeId: { itemTemplateId: created.id, attributeId: p.attributeId } },
          update: { value: p.value },
          create: { itemTemplateId: created.id, attributeId: p.attributeId, value: p.value },
        });
      }
    }
  }

  console.log('Seed complete ✔');
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    return db.$disconnect().finally(() => process.exit(1));
  });
