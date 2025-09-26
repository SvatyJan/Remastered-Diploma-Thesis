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
    'mana',
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
  const spellsSeed = [
    {
      name: 'Passive: Double Attack',
      description: null,
      slotCode: 'passive',
      cooldown: 0,
      castType: 'self',
      target: 'self',
      range: 0,
      areaRange: 0,
      damage: 0,
      manaCost: 0,
    },
    {
      name: 'Passive: Double Cast',
      description: null,
      slotCode: 'passive',
      cooldown: 0,
      castType: 'self',
      target: 'self',
      range: 0,
      areaRange: 0,
      damage: 0,
      manaCost: 0,
    },
    {
      name: 'Fireball',
      description: 'Launches a fiery orb at the enemy and ignites them. Damage 5 + Intelligece. Ignite Damage per Intelligence.',
      slotCode: 'spell',
      cooldown: 2,
      castType: 'point_click',
      target: 'enemy',
      range: 6,
      areaRange: 0,
      damage: 5,
      manaCost: 5,
      effects: [
        { code: 'ignite', durationRounds: 2, magnitude: 1 },
      ],
    },
    {
      name: 'Shiv',
      description: 'Shivs an enemy with a quick strike. Damage 5 + Agility.',
      slotCode: 'spell',
      cooldown: 0,
      castType: 'point_click',
      target: 'enemy',
      range: 1,
      areaRange: 0,
      damage: 10,
      manaCost: 0,
    },
    {
      name: 'Heal',
      description: 'Heals an ally for 10 + Intelligence.',
      slotCode: 'spell',
      cooldown: 2,
      castType: 'point_click',
      target: 'ally',
      range: 4,
      areaRange: 0,
      damage: 10,
      manaCost: 6,
    },
    {
      name: 'Strike',
      description: 'Strikes and enemy dealing 10 + Strength damage.',
      slotCode: 'spell',
      cooldown: 1,
      castType: 'point_click',
      target: 'enemy',
      range: 1,
      areaRange: 0,
      damage: 10,
      manaCost: 0,
    },
  ];
  const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-');
  const inferSpellSlotCode = (name) => {
    const lower = name.toLowerCase();
    if (lower.startsWith('passive')) return 'passive';
    if (lower.includes('ultimate')) return 'ultimate';
    return 'spell';
  };

  const spellsByName = {};
  for (const spell of spellsSeed) {
    const slotCodeRaw = (spell.slotCode ?? inferSpellSlotCode(spell.name)).toLowerCase();
    const slotCode = spellSlotByCode[slotCodeRaw] ? slotCodeRaw : 'spell';
    const payload = {
      name: spell.name,
      slug: slugify(spell.name),
      description: spell.description ?? null,
      cooldown: spell.cooldown ?? 0,
      slotCode,
      castType: spell.castType ?? 'point_click',
      target: spell.target ?? 'enemy',
      range: spell.range ?? 1,
      areaRange: spell.areaRange ?? 0,
      damage: spell.damage ?? 0,
      manaCost: spell.manaCost ?? 0,
    };
    const record = await db.spell.upsert({
      where: { name: spell.name },
      update: payload,
      create: payload,
    });
    spellsByName[spell.name] = record;
  }

  // --- 4) Effects ---
  const effectsData = [
    { code: 'double_strike', name: 'Double Strike', stacking: 'refresh', effectType: 'physical', description: null, defaultDurationRounds: null },
    { code: 'double_cast', name: 'Double Cast', stacking: 'refresh', effectType: 'magic', description: null, defaultDurationRounds: null },
    { code: 'hot', name: 'Heal over Time', stacking: 'stack', effectType: 'magic', description: null, defaultDurationRounds: null },
    { code: 'dot', name: 'Damage over Time', stacking: 'stack', effectType: 'poison', description: null, defaultDurationRounds: null },
    { code: 'ignite', name: 'Ignite', stacking: 'refresh', effectType: 'magic', description: 'Burns the target for a short duration.', defaultDurationRounds: 2 },
  ];
  const effects = await Promise.all(
    effectsData.map((e) =>
      db.effect.upsert({
        where: { code: e.code },
        update: {
          name: e.name,
          description: e.description ?? null,
          stacking: e.stacking,
          effectType: e.effectType,
          defaultDurationRounds: e.defaultDurationRounds ?? null,
          dataJson: null,
        },
        create: {
          code: e.code,
          name: e.name,
          description: e.description ?? null,
          stacking: e.stacking,
          effectType: e.effectType,
          defaultDurationRounds: e.defaultDurationRounds ?? null,
          dataJson: null,
        },
      })
    )
  );
  const effectByCode = Object.fromEntries(effects.map((effect) => [effect.code, effect]));

  for (const spell of spellsSeed) {
    const record = spellsByName[spell.name];
    if (!record) continue;
    await db.spellEffect.deleteMany({ where: { spellId: record.id } });
    if (!spell.effects || spell.effects.length === 0) continue;
    for (const effectSeed of spell.effects) {
      const effect = effectByCode[effectSeed.code];
      if (!effect) continue;
      await db.spellEffect.create({
        data: {
          spellId: record.id,
          effectId: effect.id,
          durationRounds: effectSeed.durationRounds ?? effect.defaultDurationRounds ?? 0,
          magnitude: effectSeed.magnitude ?? 0,
          dataJson: effectSeed.dataJson ?? null,
        },
      });
    }
  }

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
    { name: 'Dreadful Gladiator Helmet', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 25, magicresist: 15, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Neck', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'neck', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 25, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Chest', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 25, magicresist: 15, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Waist', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'waist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 10, magicresist: 10, health: 60, strength: 10 } },
    { name: 'Dreadful Gladiator Leggins', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'legs', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 25, magicresist: 15, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Boots', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'feet', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 10, magicresist: 10, health: 60, strength: 10 } },
    { name: 'Dreadful Gladiator Shoulders', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'shoulder', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 25, magicresist: 15, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Cape', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'back', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 25, health: 80, strength: 12 } },
    { name: 'Dreadful Gladiator Sword', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'mainhand', rarity: 'legendary', valueGold: 1500, description: null, stats: { damage: 60, strength: 25 } },
    { name: 'Dreadful Gladiator Shield', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'legendary', valueGold: 800, description: null, stats: { armor: 15, magicresist: 15, health: 60, strength: 15} },
    { name: 'Dreadful Gladiator Talisman', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'trinket', rarity: 'legendary', valueGold: 1800, description: null, stats: { magicresist: 35, health: 100, strength: 25 } },
    { name: 'Dreadful Gladiator Ring', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'legendary', valueGold: 800, description: null, stats: { armor: 35, health: 100, strength: 25 } },
    { name: 'Dreadful Gladiator Wrist', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'wrist', rarity: 'legendary', valueGold: 1000, description: null, stats: {  armor: 10, magicresist: 10, health: 60, strength: 10 } },
    { name: 'Dreadful Gladiator Hands', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'hands', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 25, magicresist: 15, health: 100, strength: 15 } },
    { name: 'Dreadful Gladiator Longsword', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'legendary', valueGold: 2300, description: null, stats: { damage: 120, strength: 25, agility: 25 } },
    { name: 'Arcane Sage Hood', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 25, mana: 120, intelligence: 20 } },
    { name: 'Arcane Sage Pendant', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'neck', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 30, mana: 100, intelligence: 18 } },
    { name: 'Arcane Sage Robe', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 15, magicresist: 25, mana: 120, intelligence: 20 } },
    { name: 'Arcane Sage Sash', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'waist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 15, mana: 60, intelligence: 12 } },
    { name: 'Arcane Sage Leggings', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'legs', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 15, magicresist: 25, mana: 100, intelligence: 20 } },
    { name: 'Arcane Sage Slippers', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'feet', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 15, mana: 60, intelligence: 12 } },
    { name: 'Arcane Sage Mantle', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'shoulder', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 25, mana: 80, intelligence: 18 } },
    { name: 'Arcane Sage Cloak', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'back', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 20, mana: 80, intelligence: 15 } },
    { name: 'Arcane Sage Staff', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'legendary', valueGold: 2300, description: null, stats: { damage: 90, intelligence: 30, mana: 150 } },
    { name: 'Arcane Sage Focus Orb', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'legendary', valueGold: 800, description: null, stats: { magicresist: 20, mana: 80, intelligence: 15 } },
    { name: 'Arcane Sage Talisman', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'trinket', rarity: 'legendary', valueGold: 1800, description: null, stats: { magicresist: 30, mana: 100, intelligence: 25 } },
    { name: 'Arcane Sage Ring', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'legendary', valueGold: 800, description: null, stats: { mana: 80, intelligence: 18 } },
    { name: 'Arcane Sage Bracers', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'wrist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 10, mana: 60, intelligence: 12 } },
    { name: 'Arcane Sage Gloves', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'hands', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 15, mana: 80, intelligence: 18 } },
    { name: 'Shadowstalker Hood', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 15, health: 80, agility: 20, crit: 5 } },
    { name: 'Shadowstalker Choker', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'neck', rarity: 'legendary', valueGold: 1000, description: null, stats: { health: 60, agility: 15, crit: 4 } },
    { name: 'Shadowstalker Tunic', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 20, health: 100, agility: 20, crit: 5 } },
    { name: 'Shadowstalker Belt', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'waist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 10, agility: 12, crit: 3 } },
    { name: 'Shadowstalker Legguards', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'legs', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 20, health: 80, agility: 20, crit: 5 } },
    { name: 'Shadowstalker Boots', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'feet', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 10, agility: 12, crit: 3 } },
    { name: 'Shadowstalker Spaulders', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'shoulder', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 15, health: 60, agility: 18, crit: 4 } },
    { name: 'Shadowstalker Cloak', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'back', rarity: 'legendary', valueGold: 1000, description: null, stats: { agility: 15, crit: 4 } },
    { name: 'Shadowstalker Daggers', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'legendary', valueGold: 2300, description: null, stats: { damage: 95, agility: 30, crit: 8 } },
    { name: 'Shadowstalker Blade', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'mainhand', rarity: 'legendary', valueGold: 1500, description: null, stats: { damage: 55, agility: 20, crit: 5 } },
    { name: 'Shadowstalker Trinket', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'trinket', rarity: 'legendary', valueGold: 1800, description: null, stats: { agility: 25, crit: 6 } },
    { name: 'Shadowstalker Ring', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'legendary', valueGold: 800, description: null, stats: { agility: 15, crit: 4 } },
    { name: 'Shadowstalker Bracers', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'wrist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 10, agility: 12, crit: 3 } },
    { name: 'Shadowstalker Gloves', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'hands', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 15, agility: 18, crit: 4 } },
    { name: 'Divine Guardian Circlet', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'legendary', valueGold: 1200, description: null, stats: { magicresist: 20, mana: 120, intelligence: 20, spirit: 10 } },
    { name: 'Divine Guardian Amulet', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'neck', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 25, mana: 100, intelligence: 18, spirit: 8 } },
    { name: 'Divine Guardian Robe', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 20, mana: 120, intelligence: 20, spirit: 10 } },
    { name: 'Divine Guardian Sash', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'waist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 15, mana: 60, intelligence: 12, spirit: 6 } },
    { name: 'Divine Guardian Legwraps', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'legs', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 20, mana: 100, intelligence: 18, spirit: 8 } },
    { name: 'Divine Guardian Sandals', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'feet', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 15, mana: 60, intelligence: 12, spirit: 6 } },
    { name: 'Divine Guardian Mantle', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'shoulder', rarity: 'legendary', valueGold: 1200, description: null, stats: { magicresist: 20, mana: 80, intelligence: 15, spirit: 8 } },
    { name: 'Divine Guardian Cape', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'back', rarity: 'legendary', valueGold: 1000, description: null, stats: { magicresist: 20, mana: 80, intelligence: 15, spirit: 8 } },
    { name: 'Divine Guardian Staff', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'twohand', rarity: 'legendary', valueGold: 2300, description: null, stats: { healing: 90, intelligence: 25, spirit: 15, mana: 150 } },
    { name: 'Divine Guardian Tome', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'legendary', valueGold: 800, description: null, stats: { magicresist: 20, mana: 80, intelligence: 12, spirit: 8 } },
    { name: 'Divine Guardian Talisman', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'trinket', rarity: 'legendary', valueGold: 1800, description: null, stats: { healing: 60, mana: 100, intelligence: 20, spirit: 10 } },
    { name: 'Divine Guardian Ring', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'legendary', valueGold: 800, description: null, stats: { mana: 80, intelligence: 15, spirit: 8 } },
    { name: 'Divine Guardian Wristwraps', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'wrist', rarity: 'legendary', valueGold: 1000, description: null, stats: { armor: 5, magicresist: 10, mana: 60, intelligence: 12, spirit: 6 } },
    { name: 'Divine Guardian Gloves', inShop: false, isConsumable: false, isEquipable: true, slotCode: 'hands', rarity: 'legendary', valueGold: 1200, description: null, stats: { armor: 10, magicresist: 15, mana: 80, intelligence: 15, spirit: 8 } },
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
