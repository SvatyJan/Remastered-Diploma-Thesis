import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Prisma, SpellCastType, SpellTarget } from '@prisma/client'

const app = express()
app.use(cors())
app.use(express.json())

// --- Auth helpers ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
type AuthedRequest = Request & { userId?: number }
function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ')? auth.slice(7): ''
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: number }
    req.userId = decoded.uid
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

type UserRecord = { id: bigint | number; email: string; username: string }
type CharacterRecord = { id: bigint | number; name: string; level: number; ancestryId: bigint | number }
type AncestryRecord = { id: bigint | number; name: string; description: string | null }

type CharacterAttributeRecord = { value: number; attribute: { name: string } }
type InventoryRecord = {
  id: bigint | number
  amount: number
  template: {
    id: bigint | number
    name: string
    slug: string
    description: string | null
    slotCode: string | null
    valueGold: number
    attributes: Array<{ value: number; attribute: { name: string } }>
  }
  equipped: { slotCode: string } | null
}

type PlayerRecord = {
  id: bigint | number
  name: string
  level: number
  ancestry: { name: string } | null
  guildMember: { guild: { name: string } } | null
}

type ShopTemplateRecord = { id: bigint | number; name: string; slug: string; description: string | null; valueGold: number; slotCode: string | null; inShop: boolean; attributes: Array<{ value: number; attribute: { name: string } }> }

type ProfessionRecord = { id: bigint | number; name: string; description: string | null }

type CharacterProfessionRecord = { skill: number; profession: ProfessionRecord }

function toProfessionDto(record: ProfessionRecord) {
  return {
    id: Number(record.id),
    name: record.name,
    description: record.description,
  }
}

function toCharacterProfessionDto(record: CharacterProfessionRecord) {
  return {
    id: Number(record.profession.id),
    name: record.profession.name,
    description: record.profession.description,
    skill: record.skill,
  }
}


function toUserDto(user: UserRecord) {
  return {
    id: Number(user.id),
    email: user.email,
    username: user.username,
  }
}

function toAncestryDto(ancestry: AncestryRecord) {
  return {
    id: Number(ancestry.id),
    name: ancestry.name,
    description: ancestry.description,
  }
}

function toAttributeDto(record: CharacterAttributeRecord) {
  return {
    name: record.attribute.name,
    value: record.value,
  }
}

function toInventoryDto(item: InventoryRecord) {
  return {
    id: Number(item.id),
    amount: item.amount,
    name: item.template.name,
    slug: item.template.slug,
    description: item.template.description,
    slotCode: item.template.slotCode,
    allowedSlots: item.template.slotCode ? [item.template.slotCode] : [],
    equippedSlot: item.equipped?.slotCode ?? null,
    modifiers: item.template.attributes.map((attr) => ({
      name: attr.attribute.name,
      value: attr.value,
    })),
  }
}

function toShopPlayerItem(item: InventoryRecord) {
  return {
    inventoryId: Number(item.id),
    templateId: Number(item.template.id),
    name: item.template.name,
    slug: item.template.slug,
    description: item.template.description,
    slotCode: item.template.slotCode,
    amount: item.amount,
    valueGold: item.template.valueGold,
    modifiers: item.template.attributes.map((attr) => ({
      name: attr.attribute.name,
      value: attr.value,
    })),
  }
}

function toVendorItem(template: ShopTemplateRecord) {
  return {
    templateId: Number(template.id),
    name: template.name,
    slug: template.slug,
    description: template.description,
    slotCode: template.slotCode,
    valueGold: template.valueGold,
    modifiers: template.attributes.map((attr) => ({
      name: attr.attribute.name,
      value: attr.value,
    })),
  }
}

function toSpellDto(
  spell: {
    id: bigint | number
    name: string
    slug: string
    description: string | null
    cooldown: number
    slotCode: string
    castType: SpellCastType
    target: SpellTarget
    range: number
    areaRange: number
    damage: number
    manaCost: number
    effects?: Array<{
      effectId: bigint | number
      durationRounds: number
      magnitude: number
      effect: { code: string }
    }>
  },
) {
  return {
    id: Number(spell.id),
    name: spell.name,
    slug: spell.slug,
    description: spell.description,
    cooldown: spell.cooldown,
    slotCode: spell.slotCode,
    castType: spell.castType,
    target: spell.target,
    range: spell.range,
    areaRange: spell.areaRange,
    damage: spell.damage,
    manaCost: spell.manaCost,
    effects:
      spell.effects?.map((entry) => ({
        effectId: Number(entry.effectId),
        effectCode: entry.effect?.code ?? 'unknown',
        durationRounds: entry.durationRounds,
        magnitude: entry.magnitude,
      })) ?? [],
  }
}

class ShopError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

class SpellLoadoutError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function toPlayerDto(record: PlayerRecord) {
  return {
    id: Number(record.id),
    name: record.name,
    level: record.level,
    ancestry: record.ancestry?.name ?? null,
    guild: record.guildMember?.guild.name ?? null,
  }
}

function toCharacterDto(character: CharacterRecord) {
  return {
    id: Number(character.id),
    name: character.name,
    level: character.level,
    ancestryId: Number(character.ancestryId),
  }
}

type AttributeLookup = Record<string, number>

type ActionTypeKey = 'move' | 'attack' | 'wait'

type ActionDefinition = {
  key: ActionTypeKey
  label: string
  description: string
}

type Position = { x: number; y: number }

const COMBAT_BOARD_WIDTH = 8
const COMBAT_BOARD_HEIGHT = 8
const GOLD_REWARD_MIN = 12
const GOLD_REWARD_MAX = 28

type StatBlock = {
  str: number
  agi: number
  int: number
  spd: number
  hpMax: number
  manaMax: number
}

type SpellEffectSummary = {
  effectId: number
  effectCode: string
  durationRounds: number
  magnitude: number
}

type SpellSummary = {
  id: number
  name: string
  slug: string
  description: string | null
  cooldown: number
  slotCode: string
  castType: SpellCastType
  target: SpellTarget
  range: number
  areaRange: number
  damage: number
  manaCost: number
  effects: SpellEffectSummary[]
}

type ParticipantSnapshot = {
  kind: 'player' | 'enemy'
  level: number
  stats: StatBlock
  initial: { hp: number; mana: number; position: Position }
  current: { hp: number; mana: number; position: Position }
  actions: Record<ActionTypeKey, ActionDefinition>
  spells?: SpellSummary[]
  monster?: { id: number | null; name: string; rarity: string; description: string | null }
}

type CombatRoundLog = { round: number; log: string[] }

type CombatMeta = {
  source: string
  playerCharacterId: number
  playerCharacterName: string
  monsterId: number | null
  monsterName: string
  monsterRarity: string
  monsterDescription: string | null
  round: number
  turn: 'player' | 'enemy' | 'finished'
  rounds: CombatRoundLog[]
  rewardGranted?: boolean
  reward?: { gold: number; itemTemplateId: number | null; itemName: string | null }
}

type AvailableSpell = {
  id: number
  name: string
  castType: SpellCastType
  target: SpellTarget
  range: number
  areaRange: number
  manaCost: number
  damage: number
  effects: SpellEffectSummary[]
}

type AvailableActions = {
  canMove: boolean
  movePositions: Position[]
  canAttack: boolean
  attackTargets: number[]
  canWait: boolean
  spells: AvailableSpell[]
}

type CombatReward = { gold: number; itemTemplateId: number | null; itemName: string | null }

const ACTION_LIBRARY: Record<ActionTypeKey, ActionDefinition> = {
  move: {
    key: 'move',
    label: 'Move',
    description: 'Step one tile in any direction (king move).',
  },
  attack: {
    key: 'attack',
    label: 'Attack',
    description: 'Adjacent melee attack dealing ceil(1.5Ă—STR) Â± rng(0..2).',
  },
  wait: {
    key: 'wait',
    label: 'Wait',
    description: 'Skip the turn.',
  },
}

function attributesToLookup(records: CharacterAttributeRecord[]): AttributeLookup {
  const map: AttributeLookup = {}
  for (const record of records) {
    map[record.attribute.name.toLowerCase()] = record.value
  }
  return map
}

function buildStatBlock(attrs: AttributeLookup, level: number): StatBlock {
  const baseStrength = attrs.strength ?? attrs.str ?? 12
  const baseAgility = attrs.agility ?? attrs.agi ?? 12
  const baseInt = attrs.intelligence ?? attrs.int ?? 12
  const baseSpeed = attrs.speed ?? attrs.spd ?? baseAgility
  const baseHealth = attrs.health ?? 90 + level * 6
  const baseMana = attrs.mana ?? 45 + level * 4
  const str = Math.max(1, Math.round(baseStrength))
  const agi = Math.max(1, Math.round(baseAgility))
  const intStat = Math.max(1, Math.round(baseInt))
  const spd = Math.max(1, Math.round(baseSpeed))
  const hpMax = Math.max(30, Math.round(baseHealth + str * 4))
  const manaMax = Math.max(0, Math.round(baseMana + intStat * 2))
  return { str, agi, int: intStat, spd, hpMax, manaMax }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function chebyshevDistance(a: Position, b: Position) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

function clampToBoard(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(COMBAT_BOARD_WIDTH - 1, pos.x)),
    y: Math.max(0, Math.min(COMBAT_BOARD_HEIGHT - 1, pos.y)),
  }
}

