import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'

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

function toSpellDto(spell: { id: bigint | number; name: string; slug: string; description: string | null; cooldown: number; slotCode: string }) {
  return {
    id: Number(spell.id),
    name: spell.name,
    slug: spell.slug,
    description: spell.description,
    cooldown: spell.cooldown,
    slotCode: spell.slotCode,
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

type ActionTypeKey = 'spell1' | 'attack' | 'move' | 'defend' | 'wait'

type ActionDefinition = {
  key: ActionTypeKey
  label: string
  description: string
  range?: number
  manaCost?: number
  cooldown?: number
}

const COMBAT_BOARD_WIDTH = 8
const COMBAT_BOARD_HEIGHT = 8
const SPELL1_MANA_COST = 5
const SPELL1_RANGE = 3
const SPELL1_COOLDOWN = 2

type StatBlock = {
  str: number
  agi: number
  int: number
  spd: number
  hpMax: number
  manaMax: number
}

type CombatantTemplate = {
  id: 'player' | 'enemy'
  name: string
  team: number
  isAi: boolean
  level: number
  statBlock: StatBlock
  position: { x: number; y: number }
}

type RuntimeCombatant = CombatantTemplate & {
  hp: number
  mana: number
  cooldowns: { spell1: number }
  defending: boolean
}

type SimulationRoundLog = { round: number; log: string[] }

type CombatSimulationResult = {
  winner: 'player' | 'enemy'
  totalRounds: number
  rounds: SimulationRoundLog[]
  player: { hp: number; mana: number; position: { x: number; y: number } }
  enemy: { hp: number; mana: number; position: { x: number; y: number } }
}

const ACTION_LIBRARY: Record<ActionTypeKey, ActionDefinition> = {
  spell1: {
    key: 'spell1',
    label: 'Spell 1',
    description: 'Range 3, deals 2x INT damage, costs 5 mana, cooldown 2 rounds.',
    range: SPELL1_RANGE,
    manaCost: SPELL1_MANA_COST,
    cooldown: SPELL1_COOLDOWN,
  },
  attack: {
    key: 'attack',
    label: 'Attack',
    description: 'Melee strike dealing ceil(1.5x STR) +/- rng(0..2).',
    range: 1,
  },
  move: {
    key: 'move',
    label: 'Move',
    description: 'Advance 1 tile towards the opponent.',
  },
  defend: {
    key: 'defend',
    label: 'Defend',
    description: 'Reduce incoming damage by 50% until the end of the round.',
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

function manhattanDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function clampToBoard(pos: { x: number; y: number }) {
  return {
    x: Math.max(0, Math.min(COMBAT_BOARD_WIDTH - 1, pos.x)),
    y: Math.max(0, Math.min(COMBAT_BOARD_HEIGHT - 1, pos.y)),
  }
}

function stepTowards(from: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - from.x
  const dy = target.y - from.y
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return clampToBoard({ x: from.x + Math.sign(dx), y: from.y })
  }
  if (dy !== 0) {
    return clampToBoard({ x: from.x, y: from.y + Math.sign(dy) })
  }
  return { ...from }
}

function clonePosition(pos: { x: number; y: number }) {
  return { x: pos.x, y: pos.y }
}

function planAction(actor: RuntimeCombatant, opponent: RuntimeCombatant): ActionTypeKey {
  const dist = manhattanDistance(actor.position, opponent.position)
  const lowHp = actor.hp <= Math.ceil(actor.statBlock.hpMax * 0.25)
  const canSpell =
    actor.mana >= SPELL1_MANA_COST && actor.cooldowns.spell1 === 0 && dist <= SPELL1_RANGE
  if (lowHp && dist <= 1) return 'defend'
  if (canSpell) return 'spell1'
  if (dist <= 1) return 'attack'
  if (dist > 1) return 'move'
  return 'wait'
}

function actionPriority(action: ActionTypeKey) {
  switch (action) {
    case 'spell1':
      return 5
    case 'attack':
      return 4
    case 'move':
      return 3
    case 'defend':
      return 2
    default:
      return 1
  }
}

function resolveActions(
  entries: Array<{ actor: RuntimeCombatant; target: RuntimeCombatant; action: ActionTypeKey }>,
) {
  const log: string[] = []
  for (const { actor, target, action } of entries) {
    switch (action) {
      case 'spell1': {
        const dist = manhattanDistance(actor.position, target.position)
        if (actor.mana < SPELL1_MANA_COST || actor.cooldowns.spell1 > 0 || dist > SPELL1_RANGE) {
          log.push(`${actor.name} tried to cast a spell but failed.`)
          break
        }
        const rawDamage = actor.statBlock.int * 2
        const applied = target.defending ? Math.ceil(rawDamage * 0.5) : rawDamage
        target.hp = Math.max(0, target.hp - applied)
        actor.mana = Math.max(0, actor.mana - SPELL1_MANA_COST)
        actor.cooldowns.spell1 = SPELL1_COOLDOWN
        log.push(
          `${actor.name} cast Spell 1 on ${target.name} for ${applied} damage (HP ${target.hp}).`,
        )
        break
      }
      case 'attack': {
        const dist = manhattanDistance(actor.position, target.position)
        if (dist > 1) {
          log.push(`${actor.name} tried to attack but the target is out of range.`)
          break
        }
        const base = Math.ceil(actor.statBlock.str * 1.5)
        const variance = randomInt(-2, 2)
        const rawDamage = Math.max(1, base + variance)
        const applied = target.defending ? Math.ceil(rawDamage * 0.5) : rawDamage
        target.hp = Math.max(0, target.hp - applied)
        log.push(`${actor.name} attacked ${target.name} for ${applied} damage (HP ${target.hp}).`)
        break
      }
      case 'move': {
        const next = stepTowards(actor.position, target.position)
        if (next.x === actor.position.x && next.y === actor.position.y) {
          log.push(`${actor.name} stayed put.`)
          break
        }
        actor.position = next
        log.push(`${actor.name} moved to (${next.x + 1}, ${next.y + 1}).`)
        break
      }
      case 'defend': {
        actor.defending = true
        log.push(`${actor.name} is defending.`)
        break
      }
      default: {
        log.push(`${actor.name} waited.`)
      }
    }
  }
  return log
}

function simulateCombat(
  playerTemplate: CombatantTemplate,
  enemyTemplate: CombatantTemplate,
): CombatSimulationResult {
  const player: RuntimeCombatant = {
    ...playerTemplate,
    position: { ...playerTemplate.position },
    hp: playerTemplate.statBlock.hpMax,
    mana: playerTemplate.statBlock.manaMax,
    cooldowns: { spell1: 0 },
    defending: false,
  }
  const enemy: RuntimeCombatant = {
    ...enemyTemplate,
    position: { ...enemyTemplate.position },
    hp: enemyTemplate.statBlock.hpMax,
    mana: enemyTemplate.statBlock.manaMax,
    cooldowns: { spell1: 0 },
    defending: false,
  }

  const rounds: SimulationRoundLog[] = []
  const maxRounds = 15
  for (let round = 1; round <= maxRounds; round++) {
    if (player.hp <= 0 || enemy.hp <= 0) break

    const planned = [
      { actor: player, target: enemy, action: planAction(player, enemy) },
      { actor: enemy, target: player, action: planAction(enemy, player) },
    ]
    planned.sort((a, b) => {
      const priorityDiff = actionPriority(b.action) - actionPriority(a.action)
      if (priorityDiff !== 0) return priorityDiff
      const speedDiff = b.actor.statBlock.spd - a.actor.statBlock.spd
      if (speedDiff !== 0) return speedDiff
      return a.actor.id === 'player' ? -1 : 1
    })

    const roundLog = resolveActions(planned)
    rounds.push({ round, log: roundLog })

    player.cooldowns.spell1 = Math.max(0, player.cooldowns.spell1 - 1)
    enemy.cooldowns.spell1 = Math.max(0, enemy.cooldowns.spell1 - 1)
    player.defending = false
    enemy.defending = false

    if (player.hp <= 0 || enemy.hp <= 0) break
  }

  let winner: 'player' | 'enemy'
  if (enemy.hp <= 0 && player.hp > 0) winner = 'player'
  else if (player.hp <= 0 && enemy.hp > 0) winner = 'enemy'
  else winner = player.hp >= enemy.hp ? 'player' : 'enemy'

  return {
    winner,
    totalRounds: rounds.length,
    rounds,
    player: { hp: player.hp, mana: player.mana, position: player.position },
    enemy: { hp: enemy.hp, mana: enemy.mana, position: enemy.position },
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
    const playerTemplate: CombatantTemplate = {
      id: 'player',
      name: character.name,
      team: 1,
      isAi: false,
      level: character.level,
      statBlock: playerStats,
      position: { x: 1, y: Math.floor(COMBAT_BOARD_HEIGHT / 2) },
    }

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
    const enemyTemplate: CombatantTemplate = {
      id: 'enemy',
      name: enemyName,
      team: 2,
      isAi: true,
      level: enemyLevel,
      statBlock: enemyStats,
      position: { x: COMBAT_BOARD_WIDTH - 2, y: Math.floor(COMBAT_BOARD_HEIGHT / 2) },
    }

    const playerInitial = {
      hp: playerStats.hpMax,
      mana: playerStats.manaMax,
      position: clonePosition(playerTemplate.position),
    }
    const enemyInitial = {
      hp: enemyStats.hpMax,
      mana: enemyStats.manaMax,
      position: clonePosition(enemyTemplate.position),
    }

    const simulation = simulateCombat(
      { ...playerTemplate, position: clonePosition(playerTemplate.position) },
      { ...enemyTemplate, position: clonePosition(enemyTemplate.position) },
    )

    const originMeta = {
      source: 'world-random',
      monsterId: monster ? Number(monster.id) : null,
      monsterName: enemyName,
      monsterRarity: monster?.rarity ?? 'common',
      monsterDescription: monster?.description ?? null,
      playerCharacterId: Number(character.id),
      playerCharacterName: character.name,
    }

    const now = new Date()
    const actionDefs = {
      attack: ACTION_LIBRARY.attack,
      spell1: ACTION_LIBRARY.spell1,
      move: ACTION_LIBRARY.move,
      defend: ACTION_LIBRARY.defend,
      wait: ACTION_LIBRARY.wait,
    }

    const { combatId } = await prisma.$transaction(async (tx) => {
      const combat = await tx.combat.create({
        data: {
          status: 'finished',
          boardWidth: COMBAT_BOARD_WIDTH,
          boardHeight: COMBAT_BOARD_HEIGHT,
          currentRound: Math.max(1, simulation.totalRounds || 1),
          currentTurnIndex: 0,
          originType: 'pve',
          originMeta,
          startedAt: now,
          endedAt: now,
        },
      })

      await tx.combatTeam.createMany({
        data: [
          { combatId: combat.id, team: 1 },
          { combatId: combat.id, team: 2 },
        ],
      })

      await tx.combatParticipant.create({
        data: {
          combatId: combat.id,
          team: 1,
          entityId: character.id,
          name: character.name,
          isAi: false,
          tileX: simulation.player.position.x,
          tileY: simulation.player.position.y,
          hpCurrent: Math.max(0, Math.round(simulation.player.hp)),
          initiative: playerStats.spd,
          snapshotJson: {
            kind: 'player',
            level: playerTemplate.level,
            stats: playerStats,
            actions: actionDefs,
            initial: playerInitial,
            current: {
              hp: Math.max(0, Math.round(simulation.player.hp)),
              mana: Math.max(0, Math.round(simulation.player.mana)),
              position: clonePosition(simulation.player.position),
            },
          },
        },
      })

      await tx.combatParticipant.create({
        data: {
          combatId: combat.id,
          team: 2,
          entityId: monster ? monster.id : BigInt(0),
          name: enemyName,
          isAi: true,
          tileX: simulation.enemy.position.x,
          tileY: simulation.enemy.position.y,
          hpCurrent: Math.max(0, Math.round(simulation.enemy.hp)),
          initiative: enemyStats.spd,
          snapshotJson: {
            kind: 'enemy',
            level: enemyTemplate.level,
            stats: enemyStats,
            actions: actionDefs,
            initial: enemyInitial,
            current: {
              hp: Math.max(0, Math.round(simulation.enemy.hp)),
              mana: Math.max(0, Math.round(simulation.enemy.mana)),
              position: clonePosition(simulation.enemy.position),
            },
            monster: monster
              ? {
                  id: Number(monster.id),
                  name: monster.name,
                  rarity: monster.rarity,
                  description: monster.description,
                }
              : null,
          },
        },
      })

      await tx.combatResult.create({
        data: {
          combatId: combat.id,
          winningTeam: simulation.winner === 'player' ? 1 : 2,
          summaryJson: {
            winner: simulation.winner,
            totalRounds: simulation.totalRounds,
            rounds: simulation.rounds,
            enemy: {
              name: enemyName,
              rarity: monster?.rarity ?? 'common',
            },
          },
        },
      })

      return { combatId: combat.id }
    })

    return res.status(201).json({
      combatId: Number(combatId),
      status: 'finished',
      winner: simulation.winner,
      monster: {
        id: monster ? Number(monster.id) : null,
        name: enemyName,
        rarity: monster?.rarity ?? 'common',
      },
    })
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

    const ownedCharacters = await prisma.character.findMany({
      where: { userId: BigInt(userId), isNpc: false },
      select: { id: true },
    })
    const ownedIds = ownedCharacters.map((item) => item.id)
    if (!ownedIds.length) return res.status(404).json({ error: 'No characters found' })

    const combat = await prisma.combat.findFirst({
      where: {
        id: BigInt(combatIdNumber),
        participants: { some: { entityId: { in: ownedIds }, isAi: false } },
      },
      include: {
        participants: true,
        result: true,
      },
    })
    if (!combat) return res.status(404).json({ error: 'Combat not found' })

    const participants = combat.participants
      .map((participant) => {
        const snapshot = (participant.snapshotJson ?? {}) as Record<string, any>
        const current = snapshot?.current ?? {}
        const initial = snapshot?.initial ?? null
        return {
          id: Number(participant.id),
          name: participant.name,
          team: participant.team,
          isAi: participant.isAi,
          position: { x: participant.tileX, y: participant.tileY },
          hp: participant.hpCurrent,
          stats: snapshot?.stats ?? null,
          current: {
            hp: typeof current?.hp === 'number' ? current.hp : participant.hpCurrent,
            mana: typeof current?.mana === 'number' ? current.mana : null,
            position:
              current?.position &&
              typeof current.position?.x === 'number' &&
              typeof current.position?.y === 'number'
                ? current.position
                : { x: participant.tileX, y: participant.tileY },
          },
          initial,
          actions: snapshot?.actions ?? null,
          meta: snapshot?.monster ?? null,
        }
      })
      .sort((a, b) => a.team - b.team || a.id - b.id)

    const playerTeam = participants.find((entry) => !entry.isAi)?.team ?? null

    return res.json({
      id: Number(combat.id),
      status: combat.status,
      board: { width: combat.boardWidth, height: combat.boardHeight },
      currentRound: combat.currentRound,
      currentTurnIndex: combat.currentTurnIndex,
      startedAt: combat.startedAt,
      endedAt: combat.endedAt,
      originMeta: (combat.originMeta ?? null) as Record<string, unknown> | null,
      participants,
      playerTeam,
      result: combat.result
        ? {
            winningTeam: combat.result.winningTeam,
            summary: combat.result.summaryJson ?? null,
          }
        : null,
    })
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
      },
    })

    if (!character || character.isNpc) return res.status(404).json({ error: 'Character not found' })

    const isSelf = character.userId !== null && character.userId === BigInt(userId)
    const inventorySource = isSelf
      ? character.inventories
      : character.inventories.filter((item) => item.equipped !== null)
    const spellbookState = await loadSpellState(character.id)

    return res.json({
      character: {
        id: Number(character.id),
        name: character.name,
        level: character.level,
        ancestry: character.ancestry ? toAncestryDto(character.ancestry) : null,
        isSelf,
      },
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





