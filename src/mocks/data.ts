import type { 
  AttributeDTO, 
  AncestryDTO, 
  ItemTemplateDTO, 
  MonsterDTO, 
  SpellDTO, 
  EffectDTO, 
  ProfessionDTO,
  CharacterSheetDTO,
  ChatMessageDTO,
  FriendDTO,
  CombatStateDTO
} from '@/types/dto';

export const mockAttributes: AttributeDTO[] = [
  { id: 'health', name: 'Health' },
  { id: 'strength', name: 'Strength' },
  { id: 'agility', name: 'Agility' },
  { id: 'intelligence', name: 'Intelligence' },
  { id: 'armor', name: 'Armor' },
  { id: 'magic_resist', name: 'Magic Resist' },
];

export const mockAncestries: AncestryDTO[] = [
  { id: 'human', name: 'Human', description: 'Versatile and adaptable race' },
  { id: 'elf', name: 'Elf', description: 'Graceful and magically gifted' },
  { id: 'dwarf', name: 'Dwarf', description: 'Strong and resilient mountain folk' },
  { id: 'orc', name: 'Orc', description: 'Fierce warriors with great strength' },
  { id: 'merfolk', name: 'Merfolk', description: 'Aquatic race with water magic' },
];

export const mockItems: ItemTemplateDTO[] = [
  // Currency & Premium
  { id: 'gold_coin', name: 'Gold Coin', isConsumable: false, isEquipable: false, rarity: 'common', valueGold: 1, description: 'Standard currency' },
  { id: 'diamond', name: 'Diamond', isConsumable: false, isEquipable: false, rarity: 'legendary', valueGold: 1000, description: 'Premium gem' },
  
  // Weapons
  { id: 'iron_sword', name: 'Iron Sword', isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'common', valueGold: 100, 
    description: 'A reliable iron sword', attributes: [{ attributeId: 'strength', value: 5 }] },
  { id: 'mystic_staff', name: 'Mystic Staff', isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'rare', valueGold: 500,
    description: 'A staff crackling with magic', attributes: [{ attributeId: 'intelligence', value: 8 }, { attributeId: 'magic_resist', value: 3 }] },
  { id: 'dragonbane_blade', name: 'Dragonbane Blade', isConsumable: false, isEquipable: true, slotCode: 'weapon', rarity: 'legendary', valueGold: 2000,
    description: 'Forged to slay dragons', attributes: [{ attributeId: 'strength', value: 15 }, { attributeId: 'agility', value: 5 }] },
  
  // Armor
  { id: 'leather_helm', name: 'Leather Helmet', isConsumable: false, isEquipable: true, slotCode: 'head', rarity: 'common', valueGold: 50,
    description: 'Basic leather protection', attributes: [{ attributeId: 'armor', value: 2 }] },
  { id: 'plate_chest', name: 'Plate Chestpiece', isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'uncommon', valueGold: 200,
    description: 'Heavy plate armor', attributes: [{ attributeId: 'armor', value: 8 }, { attributeId: 'health', value: 20 }] },
  { id: 'mage_robes', name: 'Arcane Robes', isConsumable: false, isEquipable: true, slotCode: 'chest', rarity: 'rare', valueGold: 400,
    description: 'Robes woven with magic', attributes: [{ attributeId: 'intelligence', value: 6 }, { attributeId: 'magic_resist', value: 5 }] },
  
  // Offhand
  { id: 'iron_shield', name: 'Iron Shield', isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'common', valueGold: 75,
    description: 'Sturdy iron protection', attributes: [{ attributeId: 'armor', value: 4 }] },
  { id: 'spell_focus', name: 'Arcane Focus', isConsumable: false, isEquipable: true, slotCode: 'offhand', rarity: 'uncommon', valueGold: 150,
    description: 'Enhances spell casting', attributes: [{ attributeId: 'intelligence', value: 4 }] },
  
  // Consumables
  { id: 'health_potion', name: 'Health Potion', isConsumable: true, isEquipable: false, rarity: 'common', valueGold: 25,
    description: 'Restores 50 health', attributes: [{ attributeId: 'health', value: 50 }] },
  { id: 'mana_potion', name: 'Mana Potion', isConsumable: true, isEquipable: false, rarity: 'common', valueGold: 30,
    description: 'Restores mana' },
  { id: 'strength_elixir', name: 'Elixir of Strength', isConsumable: true, isEquipable: false, rarity: 'uncommon', valueGold: 100,
    description: 'Temporarily increases strength', attributes: [{ attributeId: 'strength', value: 5 }] },
  
  // Legs
  { id: 'chain_leggings', name: 'Chain Leggings', isConsumable: false, isEquipable: true, slotCode: 'legs', rarity: 'uncommon', valueGold: 120,
    description: 'Flexible chain protection', attributes: [{ attributeId: 'armor', value: 5 }, { attributeId: 'agility', value: 2 }] },
  
  // Accessories
  { id: 'power_ring', name: 'Ring of Power', isConsumable: false, isEquipable: true, slotCode: 'ring', rarity: 'epic', valueGold: 800,
    description: 'Increases magical power', attributes: [{ attributeId: 'intelligence', value: 10 }] },
  { id: 'protection_amulet', name: 'Amulet of Protection', isConsumable: false, isEquipable: true, slotCode: 'amulet', rarity: 'rare', valueGold: 300,
    description: 'Grants magical protection', attributes: [{ attributeId: 'magic_resist', value: 8 }] },
];