function clonePosition(pos: Position): Position {
  return { x: pos.x, y: pos.y }
}

function getAdjacentTiles(pos: Position): Position[] {
  const tiles: Position[] = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      const tile = clampToBoard({ x: pos.x + dx, y: pos.y + dy })
      if (tile.x === pos.x && tile.y === pos.y) continue
      tiles.push(tile)
    }
  }
  const seen = new Set<string>()
  return tiles.filter((tile) => {
    const key = `${tile.x}:${tile.y}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function stepTowardsTarget(from: Position, target: Position, blocked: Position[]): Position {
  const blockedKeys = new Set(blocked.map((pos) => `${pos.x}:${pos.y}`))
  const dx = Math.sign(target.x - from.x)
  const dy = Math.sign(target.y - from.y)
  const candidates: Position[] = []
  if (dx !== 0 || dy !== 0) candidates.push(clampToBoard({ x: from.x + dx, y: from.y + dy }))
  if (dx !== 0) candidates.push(clampToBoard({ x: from.x + dx, y: from.y }))
  if (dy !== 0) candidates.push(clampToBoard({ x: from.x, y: from.y + dy }))
  for (const candidate of candidates) {
    const key = `${candidate.x}:${candidate.y}`
    if (candidate.x === from.x && candidate.y === from.y) continue
    if (blockedKeys.has(key)) continue
    return candidate
  }
  return { ...from }
}

function ensureRound(meta: CombatMeta): CombatRoundLog {
  if (!Array.isArray(meta.rounds) || !meta.rounds.length) {
    meta.rounds = [{ round: meta.round, log: [] }]
  }
  const last = meta.rounds[meta.rounds.length - 1]
  if (last.round !== meta.round) {
    const entry = { round: meta.round, log: [] }
    meta.rounds.push(entry)
    return entry
  }
  return last
}

function appendRoundLog(meta: CombatMeta, message: string) {
  const entry = ensureRound(meta)
  entry.log.push(message)
}

function computeAvailableActions(
  playerSnapshot: ParticipantSnapshot,
  enemySnapshot: ParticipantSnapshot,
  enemyParticipantId: bigint,
): AvailableActions {
  const movePositions = getAdjacentTiles(playerSnapshot.current.position).filter(
    (tile) => !(tile.x === enemySnapshot.current.position.x && tile.y === enemySnapshot.current.position.y),
  )
  const canAttack = chebyshevDistance(playerSnapshot.current.position, enemySnapshot.current.position) <= 1
  const availableSpells: AvailableSpell[] = (playerSnapshot.spells ?? []).map((spell) => ({
    id: spell.id,
    name: spell.name,
    castType: spell.castType,
    target: spell.target,
    range: spell.range,
    areaRange: spell.areaRange,
    manaCost: spell.manaCost,
    damage: spell.damage,
    effects: spell.effects,
  }))
  return {
    canMove: movePositions.length > 0,
    movePositions,
    canAttack,
    attackTargets: canAttack ? [Number(enemyParticipantId)] : [],
    canWait: true,
    spells: availableSpells,
  }
}

async function grantCombatRewards(
  tx: Prisma.TransactionClient,
  characterId: bigint,
  meta: CombatMeta,
): Promise<CombatReward> {
  if (meta.rewardGranted) return meta.reward ?? { gold: 0, itemTemplateId: null, itemName: null }

  const reward: CombatReward = { gold: 0, itemTemplateId: null, itemName: null }
  const goldReward = randomInt(GOLD_REWARD_MIN, GOLD_REWARD_MAX)

  const coinTemplate = await tx.itemTemplate.findFirst({
    where: { slug: 'gold-coin' },
    select: { id: true },
  })

  if (coinTemplate && goldReward > 0) {
    const existingCoins = await tx.characterInventory.findFirst({
      where: { ownerCharacterId: characterId, templateId: coinTemplate.id },
      select: { id: true, amount: true },
    })
    if (existingCoins) {
      const updated = Number(existingCoins.amount ?? 0) + goldReward
      await tx.characterInventory.update({
        where: { id: existingCoins.id },
        data: { amount: updated },
      })
    } else {
      await tx.characterInventory.create({
        data: {
          ownerCharacterId: characterId,
          templateId: coinTemplate.id,
          amount: goldReward,
        },
      })
    }
    reward.gold = goldReward
  }

  const lootPool = await tx.itemTemplate.findMany({
    where: { inShop: true, slug: { not: 'gold-coin' } },
    select: { id: true, name: true },
  })
  if (lootPool.length) {
    const chosen = lootPool[randomInt(0, lootPool.length - 1)]
    try {
      await tx.characterInventory.create({
        data: {
          ownerCharacterId: characterId,
          templateId: chosen.id,
          amount: 1,
        },
      })
      reward.itemTemplateId = Number(chosen.id)
      reward.itemName = chosen.name
    } catch (err) {
      console.error('Failed to grant item reward', err)
    }
  }

  meta.rewardGranted = true
  meta.reward = reward

  const rewardParts: string[] = []
  if (reward.gold > 0) rewardParts.push(`+${reward.gold} gold`)
  if (reward.itemName) rewardParts.push(reward.itemName)
  if (rewardParts.length)
    appendRoundLog(meta, `Rewards: ${rewardParts.join(' and ')}.`)

  return reward
}

type CombatWithParticipants = Prisma.CombatGetPayload<{
  include: {
    participants: true
    result: true
    effects: { include: { effect: true } }
  }
}>
type CombatParticipantRecord = CombatWithParticipants['participants'][number]

async function processStartOfTurnEffects(
  combatId: bigint,
  actor: { record: CombatParticipantRecord; snapshot: ParticipantSnapshot },
  meta: CombatMeta,
  participantLookup: Map<number, { record: CombatParticipantRecord; snapshot: ParticipantSnapshot }>,
): Promise<{ actorDied: boolean }> {
  let actorDied = false
  await prisma.$transaction(async (tx) => {
    const effects = await tx.combatEffect.findMany({
      where: { combatId, participantId: actor.record.id },
      include: { effect: { select: { code: true } } },
      orderBy: { id: 'asc' },
    })

    for (const effectRecord of effects) {
      const effectCode = effectRecord.effect?.code ?? 'unknown'
      const data = (effectRecord.dataJson ?? {}) as Record<string, any>
      const durationFallback = Number.isFinite(Number(data.durationRounds))
        ? Number(data.durationRounds)
        : Number.isFinite(Number(data.duration))
        ? Number(data.duration)
        : Number.isFinite(Number(effectRecord.expiresRound))
        ? Math.max(0, Number(effectRecord.expiresRound) - meta.round)
        : 0
      let remaining = Number.isFinite(Number(data.remainingRounds))
        ? Number(data.remainingRounds)
        : durationFallback

      if (remaining <= 0) {
        await tx.combatEffect.delete({ where: { id: effectRecord.id } })
        continue
      }

      const sourceParticipantId = Number(
        data.sourceParticipantId ??
          (effectRecord.sourceParticipantId ? Number(effectRecord.sourceParticipantId) : 0),
      )
      const sourceName = participantLookup.get(sourceParticipantId)?.record.name ?? 'Unknown caster'

      switch (effectCode) {
        case 'ignite': {
          const damage = Number(
            Number.isFinite(Number(data.damagePerTick))
              ? Number(data.damagePerTick)
              : Number(data.intelligence ?? data.int ?? 0),
          )
          if (damage > 0) {
            actor.snapshot.current.hp = Math.max(0, actor.snapshot.current.hp - damage)
            const sourceLabel = sourceParticipantId ? `${sourceName}'s ` : ''
            appendRoundLog(meta, `${actor.record.name} suffers ${damage} damage from ${sourceLabel}Ignite.`)
            actorDied = actorDied || actor.snapshot.current.hp <= 0
          }

          remaining -= 1
          if (remaining <= 0 || actor.snapshot.current.hp <= 0) {
            await tx.combatEffect.delete({ where: { id: effectRecord.id } })
            if (remaining <= 0)
              appendRoundLog(meta, `${actor.record.name}'s Ignite effect fades.`)
          } else {
            const nextExpires = meta.round + remaining
            const nextData = {
              ...data,
              remainingRounds: remaining,
              sourceParticipantId,
              damagePerTick: damage,
            }
            await tx.combatEffect.update({
              where: { id: effectRecord.id },
              data: { dataJson: nextData, expiresRound: nextExpires },
            })
          }
          break
        }
        default: {
          await tx.combatEffect.delete({ where: { id: effectRecord.id } })
          appendRoundLog(meta, `${actor.record.name} is no longer affected by ${effectCode}.`)
        }
      }

      if (actor.snapshot.current.hp <= 0) {
        actorDied = true
      }
    }
  })

  return { actorDied }
}

