export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AttributeDTO = {
  id: string;
  name: string;
};

export type AncestryDTO = {
  id: string;
  name: string;
  description?: string | null;
};

export type ItemAttributeDTO = {
  attributeId: string;
  value: number;
};

export type ItemTemplateDTO = {
  id: string;
  name: string;
  isConsumable: boolean;
  isEquipable: boolean;
  slotCode?: string | null;
  rarity: Rarity;
  valueGold: number;
  description?: string | null;
  attributes?: ItemAttributeDTO[];
};

export type MonsterDTO = {
  id: string;
  name: string;
  ancestryName: string;
  rarity: Rarity;
  description?: string | null;
};

export type SpellDTO = {
  id: string;
  name: string;
  description?: string | null;
  cooldown: number;
};

export type EffectDTO = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type ProfessionDTO = {
  id: string;
  name: string;
  description?: string | null;
};

export type CharacterSheetDTO = {
  id: string;
  name: string;
  level: number;
  xp: number;
  ancestryName: string;
  stats: { [k: string]: number };
  equipment: Array<{ slotCode: string; itemName: string }>;
  inventory: Array<{ id: string; name: string; qty: number; rarity: Rarity }>;
  spellbook: Array<{ id: string; name: string }>;
  gold: number;
};

export type ChatMessageDTO = {
  id: string;
  from: string;
  text: string;
  at: string;
};

export type FriendDTO = {
  id: string;
  name: string;
  status: 'friend' | 'blocked';
};

export type CombatParticipantDTO = {
  id: string;
  name: string;
  type: 'player' | 'monster';
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  isActive: boolean;
};

export type CombatActionDTO = {
  id: string;
  type: 'move' | 'attack' | 'cast';
  participantId: string;
  targetId?: string;
  position?: { x: number; y: number };
  spellId?: string;
  message: string;
  timestamp: string;
};

export type CombatStateDTO = {
  participants: CombatParticipantDTO[];
  currentTurn: string;
  actionLog: CombatActionDTO[];
  isActive: boolean;
};