export const mockMonsters: MonsterDTO[] = [
  { id: 'goblin', name: 'Goblin Warrior', ancestryName: 'orc', rarity: 'common', description: 'A small but vicious creature' },
  { id: 'skeleton', name: 'Skeleton Archer', ancestryName: 'human', rarity: 'common', description: 'Undead bowman' },
  { id: 'merrow', name: 'Merrow Shaman', ancestryName: 'merfolk', rarity: 'uncommon', description: 'Aquatic spellcaster' },
  { id: 'troll', name: 'Cave Troll', ancestryName: 'orc', rarity: 'rare', description: 'Massive regenerating beast' },
  { id: 'lich', name: 'Ancient Lich', ancestryName: 'human', rarity: 'legendary', description: 'Powerful undead wizard' },
];

export const mockSpells: SpellDTO[] = [
  { id: 'double_attack', name: 'Double Attack', description: 'Passive: Chance to attack twice', cooldown: 0 },
  { id: 'double_cast', name: 'Double Cast', description: 'Passive: Chance to cast spells twice', cooldown: 0 },
  { id: 'fireball', name: 'Fireball', description: 'Hurls a ball of fire at target', cooldown: 3 },
  { id: 'cleave', name: 'Cleave', description: 'Attacks multiple adjacent enemies', cooldown: 2 },
  { id: 'shiv', name: 'Shiv', description: 'Quick poisonous strike', cooldown: 1 },
  { id: 'ice_lance', name: 'Ice Lance', description: 'Piercing ice projectile', cooldown: 2 },
  { id: 'arcane_bolt', name: 'Arcane Bolt', description: 'Pure magical damage', cooldown: 1 },
  { id: 'heal', name: 'Heal', description: 'Restores health to target', cooldown: 4 },
  { id: 'shield', name: 'Magic Shield', description: 'Grants temporary protection', cooldown: 5 },
  { id: 'poison_dagger', name: 'Poison Dagger', description: 'Throws a poisoned blade', cooldown: 3 },
];

export const mockEffects: EffectDTO[] = [
  { id: 'double_strike', code: 'double_strike', name: 'Double Strike', description: 'Can attack twice per turn' },
  { id: 'double_cast', code: 'double_cast', name: 'Double Cast', description: 'Can cast spells twice per turn' },
  { id: 'heal_over_time', code: 'hot', name: 'Regeneration', description: 'Heals over time' },
  { id: 'damage_over_time', code: 'dot', name: 'Poison', description: 'Takes damage over time' },
  { id: 'shield_buff', code: 'shield', name: 'Magic Shield', description: 'Absorbs incoming damage' },
];

export const mockProfessions: ProfessionDTO[] = [
  { id: 'alchemy', name: 'Alchemy', description: 'Craft potions and elixirs' },
  { id: 'blacksmithing', name: 'Blacksmithing', description: 'Forge weapons and armor' },
  { id: 'tailoring', name: 'Tailoring', description: 'Create cloth armor and accessories' },
  { id: 'enchanting', name: 'Enchanting', description: 'Enhance items with magical properties' },
];