async function loadCharacterCombatSpells(characterId: bigint): Promise<SpellSummary[]> {
  const loadouts = await prisma.characterSpellbookLoadout.findMany({
    where: { characterId },
    orderBy: [{ slotCode: 'asc' }, { slotIndex: 'asc' }],
    select: {
      spell: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          cooldown: true,
          slotCode: true,
          castType: true,
          target: true,
          range: true,
          areaRange: true,
          damage: true,
          manaCost: true,
          effects: {
            select: {
              effectId: true,
              durationRounds: true,
              magnitude: true,
              effect: { select: { code: true } },
            },
          },
        },
      },
    },
  })

  const seen = new Set<number>()
  const spells: SpellSummary[] = []
  for (const entry of loadouts) {
    const spell = entry.spell
    if (!spell) continue
    const id = Number(spell.id)
    if (seen.has(id)) continue
    seen.add(id)
    spells.push(toSpellDto(spell))
  }
  return spells
}

function parseParticipantSnapshot(participant: CombatParticipantRecord): ParticipantSnapshot {
  const snapshot = (participant.snapshotJson ?? {}) as Partial<ParticipantSnapshot>
  const statsSource = snapshot.stats ?? ({} as Partial<StatBlock>)
  const stats: StatBlock = {
    str: Number((statsSource as any)?.str ?? 12),
    agi: Number((statsSource as any)?.agi ?? 12),
    int: Number((statsSource as any)?.int ?? 12),
    spd: Number((statsSource as any)?.spd ?? 10),
    hpMax: Number((statsSource as any)?.hpMax ?? participant.hpCurrent ?? 100),
    manaMax: Number((statsSource as any)?.manaMax ?? 50),
  }

  const currentRaw = snapshot.current ?? snapshot.initial ?? {
    hp: participant.hpCurrent,
    mana: 0,
    position: { x: participant.tileX, y: participant.tileY },
  }
  const current: ParticipantSnapshot['current'] = {
    hp: Number((currentRaw as any)?.hp ?? participant.hpCurrent ?? stats.hpMax),
    mana: Number((currentRaw as any)?.mana ?? 0),
    position:
      (currentRaw as any)?.position &&
      typeof (currentRaw as any).position.x === 'number' &&
      typeof (currentRaw as any).position.y === 'number'
        ? clampToBoard({
            x: Number((currentRaw as any).position.x),
            y: Number((currentRaw as any).position.y),
          })
        : { x: participant.tileX, y: participant.tileY },
  }

  const initialRaw = snapshot.initial ?? {
    hp: current.hp,
    mana: current.mana,
    position: current.position,
  }
  const initial: ParticipantSnapshot['initial'] = {
    hp: Number((initialRaw as any)?.hp ?? current.hp),
    mana: Number((initialRaw as any)?.mana ?? current.mana),
    position:
      (initialRaw as any)?.position &&
      typeof (initialRaw as any).position.x === 'number' &&
      typeof (initialRaw as any).position.y === 'number'
        ? clampToBoard({
            x: Number((initialRaw as any).position.x),
            y: Number((initialRaw as any).position.y),
          })
        : clonePosition(current.position),
  }

  const actionsSource = (snapshot.actions ?? {}) as Partial<Record<ActionTypeKey, ActionDefinition>>
  const actions: Record<ActionTypeKey, ActionDefinition> = {
    move: actionsSource.move ?? ACTION_LIBRARY.move,
    attack: actionsSource.attack ?? ACTION_LIBRARY.attack,
    wait: actionsSource.wait ?? ACTION_LIBRARY.wait,
  }

  const spells = Array.isArray(snapshot.spells)
    ? snapshot.spells
        .map((spell) => {
          const raw = spell as any
          const effects: SpellEffectSummary[] = Array.isArray(raw?.effects)
            ? raw.effects
                .map((effect: any): SpellEffectSummary => ({
                  effectId: Number(effect?.effectId ?? effect?.id ?? 0),
                  effectCode: String(effect?.effectCode ?? effect?.code ?? 'unknown').toLowerCase(),
                  durationRounds: Number(effect?.durationRounds ?? effect?.duration ?? 0),
                  magnitude: Number(effect?.magnitude ?? 0),
                }))
                .filter((entry: SpellEffectSummary) => Number.isFinite(entry.effectId) && entry.effectId > 0)
            : []
          const castTypeRaw = String(raw?.castType ?? raw?.cast_type ?? 'point_click').toLowerCase()
          const targetRaw = String(raw?.target ?? 'enemy').toLowerCase()
          const rangeRaw = Number(raw?.range ?? raw?.spellRange ?? 1)
          const areaRangeRaw = Number(raw?.areaRange ?? raw?.area_range ?? 0)
          const damageRaw = Number(raw?.damage ?? 0)
          const manaCostRaw = Number(raw?.manaCost ?? raw?.mana_cost ?? 0)
          const castType: SpellCastType =
            castTypeRaw === 'area' || castTypeRaw === 'self' ? (castTypeRaw as SpellCastType) : 'point_click'
          const target: SpellTarget =
            targetRaw === 'ally' || targetRaw === 'ground' || targetRaw === 'self' ? (targetRaw as SpellTarget) : 'enemy'
          const range = Number.isFinite(rangeRaw) ? rangeRaw : 1
          const areaRange = Number.isFinite(areaRangeRaw) ? areaRangeRaw : 0
          const damage = Number.isFinite(damageRaw) ? damageRaw : 0
          const manaCost = Number.isFinite(manaCostRaw) ? manaCostRaw : 0
          return {
            id: Number(raw?.id ?? 0),
            name: String(raw?.name ?? 'Unknown'),
            slug: String(raw?.slug ?? 'unknown'),
            description: raw?.description != null ? String(raw.description) : null,
            cooldown: Number(raw?.cooldown ?? 0),
            slotCode: String(raw?.slotCode ?? raw?.slot_code ?? 'spell'),
            castType,
            target,
            range,
            areaRange,
            damage,
            manaCost,
            effects,
          }
        })
        .filter((item) => Number.isFinite(item.id) && item.id > 0)
    : []
  const kind: 'player' | 'enemy' = snapshot.kind === 'enemy' || participant.isAi ? 'enemy' : 'player'

  const monster = snapshot.monster
    ? {
        id:
          (snapshot.monster as any)?.id != null
            ? Number((snapshot.monster as any).id)
            : null,
        name: String((snapshot.monster as any)?.name ?? participant.name),
        rarity: String((snapshot.monster as any)?.rarity ?? 'common'),
        description:
          (snapshot.monster as any)?.description != null
            ? String((snapshot.monster as any).description)
            : null,
      }
    : undefined

  return {
    kind,
    level: Number(snapshot.level ?? 1),
    stats,
    initial,
    current,
    actions,
    spells,
    monster,
  }
}

function parseCombatMeta(combat: CombatWithParticipants): CombatMeta {
  const raw = (combat.originMeta ?? {}) as Partial<CombatMeta>
  const round = Number(raw?.round ?? combat.currentRound ?? 1)
  const turn = raw?.turn === 'enemy' || raw?.turn === 'finished' ? raw.turn : 'player'
  const rounds = Array.isArray(raw?.rounds)
    ? raw!.rounds!.map((entry) => ({
        round: Number((entry as any)?.round ?? round),
        log: Array.isArray((entry as any)?.log)
          ? (entry as any).log.map((line: unknown) => String(line))
          : [],
      }))
    : [{ round, log: [] }]
  rounds.sort((a, b) => a.round - b.round)

  const rewardRaw = raw?.reward as any
  const reward =
    rewardRaw && typeof rewardRaw === 'object' && !Array.isArray(rewardRaw)
      ? {
          gold:
            rewardRaw.gold != null && Number.isFinite(Number(rewardRaw.gold))
              ? Number(rewardRaw.gold)
              : 0,
          itemTemplateId:
            rewardRaw.itemTemplateId != null && Number.isFinite(Number(rewardRaw.itemTemplateId))
              ? Number(rewardRaw.itemTemplateId)
              : null,
          itemName:
            rewardRaw.itemName != null && rewardRaw.itemName !== ''
              ? String(rewardRaw.itemName)
              : null,
        }
      : undefined

  return {
    source: typeof raw?.source === 'string' ? raw.source : 'world-random',
    playerCharacterId: Number(raw?.playerCharacterId ?? 0),
    playerCharacterName: typeof raw?.playerCharacterName === 'string' ? raw.playerCharacterName : 'Player',
    monsterId: raw?.monsterId != null ? Number(raw.monsterId) : null,
    monsterName: typeof raw?.monsterName === 'string' ? raw.monsterName : 'Enemy',
    monsterRarity: typeof raw?.monsterRarity === 'string' ? raw.monsterRarity : 'common',
    monsterDescription:
      raw?.monsterDescription != null ? String(raw.monsterDescription) : null,
    round: round > 0 ? round : 1,
    turn,
    rounds,
    rewardGranted: Boolean(raw?.rewardGranted ?? (reward ? true : false)),
    reward,
  }
}

