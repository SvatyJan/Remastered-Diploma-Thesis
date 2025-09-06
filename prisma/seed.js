/* eslint-disable no-console */
const { PrismaClient, Rarity } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // --- 1) KATALOGY: Attributes, Ancestry, Professions, Slot types ---
  const attributeNames = [
    'health',
    'strength',
    'agility',
    'intelligence',
    'armor',
    'magic resist',
  ];

  const [attributes, ancestries, professions, slotTypes] = await Promise.all([
    Promise.all(
      attributeNames.map((name) =>
        db.attribute.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    ),
    Promise.all(
      ['human', 'elf', 'dwarf', 'orc', 'merfolk'].map((name) =>
        db.ancestry.upsert({
          where: { name },
          update: {},
          create: { name, description: null },
        })
      )
    ),
    Promise.all(
      ['Alchemy', 'Blacksmithing', 'Tailoring'].map((name) =>
        db.profession.upsert({
          where: { name },
          update: {},
          create: { name, description: null },
        })
      )
    ),
    // pár slotů pro equipable itemy
    Promise.all(
      [
        { code: 'weapon', name: 'Weapon' },
        { code: 'offhand', name: 'Off-hand' },
        { code: 'head', name: 'Head' },
        { code: 'chest', name: 'Chest' },
        { code: 'legs', name: 'Legs' },
        { code: 'ring', name: 'Ring' },
        { code: 'amulet', name: 'Amulet' },
      ].map((s) =>
        db.slotType.upsert({
          where: { code: s.code },
          update: { name: s.name },
          create: s,
        })
      )
    ),
  ]);

  const attrByName = Object.fromEntries(attributes.map((a) => [a.name, a]));
  const ancestryByName = Object.fromEntries(ancestries.map((a) => [a.name, a]));
  const slotByCode = Object.fromEntries(slotTypes.map((s) => [s.code, s]));

  // --- 2) Monsters (3 ks) ---
  // použijeme existující ancestries: goblin→orc, skeleton→human, merrow→merfolk
  const monstersData = [
    { name: 'Goblin', ancestryName: 'orc', rarity: 'common', description: 'Small and pesky.' },
    { name: 'Skeleton', ancestryName: 'human', rarity: 'common', description: 'Reanimated bones.' },
    { name: 'Merrow', ancestryName: 'merfolk', rarity: 'uncommon', description: 'Amphibious raider.' },
  ];

  const monsters = [];
  for (const m of monstersData) {
    const created = await db.monster.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        ancestryId: ancestryByName[m.ancestryName].id,
        rarity: m.rarity,
        description: m.description,
      },
    });
    monsters.push(created);
  }

  // --- 3) Spells (10 ks) ---
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
  await Promise.all(
    spellNames.map((name) =>
      db.spell.upsert({
        where: { name },
        update: {},
        create: { name, description: null, cooldown: 0 },
      })
    )
  );

  // --- 4) Effects (4 ks) ---
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
        create: {
          code: e.code,
          name: e.name,
          stacking: e.stacking,
          effectType: e.effectType,
          maxStacks: 99,
          defaultDurationRounds: 3,
          dataJson: null,
        },
      })
    )
  );

  // --- 5) Items (20 ks) ---
  // 1: gold coin (měna), 2: diamond (premium měna), zbytek mix equip/consumables
  // Pozn.: currency items nejsou consumable / equipable, slouží jen pro účetnictví.
  const itemsData = [
    // měny
    { name: 'Gold Coin', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: false, slotCode: null, rarity: 'common', valueGold: 1, description: 'Standard currency.' },
    { name: 'Diamond', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: false, slotCode: null, rarity: 'epic',   valueGold: 0, description: 'Premium currency.' },

    // zbraně
    { name: 'Rusty Sword', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'common',   valueGold: 5,  description: null, stats: { strength: 1 } },
    { name: 'Iron Sword', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'common',   valueGold: 12, description: null, stats: { strength: 2 } },
    { name: 'Steel Axe', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'uncommon', valueGold: 30, description: null, stats: { strength: 3 } },
    { name: 'Wizard Staff', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'uncommon', valueGold: 28, description: null, stats: { intelligence: 3 } },

    // brnění/šperky
    { name: 'Leather Cap', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'head',   rarity: 'common',   valueGold: 6,  description: null, stats: { armor: 1, agility: 1 } },
    { name: 'Leather Tunic', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'chest',  rarity: 'common',   valueGold: 10, description: null, stats: { armor: 2 } },
    { name: 'Chainmail', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'chest',  rarity: 'uncommon', valueGold: 40, description: null, stats: { armor: 4 } },
    { name: 'Wizard Hat', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'head',   rarity: 'uncommon', valueGold: 35, description: null, stats: { intelligence: 2, magicresist: 1 } },
    { name: 'Ruby Ring', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'ring',   rarity: 'rare',     valueGold: 80, description: null, stats: { strength: 1, agility: 1 } },
    { name: 'Amulet of Wits', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'amulet', rarity: 'rare',     valueGold: 90, description: null, stats: { intelligence: 2 } },

    // offhand / štíty
    { name: 'Wooden Shield', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'common', valueGold: 8, description: null, stats: { armor: 2 } },
    { name: 'Kite Shield', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'uncommon', valueGold: 26, description: null, stats: { armor: 4, magicresist: 1 } },

    // consumables
    { name: 'Health Potion (Minor)', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: true, isEquipable: false, slotCode: null, rarity: 'common', valueGold: 5, description: 'Restores health.' },
    { name: 'Health Potion (Major)', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 18, description: 'Restores more health.' },
    { name: 'Stamina Elixir', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 14, description: 'Boosts agility briefly.' },
    { name: 'Intellect Tonic', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: true, isEquipable: false, slotCode: null, rarity: 'uncommon', valueGold: 14, description: 'Boosts intelligence briefly.' },

    // „lepší“ zbraň/gear
    { name: 'Elven Longsword', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'rare', valueGold: 120, description: null, stats: { strength: 4, agility: 2 } },
    { name: 'Runed Circlet', slug: it.name.toLowerCase().replace(/\s+/g, '-'), isConsumable: false, isEquipable: true, slotCode: 'head',   rarity: 'epic', valueGold: 200, description: null, stats: { intelligence: 4, magicresist: 2 } },
  ];

  // helper pro mapování názvů → attributeId
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
      where: { // není unique name, tak použijeme kombinaci name+valueGold jako poor-man; v reálu zvaž @unique na name
        id: 0, // workaround: upsert vyžaduje unique; přepíšeme to následně create+catch
      },
      update: {},
      create: {
        name: it.name,
        isConsumable: it.isConsumable,
        isEquipable: it.isEquipable,
        slotCode: it.slotCode ? slotByCode[it.slotCode]?.code ?? null : null,
        rarity: it.rarity,
        valueGold: it.valueGold,
        description: it.description,
      },
    }).catch(async () => {
      // Pokud upsert selže kvůli unique constraintům v budoucnu, zkusíme findFirst+update
      const existing = await db.itemTemplate.findFirst({ where: { name: it.name } });
      if (existing) return existing;
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
        },
      });
    });

    // napoj atributy, pokud má item stats
    if (it.stats) {
      const pairs = Object.entries(it.stats)
        .map(([k, v]) => {
          const attrId = statToAttributeId(k);
          return attrId ? { attributeId: attrId, value: Number(v) } : null;
        })
        .filter(Boolean);

      for (const p of pairs) {
        await db.itemTemplateAttribute.upsert({
          where: {
            itemTemplateId_attributeId: {
              itemTemplateId: created.id,
              attributeId: p.attributeId,
            },
          },
          update: { value: p.value },
          create: {
            itemTemplateId: created.id,
            attributeId: p.attributeId,
            value: p.value,
          },
        });
      }
    }
  }

  console.log('Seed complete ✅');
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    return db.$disconnect().finally(() => process.exit(1));
  });
