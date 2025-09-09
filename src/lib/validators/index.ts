import { z } from 'zod';

export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

export const AttributeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const AncestrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const ItemAttributeSchema = z.object({
  attributeId: z.string(),
  value: z.number(),
});

export const ItemTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConsumable: z.boolean(),
  isEquipable: z.boolean(),
  slotCode: z.string().nullable().optional(),
  rarity: RaritySchema,
  valueGold: z.number().min(0),
  description: z.string().nullable().optional(),
  attributes: z.array(ItemAttributeSchema).optional(),
});

export const MonsterSchema = z.object({
  id: z.string(),
  name: z.string(),
  ancestryName: z.string(),
  rarity: RaritySchema,
  description: z.string().nullable().optional(),
});

export const SpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  cooldown: z.number().min(0),
});

export const EffectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const ProfessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const CharacterSheetSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(20),
  level: z.number().min(1).max(100),
  xp: z.number().min(0),
  ancestryName: z.string(),
  stats: z.record(z.number()),
  equipment: z.array(z.object({
    slotCode: z.string(),
    itemName: z.string(),
  })),
  inventory: z.array(z.object({
    id: z.string(),
    name: z.string(),
    qty: z.number().min(1),
    rarity: RaritySchema,
  })),
  spellbook: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  gold: z.number().min(0),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  from: z.string().min(1).max(20),
  text: z.string().min(1).max(500),
  at: z.string(),
});

export const FriendSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(20),
  status: z.enum(['friend', 'blocked']),
});

export const CombatPositionSchema = z.object({
  x: z.number().min(0).max(7),
  y: z.number().min(0).max(7),
});

export const CombatActionSchema = z.object({
  type: z.enum(['move', 'attack', 'cast']),
  participantId: z.string(),
  targetId: z.string().optional(),
  position: CombatPositionSchema.optional(),
  spellId: z.string().optional(),
});

// Form validation schemas
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6),
  characterName: z.string().min(2).max(20, 'Character name must be 2-20 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const SendMessageSchema = z.object({
  text: z.string().min(1).max(500, 'Message is too long'),
});

export const AddFriendSchema = z.object({
  name: z.string().min(2).max(20, 'Name must be 2-20 characters'),
});