async function getUserCharacterIds(userId: number) {
  const rows = await prisma.character.findMany({
    where: { userId: BigInt(userId), isNpc: false },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}

async function fetchCombatForUser(
  combatId: bigint,
  userCharacterIds: bigint[],
): Promise<CombatWithParticipants | null> {
  if (!userCharacterIds.length) return null
  return prisma.combat.findFirst({
    where: {
      id: combatId,
      participants: { some: { entityId: { in: userCharacterIds }, isAi: false } },
    },
    include: {
      participants: true,
      result: true,
      effects: { include: { effect: true } },
    },
  })
}

function serializeCombat(
  combat: CombatWithParticipants,
  userCharacterIds: bigint[],
): Record<string, unknown> {
  const meta = parseCombatMeta(combat)
  const details = combat.participants.map((participant) => ({
    participant,
    snapshot: parseParticipantSnapshot(participant),
  }))

  const playerEntry =
    details.find((entry) => !entry.participant.isAi && userCharacterIds.includes(entry.participant.entityId)) ??
    details.find((entry) => !entry.participant.isAi)
  const enemyEntry = details.find((entry) => entry.participant.isAi)

  const participants = details
    .map(({ participant, snapshot }) => ({
      id: Number(participant.id),
      name: participant.name,
      team: participant.team,
      isAi: participant.isAi,
      position: clonePosition(snapshot.current.position),
      hp: snapshot.current.hp,
      stats: snapshot.stats,
      current: {
        hp: snapshot.current.hp,
        mana: snapshot.current.mana,
        position: clonePosition(snapshot.current.position),
      },
      initial: {
        hp: snapshot.initial.hp,
        mana: snapshot.initial.mana,
        position: clonePosition(snapshot.initial.position),
      },
      meta: snapshot.monster ?? null,
    }))
    .sort((a, b) => a.team - b.team || a.id - b.id)

  const availableActions =
    combat.status !== 'finished' && meta.turn === 'player' && playerEntry && enemyEntry
      ? computeAvailableActions(playerEntry.snapshot, enemyEntry.snapshot, enemyEntry.participant.id)
      : {
          canMove: false,
          movePositions: [],
          canAttack: false,
          attackTargets: [],
          canWait: false,
          spells:
            playerEntry?.snapshot.spells?.map((spell) => ({
              id: spell.id,
              name: spell.name,
              castType: spell.castType,
              target: spell.target,
              range: spell.range,
              areaRange: spell.areaRange,
              manaCost: spell.manaCost,
              damage: spell.damage,
              effects: spell.effects,
            })) ?? [],
        }

  const playerSpells = playerEntry?.snapshot.spells ?? []

  return {
    id: Number(combat.id),
    status: combat.status,
    board: { width: combat.boardWidth, height: combat.boardHeight },
    currentRound: combat.currentRound,
    turn: meta.turn,
    rounds: meta.rounds,
    participants,
    playerTeam: playerEntry?.participant.team ?? null,
    result: combat.result
      ? {
          winningTeam: combat.result.winningTeam,
          summary: combat.result.summaryJson ?? null,
        }
      : null,
    meta: {
      monsterName: meta.monsterName,
      monsterRarity: meta.monsterRarity,
      monsterDescription: meta.monsterDescription,
      playerCharacterName: meta.playerCharacterName,
      rewardGranted: Boolean(meta.rewardGranted),
      reward: meta.reward
        ? {
            gold: meta.reward.gold,
            itemTemplateId: meta.reward.itemTemplateId,
            itemName: meta.reward.itemName,
          }
        : null,
    },
    availableActions,
    playerSpells,
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, passwordAgain } = req.body ?? {}
    if (!email || !username || !password || !passwordAgain)
      return res.status(400).json({ error: 'Missing fields' })
    if (password !== passwordAgain)
      return res.status(400).json({ error: 'Passwords do not match' })

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    })
    if (existing) return res.status(409).json({ error: 'User already exists' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, username, password: hash },
      select: { id: true, email: true, username: true },
    })
    const token = jwt.sign({ uid: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' })
    return res.status(201).json({ user: toUserDto(user), token })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body ?? {}
    if (!identifier || !password)
      return res.status(400).json({ error: 'Missing credentials' })

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      select: { id: true, email: true, username: true, password: true },
    })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ uid: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' })
    return res.json({ user: toUserDto(user), token })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/ancestries', authRequired, async (_req: AuthedRequest, res: Response) => {
  try {
    const items = await prisma.ancestry.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    })
    return res.json({ items: items.map(toAncestryDto) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/professions', authRequired, async (_req: AuthedRequest, res: Response) => {
  try {
    const items = await prisma.profession.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    })
    return res.json({ items: items.map(toProfessionDto) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// List characters for authed user
app.get('/api/characters', authRequired, async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!
  const items = await prisma.character.findMany({
    where: { userId: BigInt(userId) },
    select: { id: true, name: true, level: true, ancestryId: true },
    orderBy: { dateCreated: 'desc' },
  })
  return res.json({ items: items.map(toCharacterDto) })
})

async function loadShopState(characterId: bigint) {
  const inventory = await prisma.characterInventory.findMany({
    where: { ownerCharacterId: characterId },
    select: {
      id: true,
      amount: true,
      template: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          slotCode: true,
          valueGold: true,
          attributes: {
            select: {
              value: true,
              attribute: { select: { name: true } },
            },
          },
        },
      },
      equipped: { select: { slotCode: true } },
    },
  })

  const vendorTemplates = (await prisma.itemTemplate.findMany(
    {
      where: { inShop: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        slotCode: true,
        valueGold: true,
        inShop: true,
        attributes: {
          select: {
            value: true,
            attribute: { select: { name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    } as any,
  )) as unknown as ShopTemplateRecord[]

  const coinEntry = inventory.find((record) => record.template.slug === 'gold-coin')
  const coins = Number(coinEntry?.amount ?? 0)
  const playerItems = inventory
    .filter((record) => record.template.slug !== 'gold-coin' && !record.equipped)
    .map(toShopPlayerItem)

  const vendorItems = vendorTemplates.filter((template) => template.inShop).map(toVendorItem)

  return {
    coins,
    playerItems,
    vendorItems,
  }
}

app.get('/api/shop/:id', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    if (!Number.isInteger(characterId) || characterId <= 0)
      return res.status(400).json({ error: 'Invalid character id' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const state = await loadShopState(character.id)
    return res.json(state)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/shop/:id/trade', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    if (!Number.isInteger(characterId) || characterId <= 0)
      return res.status(400).json({ error: 'Invalid character id' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const rawSell = Array.isArray(req.body?.sellItems) ? req.body.sellItems : []
    const rawBuy = Array.isArray(req.body?.buyItems) ? req.body.buyItems : []

    const sellMap = new Map<number, number>()
    for (const raw of rawSell) {
      const inventoryId = Number(raw?.inventoryId)
      const amount = Number(raw?.amount ?? 1)
      if (!Number.isInteger(inventoryId) || inventoryId <= 0)
        return res.status(400).json({ error: 'Invalid inventory id' })
      if (!Number.isInteger(amount) || amount <= 0)
        return res.status(400).json({ error: 'Invalid amount for item to sell' })
      sellMap.set(inventoryId, (sellMap.get(inventoryId) ?? 0) + amount)
    }

    const buyMap = new Map<number, number>()
    for (const raw of rawBuy) {
      const templateId = Number(raw?.templateId)
      const amount = Number(raw?.amount ?? 1)
      if (!Number.isInteger(templateId) || templateId <= 0)
        return res.status(400).json({ error: 'Invalid item template id' })
      if (!Number.isInteger(amount) || amount <= 0)
        return res.status(400).json({ error: 'Invalid amount for item to buy' })
      buyMap.set(templateId, (buyMap.get(templateId) ?? 0) + amount)
    }

    const sells = Array.from(sellMap.entries()).map(([inventoryId, amount]) => ({ inventoryId, amount }))
    const buys = Array.from(buyMap.entries()).map(([templateId, amount]) => ({ templateId, amount }))

    if (sells.length === 0 && buys.length === 0)
      return res.status(400).json({ error: 'No trade items provided' })

    try {
      await prisma.$transaction(async (tx) => {
        const charId = character.id

        const coinTemplate = await tx.itemTemplate.findFirst({
          where: { slug: 'gold-coin' },
          select: { id: true },
        })
        if (!coinTemplate) throw new ShopError(500, 'Missing gold coin template')

        const coinInventory = await tx.characterInventory.findFirst({
          where: { ownerCharacterId: charId, templateId: coinTemplate.id },
          select: { id: true, amount: true },
        })
        const currentCoins = Number(coinInventory?.amount ?? 0)

        const sellRecords = sells.length
          ? await tx.characterInventory.findMany({
              where: { ownerCharacterId: charId, id: { in: sells.map((item) => BigInt(item.inventoryId)) } },
              select: {
                id: true,
                amount: true,
                templateId: true,
                template: { select: { valueGold: true, slug: true } },
                equipped: { select: { slotCode: true } },
              },
            })
          : []
        const sellById = new Map<number, (typeof sellRecords)[number]>()
        for (const record of sellRecords) {
          sellById.set(Number(record.id), record)
        }

        let totalGain = 0
        for (const sell of sells) {
          const record = sellById.get(sell.inventoryId)
          if (!record) throw new ShopError(400, 'Item not found in inventory')
          if (record.equipped) throw new ShopError(400, 'Cannot trade equipped items')
          if (record.template.slug === 'gold-coin') throw new ShopError(400, 'Cannot trade gold coins directly')
          if (sell.amount > record.amount) throw new ShopError(400, 'Not enough items to sell')
          totalGain += record.template.valueGold * sell.amount
        }

        const buyTemplates = buys.length
          ? ((await tx.itemTemplate.findMany(
              {
                where: { id: { in: buys.map((item) => BigInt(item.templateId)) }, inShop: true },
                select: { id: true, valueGold: true, slug: true, inShop: true },
              } as any,
            )) as unknown as Array<{ id: bigint; valueGold: number; slug: string; inShop: boolean }>)
          : []
        const buyById = new Map<number, (typeof buyTemplates)[number]>()
        for (const template of buyTemplates) {
          if (template.inShop) buyById.set(Number(template.id), template)
        }

        for (const buy of buys) {
          if (!buyById.has(buy.templateId))
            throw new ShopError(400, 'Requested item is not available in shop')
        }

        let totalCost = 0
        for (const buy of buys) {
          const template = buyById.get(buy.templateId)!
          if (template.slug === 'gold-coin') throw new ShopError(400, 'Cannot trade gold coins directly')
          totalCost += template.valueGold * buy.amount
        }

        const newCoinBalance = currentCoins + totalGain - totalCost
        if (newCoinBalance < 0) throw new ShopError(400, 'Not enough gold')

        for (const sell of sells) {
          const record = sellById.get(sell.inventoryId)!
          const remaining = record.amount - sell.amount
          if (remaining < 0) throw new ShopError(400, 'Not enough items to sell')
          if (remaining === 0) {
            await tx.characterInventory.delete({ where: { id: record.id } })
          } else {
            await tx.characterInventory.update({
              where: { id: record.id },
              data: { amount: remaining },
            })
          }
        }

        const existingInventory = buys.length
          ? await tx.characterInventory.findMany({
              where: {
                ownerCharacterId: charId,
                templateId: { in: buys.map((item) => BigInt(item.templateId)) },
              },
              select: { id: true, templateId: true, amount: true },
            })
          : []
        const existingByTemplate = new Map<number, { id: bigint; amount: number }>()
        for (const record of existingInventory) {
          if (record.templateId === coinTemplate.id) continue
          existingByTemplate.set(Number(record.templateId), { id: record.id, amount: record.amount })
        }

        for (const buy of buys) {
          const existing = existingByTemplate.get(buy.templateId)
          if (existing) {
            const updatedAmount = existing.amount + buy.amount
            await tx.characterInventory.update({
              where: { id: existing.id },
              data: { amount: updatedAmount },
            })
            existingByTemplate.set(buy.templateId, { id: existing.id, amount: updatedAmount })
          } else {
            const created = await tx.characterInventory.create({
              data: {
                ownerCharacterId: charId,
                templateId: BigInt(buy.templateId),
                amount: buy.amount,
              },
              select: { id: true, amount: true },
            })
            existingByTemplate.set(buy.templateId, { id: created.id, amount: created.amount })
          }
        }

        if (newCoinBalance === 0) {
          if (coinInventory) {
            await tx.characterInventory.delete({ where: { id: coinInventory.id } })
          }
        } else if (coinInventory) {
          await tx.characterInventory.update({
            where: { id: coinInventory.id },
            data: { amount: newCoinBalance },
          })
        } else {
          await tx.characterInventory.create({
            data: {
              ownerCharacterId: charId,
              templateId: coinTemplate.id,
              amount: newCoinBalance,
            },
          })
        }
      })
    } catch (err) {
      if (err instanceof ShopError)
        return res.status(err.status).json({ error: err.message })
      throw err
    }

    const state = await loadShopState(character.id)
    return res.json(state)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})


async function loadSpellState(characterId: bigint) {
  const [slotTypes, spellbook, loadouts] = await Promise.all([
    prisma.spellSlotType.findMany({
      select: { code: true, name: true, maxPerCharacter: true },
      orderBy: { code: 'asc' },
    }),
    prisma.characterSpellbook.findMany({
      where: { characterId },
      select: {
        spellLevel: true,
        spell: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            cooldown: true,
            slotCode: true,
            castType: true,
            target: true,
            range: true,
            areaRange: true,
            damage: true,
            manaCost: true,
            effects: {
              select: {
                effectId: true,
                durationRounds: true,
                magnitude: true,
                effect: { select: { code: true } },
              },
            },

          },
        },
      },
      orderBy: { learnedAt: 'asc' },
    }),
    prisma.characterSpellbookLoadout.findMany({
      where: { characterId },
      select: {
        slotCode: true,
        slotIndex: true,
        spell: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            cooldown: true,
            slotCode: true,
            castType: true,
            target: true,
            range: true,
            areaRange: true,
            damage: true,
            manaCost: true,
            effects: {
              select: {
                effectId: true,
                durationRounds: true,
                magnitude: true,
                effect: { select: { code: true } },
              },
            },
          },
        },
      },
    }),
  ])

  const loadoutMap = new Map<string, ReturnType<typeof toSpellDto>>()
  for (const entry of loadouts) {
    if (entry.spell) loadoutMap.set(`${entry.slotCode}:${entry.slotIndex}`, toSpellDto(entry.spell))
  }

  const slots = slotTypes.flatMap((slot) => {
    const count = Math.max(1, slot.maxPerCharacter)
    return Array.from({ length: count }, (_, index) => {
      const key = `${slot.code}:${index}`
      const spell = loadoutMap.get(key) ?? null
      const slotName = slot.code === 'spell' ? String(index + 1) : slot.name
      return {
        slotCode: slot.code,
        slotIndex: index,
        slotName,
        spell,
      }
    })
  })

  const learned = spellbook.map((entry) => ({
    ...toSpellDto(entry.spell),
    level: entry.spellLevel,
  }))

  return { slots, learned }
}

app.post('/api/combat/random', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const rawCharacterId = Number(req.body?.characterId)
    if (!Number.isInteger(rawCharacterId) || rawCharacterId <= 0)
      return res.status(400).json({ error: 'Invalid character id' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(rawCharacterId), userId: BigInt(userId), isNpc: false },
      select: {
        id: true,
        name: true,
        level: true,
        attributes: {
          select: {
            value: true,
            attribute: { select: { name: true } },
          },
        },
      },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const existing = await prisma.combatParticipant.findFirst({
      where: {
        entityId: character.id,
        isAi: false,
        combat: { status: { in: ['pending', 'active'] } },
      },
      select: { combatId: true },
    })
    if (existing)
      return res.status(200).json({ combatId: Number(existing.combatId), status: 'existing' })

    const attrLookup = attributesToLookup(character.attributes as CharacterAttributeRecord[])
    const playerStats = buildStatBlock(attrLookup, character.level)
    const playerPosition: Position = { x: 0, y: randomInt(0, COMBAT_BOARD_HEIGHT - 1) }

    const spells = await loadCharacterCombatSpells(character.id)

    const monsters = await prisma.monster.findMany({
      select: { id: true, name: true, rarity: true, description: true },
    })
    const monster = monsters.length ? monsters[randomInt(0, monsters.length - 1)] : null
    const enemyName = monster?.name ?? 'Training Dummy'
    const enemyLevel = Math.max(1, character.level + randomInt(-1, 2))
    const enemyAttrs: AttributeLookup = {
      strength: 10 + enemyLevel * 2 + randomInt(0, 4),
      agility: 10 + enemyLevel * 2 + randomInt(0, 4),
      intelligence: 8 + enemyLevel * 2 + randomInt(0, 4),
      speed: 8 + enemyLevel * 2 + randomInt(0, 3),
      health: 110 + enemyLevel * 8 + randomInt(0, 25),
      mana: 55 + enemyLevel * 4 + randomInt(0, 15),
    }
    const enemyStats = buildStatBlock(enemyAttrs, enemyLevel)
    const enemyPosition: Position = { x: COMBAT_BOARD_WIDTH - 1, y: randomInt(0, COMBAT_BOARD_HEIGHT - 1) }

    const playerSnapshot: ParticipantSnapshot = {
      kind: 'player',
      level: character.level,
      stats: playerStats,
      initial: {
        hp: playerStats.hpMax,
        mana: playerStats.manaMax,
        position: clonePosition(playerPosition),
      },
      current: {
        hp: playerStats.hpMax,
        mana: playerStats.manaMax,
        position: clonePosition(playerPosition),
      },
      actions: { ...ACTION_LIBRARY },
      spells,
    }

    const enemySnapshot: ParticipantSnapshot = {
      kind: 'enemy',
      level: enemyLevel,
      stats: enemyStats,
      initial: {
        hp: enemyStats.hpMax,
        mana: enemyStats.manaMax,
        position: clonePosition(enemyPosition),
      },
      current: {
        hp: enemyStats.hpMax,
        mana: enemyStats.manaMax,
        position: clonePosition(enemyPosition),
      },
      actions: { ...ACTION_LIBRARY },
      monster: monster
        ? {
            id: Number(monster.id),
            name: monster.name,
            rarity: monster.rarity,
            description: monster.description,
          }
        : undefined,
    }

    const meta: CombatMeta = {
      source: 'world-random',
      playerCharacterId: Number(character.id),
      playerCharacterName: character.name,
      monsterId: monster ? Number(monster.id) : null,
      monsterName: enemyName,
      monsterRarity: monster?.rarity ?? 'common',
      monsterDescription: monster?.description ?? null,
      round: 1,
      turn: 'player',
      rounds: [{ round: 1, log: [] }],
      rewardGranted: false,
    }

    const now = new Date()

    const combat = await prisma.$transaction(async (tx) => {
      const created = await tx.combat.create({
        data: {
          status: 'active',
          boardWidth: COMBAT_BOARD_WIDTH,
          boardHeight: COMBAT_BOARD_HEIGHT,
          currentRound: 1,
          currentTurnIndex: 0,
          originType: 'pve',
          originMeta: meta,
          startedAt: now,
        },
      })

      await tx.combatTeam.createMany({
        data: [
          { combatId: created.id, team: 1 },
          { combatId: created.id, team: 2 },
        ],
      })

      await tx.combatParticipant.create({
        data: {
          combatId: created.id,
          team: 1,
          entityId: character.id,
          name: character.name,
          isAi: false,
          tileX: playerPosition.x,
          tileY: playerPosition.y,
          hpCurrent: playerStats.hpMax,
          initiative: playerStats.spd,
          snapshotJson: playerSnapshot,
        },
      })

      await tx.combatParticipant.create({
        data: {
          combatId: created.id,
          team: 2,
          entityId: monster ? monster.id : BigInt(0),
          name: enemyName,
          isAi: true,
          tileX: enemyPosition.x,
          tileY: enemyPosition.y,
          hpCurrent: enemyStats.hpMax,
          initiative: enemyStats.spd,
          snapshotJson: enemySnapshot,
        },
      })

      return tx.combat.findUnique({
        where: { id: created.id },
        include: { participants: true, result: true, effects: { include: { effect: true } } },
      })
    })

    if (!combat) throw new Error('Failed to load combat after creation')

    return res.status(201).json(serializeCombat(combat, [character.id]))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/combat/:id', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const combatIdNumber = Number(req.params.id)
    if (!Number.isInteger(combatIdNumber) || combatIdNumber <= 0)
      return res.status(400).json({ error: 'Invalid combat id' })

    const userCharacterIds = await getUserCharacterIds(userId)
    if (!userCharacterIds.length) return res.status(404).json({ error: 'No characters found' })

    const combat = await fetchCombatForUser(BigInt(combatIdNumber), userCharacterIds)
    if (!combat) return res.status(404).json({ error: 'Combat not found' })

    return res.json(serializeCombat(combat, userCharacterIds))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/combat/:id/action', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const combatIdNumber = Number(req.params.id)
    if (!Number.isInteger(combatIdNumber) || combatIdNumber <= 0)
      return res.status(400).json({ error: 'Invalid combat id' })

    const actionKey = String(req.body?.action ?? '').toLowerCase()
    if (actionKey !== 'move' && actionKey !== 'attack' && actionKey !== 'wait' && actionKey !== 'spell')
      return res.status(400).json({ error: 'Unsupported action' })

    const userCharacterIds = await getUserCharacterIds(userId)
    if (!userCharacterIds.length) return res.status(404).json({ error: 'No characters found' })

    const combat = await fetchCombatForUser(BigInt(combatIdNumber), userCharacterIds)
    if (!combat) return res.status(404).json({ error: 'Combat not found' })
    if (combat.status === 'finished')
      return res.status(409).json({ error: 'Combat already finished' })

    const meta = parseCombatMeta(combat)
    if (meta.turn !== 'player') return res.status(409).json({ error: 'Not player turn' })

    const playerRecord =
      combat.participants.find(
        (participant) => !participant.isAi && userCharacterIds.includes(participant.entityId),
      ) ?? combat.participants.find((participant) => !participant.isAi)
    const enemyRecord = combat.participants.find((participant) => participant.isAi)
    if (!playerRecord || !enemyRecord) return res.status(404).json({ error: 'Participants missing' })

    const playerSnapshot = parseParticipantSnapshot(playerRecord)
    const enemySnapshot = parseParticipantSnapshot(enemyRecord)

    const available = computeAvailableActions(playerSnapshot, enemySnapshot, enemyRecord.id)
    const spellsById = new Map((playerSnapshot.spells ?? []).map((spell) => [spell.id, spell]))
    const participantsLookup = new Map<number, { record: CombatParticipantRecord; snapshot: ParticipantSnapshot }>([
      [Number(playerRecord.id), { record: playerRecord, snapshot: playerSnapshot }],
      [Number(enemyRecord.id), { record: enemyRecord, snapshot: enemySnapshot }],
    ])

    const logPlayerName = playerRecord.name
    const logEnemyName = enemyRecord.name

    const clampHp = (value: number) => Math.max(0, Math.round(value))

    const applyAttack = (
      attackerName: string,
      attackerSnapshot: ParticipantSnapshot,
      defenderSnapshot: ParticipantSnapshot,
    ) => {
      const base = Math.ceil(attackerSnapshot.stats.str * 1.5)
      const variance = randomInt(-2, 2)
      const damage = Math.max(1, base + variance)
      defenderSnapshot.current.hp = Math.max(0, defenderSnapshot.current.hp - damage)
      appendRoundLog(meta, `${attackerName} attacked for ${damage} damage (HP ${defenderSnapshot.current.hp}).`)
    }

    let pendingSpell: {
      spell: SpellSummary
      target: { record: CombatParticipantRecord; snapshot: ParticipantSnapshot }
      effects: Array<{ effectId: number; durationRounds: number; data: Record<string, unknown> }>
    } | null = null
    let performedWait = false

    if (actionKey === 'move') {
      if (!available.canMove)
        return res.status(400).json({ error: 'Move not available' })
      const targetX = Number(req.body?.position?.x)
      const targetY = Number(req.body?.position?.y)
      const target = available.movePositions.find((tile) => tile.x === targetX && tile.y === targetY)
      if (!target) return res.status(400).json({ error: 'Invalid move target' })
      playerSnapshot.current.position = clonePosition(target)
      appendRoundLog(meta, `${logPlayerName} moved to (${target.x + 1}, ${target.y + 1}).`)
    } else if (actionKey === 'attack') {
      if (!available.canAttack)
        return res.status(400).json({ error: 'Enemy not in range to attack' })
      applyAttack(logPlayerName, playerSnapshot, enemySnapshot)
    } else if (actionKey === 'spell') {
      const spellId = Number(req.body?.spellId)
      if (!Number.isInteger(spellId) || spellId <= 0)
        return res.status(400).json({ error: 'Invalid spell id' })

      const spell = spellsById.get(spellId)
      if (!spell) return res.status(400).json({ error: 'Spell not available' })

      const isSpellAvailable = available.spells.some((entry) => entry.id === spell.id)
      if (!isSpellAvailable)
        return res.status(400).json({ error: 'Spell cannot be cast right now' })

      if (spell.slug !== 'fireball' || spell.castType !== 'point_click' || spell.target !== 'enemy') {
        appendRoundLog(meta, `${logPlayerName} attempts to cast ${spell.name}, but nothing happens.`)
        performedWait = true
      } else {
        if (playerSnapshot.current.mana < spell.manaCost)
          return res.status(400).json({ error: 'Not enough mana' })

        const targetPayload = req.body?.target ?? {}
        const targetParticipantId = Number(targetPayload?.participantId)
        if (!Number.isInteger(targetParticipantId) || targetParticipantId <= 0)
          return res.status(400).json({ error: 'Invalid spell target' })

        const targetEntry = participantsLookup.get(targetParticipantId)
        if (!targetEntry || !targetEntry.record.isAi)
          return res.status(400).json({ error: 'Spell target must be an enemy' })

        const distance = chebyshevDistance(
          playerSnapshot.current.position,
          targetEntry.snapshot.current.position,
        )
        if (distance > spell.range)
          return res.status(400).json({ error: 'Target out of range' })

        playerSnapshot.current.mana = Math.max(0, playerSnapshot.current.mana - spell.manaCost)

        const totalDamage = Math.max(0, spell.damage + playerSnapshot.stats.int)
        targetEntry.snapshot.current.hp = Math.max(0, targetEntry.snapshot.current.hp - totalDamage)
        appendRoundLog(
          meta,
          `${logPlayerName} casts ${spell.name} on ${targetEntry.record.name} for ${totalDamage} damage.`,
        )

        pendingSpell = {
          spell,
          target: targetEntry,
          effects: [],
        }

        if (targetEntry.snapshot.current.hp > 0) {
          const igniteEffect = spell.effects.find((effect) => effect.effectCode === 'ignite')
          if (igniteEffect && igniteEffect.durationRounds > 0) {
            appendRoundLog(meta, `${targetEntry.record.name} is ignited.`)
            pendingSpell.effects.push({
              effectId: igniteEffect.effectId,
              durationRounds: igniteEffect.durationRounds,
              data: {
                remainingRounds: igniteEffect.durationRounds,
                damagePerTick: playerSnapshot.stats.int,
                sourceParticipantId: Number(playerRecord.id),
              },
            })
          }
        }
      }
    } else {
      if (!available.canWait) return res.status(400).json({ error: 'Wait not available' })
      appendRoundLog(meta, `${logPlayerName} waited.`)
      performedWait = true
    }

    let combatStatus: 'active' | 'finished' = 'active'
    let winningTeam: number | null = null
    let summaryWinner: 'player' | 'enemy' | null = null

    if (enemySnapshot.current.hp <= 0) {
      combatStatus = 'finished'
      winningTeam = playerRecord.team
      summaryWinner = 'player'
      meta.turn = 'finished'
      appendRoundLog(meta, `${logPlayerName} is victorious!`)
    } else {
      meta.turn = 'enemy'

      const enemyEffects = await processStartOfTurnEffects(
        combat.id,
        { record: enemyRecord, snapshot: enemySnapshot },
        meta,
        participantsLookup,
      )

      if (enemySnapshot.current.hp <= 0 || enemyEffects.actorDied) {
        combatStatus = 'finished'
        winningTeam = playerRecord.team
        summaryWinner = 'player'
        meta.turn = 'finished'
        appendRoundLog(meta, `${logEnemyName} succumbs to lingering effects.`)
      } else {
        const enemyOptions = computeAvailableActions(enemySnapshot, playerSnapshot, playerRecord.id)
        if (enemyOptions.canAttack) {
          applyAttack(logEnemyName, enemySnapshot, playerSnapshot)
        } else if (enemyOptions.canMove) {
          const sortedMoves = enemyOptions.movePositions
            .slice()
            .sort(
              (a, b) =>
                chebyshevDistance(a, playerSnapshot.current.position) -
                chebyshevDistance(b, playerSnapshot.current.position),
            )
          const target = sortedMoves[0] ?? enemyOptions.movePositions[0]
          if (target) {
            enemySnapshot.current.position = clonePosition(target)
            appendRoundLog(meta, `${logEnemyName} moved to (${target.x + 1}, ${target.y + 1}).`)
          } else {
            appendRoundLog(meta, `${logEnemyName} waited.`)
          }
        } else {
          appendRoundLog(meta, `${logEnemyName} waited.`)
        }

        if (playerSnapshot.current.hp <= 0) {
          combatStatus = 'finished'
          winningTeam = enemyRecord.team
          summaryWinner = 'enemy'
          meta.turn = 'finished'
          appendRoundLog(meta, `${logEnemyName} wins the duel.`)
        } else {
          meta.round += 1
          meta.turn = 'player'
          if (combatStatus === 'active') {
            const playerEffects = await processStartOfTurnEffects(
              combat.id,
              { record: playerRecord, snapshot: playerSnapshot },
              meta,
              participantsLookup,
            )
            if (playerSnapshot.current.hp <= 0 || playerEffects.actorDied) {
              combatStatus = 'finished'
              winningTeam = enemyRecord.team
              summaryWinner = 'enemy'
              meta.turn = 'finished'
              appendRoundLog(meta, `${logPlayerName} collapses from lingering effects.`)
            }
          }
        }
      }
    }

    const playerPositionUpdated = clonePosition(playerSnapshot.current.position)
    const enemyPositionUpdated = clonePosition(enemySnapshot.current.position)

    await prisma.$transaction(async (tx) => {
      await tx.combatParticipant.update({
        where: { id: playerRecord.id },
        data: {
          tileX: playerPositionUpdated.x,
          tileY: playerPositionUpdated.y,
          hpCurrent: clampHp(playerSnapshot.current.hp),
          snapshotJson: {
            ...playerSnapshot,
            current: {
              hp: playerSnapshot.current.hp,
              mana: playerSnapshot.current.mana,
              position: playerPositionUpdated,
            },
            initial: {
              hp: playerSnapshot.initial.hp,
              mana: playerSnapshot.initial.mana,
              position: clonePosition(playerSnapshot.initial.position),
            },
          },
        },
      })

      await tx.combatParticipant.update({
        where: { id: enemyRecord.id },
        data: {
          tileX: enemyPositionUpdated.x,
          tileY: enemyPositionUpdated.y,
          hpCurrent: clampHp(enemySnapshot.current.hp),
          snapshotJson: {
            ...enemySnapshot,
            current: {
              hp: enemySnapshot.current.hp,
              mana: enemySnapshot.current.mana,
              position: enemyPositionUpdated,
            },
            initial: {
              hp: enemySnapshot.initial.hp,
              mana: enemySnapshot.initial.mana,
              position: clonePosition(enemySnapshot.initial.position),
            },
          },
        },
      })

      if (pendingSpell && combatStatus === 'active' && pendingSpell.effects.length) {
        for (const effect of pendingSpell.effects) {
          await tx.combatEffect.deleteMany({
            where: {
              combatId: combat.id,
              participantId: pendingSpell.target.record.id,
              effectId: BigInt(effect.effectId),
            },
          })
          await tx.combatEffect.create({
            data: {
              combatId: combat.id,
              participantId: pendingSpell.target.record.id,
              sourceParticipantId: playerRecord.id,
              effectId: BigInt(effect.effectId),
              stacks: 1,
              expiresRound: meta.round + effect.durationRounds,
              dataJson: effect.data as Prisma.JsonObject,
            },
          })
        }
      }

      if (combatStatus === 'finished' && summaryWinner === 'player' && meta.rewardGranted !== true) {
        await grantCombatRewards(tx, playerRecord.entityId, meta)
      }

      const maxRoundsStored = 50
      if (meta.rounds.length > maxRoundsStored) meta.rounds = meta.rounds.slice(-maxRoundsStored)

      await tx.combat.update({
        where: { id: combat.id },
        data: {
          status: combatStatus,
          currentRound: meta.round,
          currentTurnIndex: meta.turn === 'enemy' ? 1 : 0,
          originMeta: meta,
          endedAt: combatStatus === 'finished' ? new Date() : combat.endedAt,
        },
      })

      if (combatStatus === 'finished') {
        const summary = {
          winner: summaryWinner,
          totalRounds: meta.rounds.length,
          rounds: meta.rounds,
          enemy: {
            name: meta.monsterName,
            rarity: meta.monsterRarity,
          },
        }
        if (combat.result) {
          await tx.combatResult.update({
            where: { combatId: combat.id },
            data: { winningTeam, summaryJson: summary },
          })
        } else {
          await tx.combatResult.create({
            data: {
              combatId: combat.id,
              winningTeam,
              summaryJson: summary,
            },
          })
        }
      }
    })

    const refreshed = await fetchCombatForUser(BigInt(combat.id), userCharacterIds)
    if (!refreshed) return res.status(404).json({ error: 'Combat not found' })

    return res.json(serializeCombat(refreshed, userCharacterIds))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/social/players', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const search = String(req.query.search ?? '').trim()
    const players = (await prisma.character.findMany({
      where: {
        isNpc: false,
        name: search ? ({ contains: search, mode: Prisma.QueryMode.insensitive } as any) : undefined,
      },
      select: {
        id: true,
        name: true,
        level: true,
        ancestry: { select: { name: true } },
        guildMember: { select: { guild: { select: { name: true } } } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    })) as PlayerRecord[]
    return res.json({ items: players.map(toPlayerDto) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/characters/:id', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    if (!Number.isFinite(characterId)) return res.status(400).json({ error: 'Invalid character id' })

    const character = await prisma.character.findUnique({
      where: { id: BigInt(characterId) },
      select: {
        id: true,
        name: true,
        level: true,
        userId: true,
        isNpc: true,
        ancestry: { select: { id: true, name: true, description: true } },
        attributes: {
          select: {
            value: true,
            attribute: { select: { name: true } },
          },
          orderBy: { attribute: { name: 'asc' } },
        },
        inventories: {
          select: {
            id: true,
            amount: true,
            template: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                slotCode: true,
                valueGold: true,
                attributes: {
                  select: {
                    value: true,
                    attribute: { select: { name: true } },
                  },
                },
              },
            },
            equipped: { select: { slotCode: true } },
          },
          orderBy: { dateCreated: 'asc' },
        },
        professions: {
          select: {
            skill: true,
            profession: { select: { id: true, name: true, description: true } },
          },
        },
      },
    })

    if (!character || character.isNpc) return res.status(404).json({ error: 'Character not found' })

    const isSelf = character.userId !== null && character.userId === BigInt(userId)
    const inventorySource = isSelf
      ? character.inventories
      : character.inventories.filter((item) => item.equipped !== null)
    const spellbookState = await loadSpellState(character.id)
    const professionEntry = character.professions[0] ?? null

    return res.json({
      character: {
        id: Number(character.id),
        name: character.name,
        level: character.level,
        ancestry: character.ancestry ? toAncestryDto(character.ancestry) : null,
        isSelf,
      },
      profession: professionEntry ? toCharacterProfessionDto(professionEntry) : null,
      attributes: character.attributes.map(toAttributeDto),
      inventory: inventorySource.map(toInventoryDto),
      spellbook: {
        slots: spellbookState.slots,
        learned: isSelf ? spellbookState.learned : [],
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// Create simple character (temporary minimal payload)
app.post('/api/characters', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { name, ancestryId } = req.body ?? {}
    if (!name) return res.status(400).json({ error: 'Missing name' })

    const ancestryIdNumber = Number(ancestryId)
    if (!Number.isInteger(ancestryIdNumber) || ancestryIdNumber <= 0)
      return res.status(400).json({ error: 'Invalid ancestry' })

    const ancestry = await prisma.ancestry.findUnique({
      where: { id: BigInt(ancestryIdNumber) },
      select: { id: true },
    })
    if (!ancestry) return res.status(404).json({ error: 'Ancestry not found' })

    const baseAttributes = await prisma.attribute.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    if (baseAttributes.length === 0)
      return res.status(500).json({ error: 'No base attributes configured' })

    const created = await prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          userId: BigInt(userId),
          ancestryId: ancestry.id,
          name,
        },
        select: { id: true, name: true, level: true, ancestryId: true },
      })

      await tx.characterAttribute.createMany({
        data: baseAttributes.map((attr) => ({
          characterId: character.id,
          attributeId: attr.id,
          value: 1,
        })),
      })

      return character
    })

    return res.status(201).json({ item: toCharacterDto(created) })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// Delete character
app.delete('/api/characters/:id', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    if (!Number.isFinite(characterId)) return res.status(400).json({ error: 'Invalid character id' })

    const expectedUserId = BigInt(userId)
    const existing = await prisma.character.findUnique({
      where: { id: BigInt(characterId) },
      select: { userId: true },
    })

    if (!existing || existing.userId === null || existing.userId !== expectedUserId)
      return res.status(404).json({ error: 'Character not found' })

    await prisma.character.delete({ where: { id: BigInt(characterId) } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/characters/:id/equipment', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const { inventoryId, slotCode } = req.body ?? {}
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!Number.isInteger(inventoryId) || inventoryId <= 0) return res.status(400).json({ error: 'Invalid inventory id' })
    if (!slotCode || typeof slotCode !== 'string') return res.status(400).json({ error: 'Invalid slot code' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId) },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const inventory = await prisma.characterInventory.findFirst({
      where: { id: BigInt(inventoryId), ownerCharacterId: character.id },
      select: {
        id: true,
        template: { select: { slotCode: true } },
      },
    })
    if (!inventory) return res.status(404).json({ error: 'Item not found' })
    if (!inventory.template.slotCode) return res.status(400).json({ error: 'Item is not equipable' })
    if (inventory.template.slotCode !== slotCode) return res.status(400).json({ error: 'Item cannot be equipped in this slot' })

    await prisma.$transaction(async (tx) => {
      await tx.characterEquipment.deleteMany({
        where: {
          characterId: character.id,
          OR: [
            { slotCode },
            { characterInventoryId: inventory.id },
          ],
        },
      })

      await tx.characterEquipment.create({
        data: {
          characterId: character.id,
          slotCode,
          characterInventoryId: inventory.id,
        },
      })
    })

    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})


app.delete('/api/characters/:id/equipment/:slotCode', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const slotCode = req.params.slotCode
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!slotCode) return res.status(400).json({ error: 'Invalid slot code' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId) },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    await prisma.characterEquipment.deleteMany({
      where: { characterId: character.id, slotCode },
    })

    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/characters/:id/spells', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const slotCodeRaw = typeof req.body?.slotCode === 'string' ? req.body.slotCode.trim() : ''
    const slotIndexRaw = Number(req.body?.slotIndex)
    const spellIdRaw = Number(req.body?.spellId)
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!slotCodeRaw) return res.status(400).json({ error: 'Invalid spell slot' })
    if (!Number.isInteger(slotIndexRaw) || slotIndexRaw < 0) return res.status(400).json({ error: 'Invalid spell slot index' })
    if (!Number.isInteger(spellIdRaw) || spellIdRaw <= 0) return res.status(400).json({ error: 'Invalid spell id' })
    const slotCode = slotCodeRaw
    const slotIndex = slotIndexRaw
    const spellId = spellIdRaw
    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })
    try {
      await prisma.$transaction(async (tx) => {
        const slotType = await tx.spellSlotType.findUnique({ where: { code: slotCode }, select: { maxPerCharacter: true } })
        if (!slotType) throw new SpellLoadoutError(400, 'Invalid spell slot')
        if (slotIndex >= slotType.maxPerCharacter) throw new SpellLoadoutError(400, 'Invalid spell slot index')
        const knownSpell = await tx.characterSpellbook.findUnique({
          where: { characterId_spellId: { characterId: character.id, spellId: BigInt(spellId) } },
          select: { spellId: true, spell: { select: { slotCode: true } } },
        })
        if (!knownSpell) throw new SpellLoadoutError(400, 'Spell not learned')
        if ((knownSpell.spell?.slotCode ?? 'spell') !== slotCode)
          throw new SpellLoadoutError(400, 'Spell cannot be assigned to this slot')
        await tx.characterSpellbookLoadout.upsert({
          where: { characterId_slotCode_slotIndex: { characterId: character.id, slotCode, slotIndex } },
          update: { spellId: BigInt(spellId) },
          create: { characterId: character.id, slotCode, slotIndex, spellId: BigInt(spellId) },
        })
      })
    } catch (err) {
      if (err instanceof SpellLoadoutError) return res.status(err.status).json({ error: err.message })
      throw err
    }
    const spells = await loadSpellState(character.id)
    return res.json(spells)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/characters/:id/spells/:slotCode/:slotIndex', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const slotCode = String(req.params.slotCode || '').trim()
    const slotIndex = Number(req.params.slotIndex)
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!slotCode) return res.status(400).json({ error: 'Invalid spell slot' })
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return res.status(400).json({ error: 'Invalid spell slot index' })
    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })
    const slotType = await prisma.spellSlotType.findUnique({ where: { code: slotCode }, select: { maxPerCharacter: true } })
    if (!slotType) return res.status(400).json({ error: 'Invalid spell slot' })
    if (slotIndex >= slotType.maxPerCharacter) return res.status(400).json({ error: 'Invalid spell slot index' })
    await prisma.characterSpellbookLoadout.deleteMany({
      where: { characterId: character.id, slotCode, slotIndex },
    })
    const spells = await loadSpellState(character.id)
    return res.json(spells)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/characters/:id/profession', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const professionIdRaw = Number(req.body?.professionId)
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!Number.isInteger(professionIdRaw) || professionIdRaw <= 0)
      return res.status(400).json({ error: 'Invalid profession id' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true, professions: { select: { professionId: true }, take: 1 } },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })
    if (character.professions.length > 0)
      return res.status(409).json({ error: 'Character already has a profession' })

    const profession = await prisma.profession.findUnique({
      where: { id: BigInt(professionIdRaw) },
      select: { id: true, name: true, description: true },
    })
    if (!profession) return res.status(404).json({ error: 'Profession not found' })

    try {
      const created = await prisma.characterProfession.create({
        data: {
          characterId: character.id,
          professionId: profession.id,
          skill: 1,
        },
        select: {
          skill: true,
          profession: { select: { id: true, name: true, description: true } },
        },
      })
      return res.status(201).json({ profession: toCharacterProfessionDto(created) })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        return res.status(409).json({ error: 'Character already has a profession' })
      throw err
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.patch('/api/characters/:id/profession', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    const skillRaw = Number(req.body?.skill)
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })
    if (!Number.isInteger(skillRaw) || skillRaw < 1 || skillRaw > 300)
      return res.status(400).json({ error: 'Skill must be between 1 and 300' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const existing = await prisma.characterProfession.findUnique({
      where: { characterId: character.id },
      select: {
        skill: true,
        profession: { select: { id: true, name: true, description: true } },
      },
    })
    if (!existing) return res.status(404).json({ error: 'Profession not set' })
    if (existing.skill === skillRaw) return res.json({ profession: toCharacterProfessionDto(existing) })

    const updated = await prisma.characterProfession.update({
      where: { characterId: character.id },
      data: { skill: skillRaw },
      select: {
        skill: true,
        profession: { select: { id: true, name: true, description: true } },
      },
    })
    return res.json({ profession: toCharacterProfessionDto(updated) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/characters/:id/profession', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const characterId = Number(req.params.id)
    if (!Number.isInteger(characterId) || characterId <= 0) return res.status(400).json({ error: 'Invalid character id' })

    const character = await prisma.character.findFirst({
      where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!character) return res.status(404).json({ error: 'Character not found' })

    const result = await prisma.characterProfession.deleteMany({ where: { characterId: character.id } })
    if (result.count === 0) return res.status(404).json({ error: 'Profession not set' })

    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/relationships', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { sourceCharacterId, targetCharacterId } = req.body ?? {}
    if (!Number.isInteger(sourceCharacterId) || sourceCharacterId <= 0)
      return res.status(400).json({ error: 'Invalid source character id' })
    if (!Number.isInteger(targetCharacterId) || targetCharacterId <= 0)
      return res.status(400).json({ error: 'Invalid target character id' })
    if (sourceCharacterId === targetCharacterId)
      return res.status(400).json({ error: 'Cannot add yourself as a friend' })

    const source = await prisma.character.findFirst({
      where: { id: BigInt(sourceCharacterId), userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    if (!source) return res.status(404).json({ error: 'Source character not found' })

    const target = await prisma.character.findFirst({
      where: { id: BigInt(targetCharacterId), isNpc: false },
      select: { id: true },
    })
    if (!target) return res.status(404).json({ error: 'Target character not found' })

    const aId = source.id < target.id ? source.id : target.id
    const bId = source.id < target.id ? target.id : source.id

    await prisma.relationship.upsert({
      where: { aId_bId: { aId, bId } },
      update: { status: 'friend' },
      create: { aId, bId, status: 'friend' },
    })

    return res.status(201).json({ status: 'ok' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