export const mockCharacter: CharacterSheetDTO = {
  id: 'aldor_1',
  name: 'Aldor',
  level: 5,
  xp: 2350,
  ancestryName: 'human',
  gold: 450,
  stats: {
    health: 120,
    strength: 15,
    agility: 12,
    intelligence: 18,
    armor: 8,
    magic_resist: 5,
  },
  equipment: [
    { slotCode: 'weapon', itemName: 'Mystic Staff' },
    { slotCode: 'chest', itemName: 'Arcane Robes' },
    { slotCode: 'offhand', itemName: 'Arcane Focus' },
  ],
  inventory: [
    { id: 'health_potion_1', name: 'Health Potion', qty: 3, rarity: 'common' },
    { id: 'mana_potion_1', name: 'Mana Potion', qty: 5, rarity: 'common' },
    { id: 'iron_sword_1', name: 'Iron Sword', qty: 1, rarity: 'common' },
    { id: 'gold_coin_1', name: 'Gold Coin', qty: 450, rarity: 'common' },
    { id: 'diamond_1', name: 'Diamond', qty: 2, rarity: 'legendary' },
  ],
  spellbook: [
    { id: 'fireball', name: 'Fireball' },
    { id: 'heal', name: 'Heal' },
    { id: 'arcane_bolt', name: 'Arcane Bolt' },
    { id: 'shield', name: 'Magic Shield' },
  ],
};

export const mockChatMessages: ChatMessageDTO[] = [
  { id: 'msg_1', from: 'Gandalf', text: 'Welcome to the realm, young adventurer!', at: new Date(Date.now() - 300000).toISOString() },
  { id: 'msg_2', from: 'Legolas', text: 'Anyone want to group up for the dragon raid?', at: new Date(Date.now() - 240000).toISOString() },
  { id: 'msg_3', from: 'Aldor', text: 'I\'m interested! What level is required?', at: new Date(Date.now() - 180000).toISOString() },
  { id: 'msg_4', from: 'Gandalf', text: 'Level 10+ recommended for the fire dragon', at: new Date(Date.now() - 120000).toISOString() },
  { id: 'msg_5', from: 'Aragorn', text: 'Found a legendary sword in the ancient ruins!', at: new Date(Date.now() - 60000).toISOString() },
];

export const mockFriends: FriendDTO[] = [
  { id: 'friend_1', name: 'Gandalf', status: 'friend' },
  { id: 'friend_2', name: 'Legolas', status: 'friend' },
  { id: 'friend_3', name: 'Gimli', status: 'friend' },
  { id: 'blocked_1', name: 'DarkLord99', status: 'blocked' },
];

export const mockCombatState: CombatStateDTO = {
  participants: [
    { id: 'aldor_1', name: 'Aldor', type: 'player', position: { x: 1, y: 6 }, health: 120, maxHealth: 120, isActive: true },
    { id: 'legolas_1', name: 'Legolas', type: 'player', position: { x: 2, y: 6 }, health: 95, maxHealth: 100, isActive: false },
    { id: 'goblin_1', name: 'Goblin Warrior', type: 'monster', position: { x: 5, y: 2 }, health: 40, maxHealth: 60, isActive: false },
    { id: 'skeleton_1', name: 'Skeleton Archer', type: 'monster', position: { x: 6, y: 1 }, health: 35, maxHealth: 50, isActive: false },
  ],
  currentTurn: 'aldor_1',
  actionLog: [
    { 
      id: 'action_1', 
      type: 'move', 
      participantId: 'legolas_1', 
      position: { x: 2, y: 6 },
      message: 'Legolas moved to position (2,6)', 
      timestamp: new Date(Date.now() - 30000).toISOString() 
    },
    { 
      id: 'action_2', 
      type: 'attack', 
      participantId: 'goblin_1', 
      targetId: 'legolas_1',
      message: 'Goblin Warrior attacked Legolas for 5 damage', 
      timestamp: new Date(Date.now() - 25000).toISOString() 
    },
  ],
  isActive: true,
};