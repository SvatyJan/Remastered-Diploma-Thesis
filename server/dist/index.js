import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
const app = express();
app.use(cors());
app.use(express.json());
// --- Auth helpers ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function authRequired(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token)
        return res.status(401).json({ error: 'Missing token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.uid;
        return next();
    }
    catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
function toUserDto(user) {
    return {
        id: Number(user.id),
        email: user.email,
        username: user.username,
    };
}
function toAncestryDto(ancestry) {
    return {
        id: Number(ancestry.id),
        name: ancestry.name,
        description: ancestry.description,
    };
}
function toAttributeDto(record) {
    return {
        name: record.attribute.name,
        value: record.value,
    };
}
function toInventoryDto(item) {
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
    };
}
function toShopPlayerItem(item) {
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
    };
}
function toVendorItem(template) {
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
    };
}
class ShopError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
function toPlayerDto(record) {
    return {
        id: Number(record.id),
        name: record.name,
        level: record.level,
        ancestry: record.ancestry?.name ?? null,
        guild: record.guildMember?.guild.name ?? null,
    };
}
function toCharacterDto(character) {
    return {
        id: Number(character.id),
        name: character.name,
        level: character.level,
        ancestryId: Number(character.ancestryId),
    };
}
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password, passwordAgain } = req.body ?? {};
        if (!email || !username || !password || !passwordAgain)
            return res.status(400).json({ error: 'Missing fields' });
        if (password !== passwordAgain)
            return res.status(400).json({ error: 'Passwords do not match' });
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
            select: { id: true },
        });
        if (existing)
            return res.status(409).json({ error: 'User already exists' });
        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, username, password: hash },
            select: { id: true, email: true, username: true },
        });
        const token = jwt.sign({ uid: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ user: toUserDto(user), token });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body ?? {};
        if (!identifier || !password)
            return res.status(400).json({ error: 'Missing credentials' });
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { username: identifier }] },
            select: { id: true, email: true, username: true, password: true },
        });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ uid: Number(user.id) }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ user: toUserDto(user), token });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.get('/api/ancestries', authRequired, async (_req, res) => {
    try {
        const items = await prisma.ancestry.findMany({
            select: { id: true, name: true, description: true },
            orderBy: { name: 'asc' },
        });
        return res.json({ items: items.map(toAncestryDto) });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
// List characters for authed user
app.get('/api/characters', authRequired, async (req, res) => {
    const userId = req.userId;
    const items = await prisma.character.findMany({
        where: { userId: BigInt(userId) },
        select: { id: true, name: true, level: true, ancestryId: true },
        orderBy: { dateCreated: 'desc' },
    });
    return res.json({ items: items.map(toCharacterDto) });
});
async function loadShopState(characterId) {
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
    });
    const vendorTemplates = (await prisma.itemTemplate.findMany({
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
    }));
    const coinEntry = inventory.find((record) => record.template.slug === 'gold-coin');
    const coins = Number(coinEntry?.amount ?? 0);
    const playerItems = inventory
        .filter((record) => record.template.slug !== 'gold-coin' && !record.equipped)
        .map(toShopPlayerItem);
    const vendorItems = vendorTemplates.filter((template) => template.inShop).map(toVendorItem);
    return {
        coins,
        playerItems,
        vendorItems,
    };
}
app.get('/api/shop/:id', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        if (!Number.isInteger(characterId) || characterId <= 0)
            return res.status(400).json({ error: 'Invalid character id' });
        const character = await prisma.character.findFirst({
            where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
            select: { id: true },
        });
        if (!character)
            return res.status(404).json({ error: 'Character not found' });
        const state = await loadShopState(character.id);
        return res.json(state);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/shop/:id/trade', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        if (!Number.isInteger(characterId) || characterId <= 0)
            return res.status(400).json({ error: 'Invalid character id' });
        const character = await prisma.character.findFirst({
            where: { id: BigInt(characterId), userId: BigInt(userId), isNpc: false },
            select: { id: true },
        });
        if (!character)
            return res.status(404).json({ error: 'Character not found' });
        const rawSell = Array.isArray(req.body?.sellItems) ? req.body.sellItems : [];
        const rawBuy = Array.isArray(req.body?.buyItems) ? req.body.buyItems : [];
        const sellMap = new Map();
        for (const raw of rawSell) {
            const inventoryId = Number(raw?.inventoryId);
            const amount = Number(raw?.amount ?? 1);
            if (!Number.isInteger(inventoryId) || inventoryId <= 0)
                return res.status(400).json({ error: 'Invalid inventory id' });
            if (!Number.isInteger(amount) || amount <= 0)
                return res.status(400).json({ error: 'Invalid amount for item to sell' });
            sellMap.set(inventoryId, (sellMap.get(inventoryId) ?? 0) + amount);
        }
        const buyMap = new Map();
        for (const raw of rawBuy) {
            const templateId = Number(raw?.templateId);
            const amount = Number(raw?.amount ?? 1);
            if (!Number.isInteger(templateId) || templateId <= 0)
                return res.status(400).json({ error: 'Invalid item template id' });
            if (!Number.isInteger(amount) || amount <= 0)
                return res.status(400).json({ error: 'Invalid amount for item to buy' });
            buyMap.set(templateId, (buyMap.get(templateId) ?? 0) + amount);
        }
        const sells = Array.from(sellMap.entries()).map(([inventoryId, amount]) => ({ inventoryId, amount }));
        const buys = Array.from(buyMap.entries()).map(([templateId, amount]) => ({ templateId, amount }));
        if (sells.length === 0 && buys.length === 0)
            return res.status(400).json({ error: 'No trade items provided' });
        try {
            await prisma.$transaction(async (tx) => {
                const charId = character.id;
                const coinTemplate = await tx.itemTemplate.findFirst({
                    where: { slug: 'gold-coin' },
                    select: { id: true },
                });
                if (!coinTemplate)
                    throw new ShopError(500, 'Missing gold coin template');
                const coinInventory = await tx.characterInventory.findFirst({
                    where: { ownerCharacterId: charId, templateId: coinTemplate.id },
                    select: { id: true, amount: true },
                });
                const currentCoins = Number(coinInventory?.amount ?? 0);
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
                    : [];
                const sellById = new Map();
                for (const record of sellRecords) {
                    sellById.set(Number(record.id), record);
                }
                let totalGain = 0;
                for (const sell of sells) {
                    const record = sellById.get(sell.inventoryId);
                    if (!record)
                        throw new ShopError(400, 'Item not found in inventory');
                    if (record.equipped)
                        throw new ShopError(400, 'Cannot trade equipped items');
                    if (record.template.slug === 'gold-coin')
                        throw new ShopError(400, 'Cannot trade gold coins directly');
                    if (sell.amount > record.amount)
                        throw new ShopError(400, 'Not enough items to sell');
                    totalGain += record.template.valueGold * sell.amount;
                }
                const buyTemplates = buys.length
                    ? (await tx.itemTemplate.findMany({
                        where: { id: { in: buys.map((item) => BigInt(item.templateId)) }, inShop: true },
                        select: { id: true, valueGold: true, slug: true, inShop: true },
                    }))
                    : [];
                const buyById = new Map();
                for (const template of buyTemplates) {
                    if (template.inShop)
                        buyById.set(Number(template.id), template);
                }
                for (const buy of buys) {
                    if (!buyById.has(buy.templateId))
                        throw new ShopError(400, 'Requested item is not available in shop');
                }
                let totalCost = 0;
                for (const buy of buys) {
                    const template = buyById.get(buy.templateId);
                    if (template.slug === 'gold-coin')
                        throw new ShopError(400, 'Cannot trade gold coins directly');
                    totalCost += template.valueGold * buy.amount;
                }
                const newCoinBalance = currentCoins + totalGain - totalCost;
                if (newCoinBalance < 0)
                    throw new ShopError(400, 'Not enough gold');
                for (const sell of sells) {
                    const record = sellById.get(sell.inventoryId);
                    const remaining = record.amount - sell.amount;
                    if (remaining < 0)
                        throw new ShopError(400, 'Not enough items to sell');
                    if (remaining === 0) {
                        await tx.characterInventory.delete({ where: { id: record.id } });
                    }
                    else {
                        await tx.characterInventory.update({
                            where: { id: record.id },
                            data: { amount: remaining },
                        });
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
                    : [];
                const existingByTemplate = new Map();
                for (const record of existingInventory) {
                    if (record.templateId === coinTemplate.id)
                        continue;
                    existingByTemplate.set(Number(record.templateId), { id: record.id, amount: record.amount });
                }
                for (const buy of buys) {
                    const existing = existingByTemplate.get(buy.templateId);
                    if (existing) {
                        const updatedAmount = existing.amount + buy.amount;
                        await tx.characterInventory.update({
                            where: { id: existing.id },
                            data: { amount: updatedAmount },
                        });
                        existingByTemplate.set(buy.templateId, { id: existing.id, amount: updatedAmount });
                    }
                    else {
                        const created = await tx.characterInventory.create({
                            data: {
                                ownerCharacterId: charId,
                                templateId: BigInt(buy.templateId),
                                amount: buy.amount,
                            },
                            select: { id: true, amount: true },
                        });
                        existingByTemplate.set(buy.templateId, { id: created.id, amount: created.amount });
                    }
                }
                if (newCoinBalance === 0) {
                    if (coinInventory) {
                        await tx.characterInventory.delete({ where: { id: coinInventory.id } });
                    }
                }
                else if (coinInventory) {
                    await tx.characterInventory.update({
                        where: { id: coinInventory.id },
                        data: { amount: newCoinBalance },
                    });
                }
                else {
                    await tx.characterInventory.create({
                        data: {
                            ownerCharacterId: charId,
                            templateId: coinTemplate.id,
                            amount: newCoinBalance,
                        },
                    });
                }
            });
        }
        catch (err) {
            if (err instanceof ShopError)
                return res.status(err.status).json({ error: err.message });
            throw err;
        }
        const state = await loadShopState(character.id);
        return res.json(state);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.get('/api/social/players', authRequired, async (req, res) => {
    try {
        const search = String(req.query.search ?? '').trim();
        const players = (await prisma.character.findMany({
            where: {
                isNpc: false,
                name: search ? { contains: search, mode: Prisma.QueryMode.insensitive } : undefined,
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
        }));
        return res.json({ items: players.map(toPlayerDto) });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.get('/api/characters/:id', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        if (!Number.isFinite(characterId))
            return res.status(400).json({ error: 'Invalid character id' });
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
        });
        if (!character || character.isNpc)
            return res.status(404).json({ error: 'Character not found' });
        const isSelf = character.userId !== null && character.userId === BigInt(userId);
        const inventorySource = isSelf
            ? character.inventories
            : character.inventories.filter((item) => item.equipped !== null);
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
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Create simple character (temporary minimal payload)
app.post('/api/characters', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const { name, ancestryId } = req.body ?? {};
        if (!name)
            return res.status(400).json({ error: 'Missing name' });
        const ancestryIdNumber = Number(ancestryId);
        if (!Number.isInteger(ancestryIdNumber) || ancestryIdNumber <= 0)
            return res.status(400).json({ error: 'Invalid ancestry' });
        const ancestry = await prisma.ancestry.findUnique({
            where: { id: BigInt(ancestryIdNumber) },
            select: { id: true },
        });
        if (!ancestry)
            return res.status(404).json({ error: 'Ancestry not found' });
        const baseAttributes = await prisma.attribute.findMany({
            select: { id: true },
            orderBy: { id: 'asc' },
        });
        if (baseAttributes.length === 0)
            return res.status(500).json({ error: 'No base attributes configured' });
        const created = await prisma.$transaction(async (tx) => {
            const character = await tx.character.create({
                data: {
                    userId: BigInt(userId),
                    ancestryId: ancestry.id,
                    name,
                },
                select: { id: true, name: true, level: true, ancestryId: true },
            });
            await tx.characterAttribute.createMany({
                data: baseAttributes.map((attr) => ({
                    characterId: character.id,
                    attributeId: attr.id,
                    value: 1,
                })),
            });
            return character;
        });
        return res.status(201).json({ item: toCharacterDto(created) });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Delete character
app.delete('/api/characters/:id', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        if (!Number.isFinite(characterId))
            return res.status(400).json({ error: 'Invalid character id' });
        const expectedUserId = BigInt(userId);
        const existing = await prisma.character.findUnique({
            where: { id: BigInt(characterId) },
            select: { userId: true },
        });
        if (!existing || existing.userId === null || existing.userId !== expectedUserId)
            return res.status(404).json({ error: 'Character not found' });
        await prisma.character.delete({ where: { id: BigInt(characterId) } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/characters/:id/equipment', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        const { inventoryId, slotCode } = req.body ?? {};
        if (!Number.isInteger(characterId) || characterId <= 0)
            return res.status(400).json({ error: 'Invalid character id' });
        if (!Number.isInteger(inventoryId) || inventoryId <= 0)
            return res.status(400).json({ error: 'Invalid inventory id' });
        if (!slotCode || typeof slotCode !== 'string')
            return res.status(400).json({ error: 'Invalid slot code' });
        const character = await prisma.character.findFirst({
            where: { id: BigInt(characterId), userId: BigInt(userId) },
            select: { id: true },
        });
        if (!character)
            return res.status(404).json({ error: 'Character not found' });
        const inventory = await prisma.characterInventory.findFirst({
            where: { id: BigInt(inventoryId), ownerCharacterId: character.id },
            select: {
                id: true,
                template: { select: { slotCode: true } },
            },
        });
        if (!inventory)
            return res.status(404).json({ error: 'Item not found' });
        if (!inventory.template.slotCode)
            return res.status(400).json({ error: 'Item is not equipable' });
        if (inventory.template.slotCode !== slotCode)
            return res.status(400).json({ error: 'Item cannot be equipped in this slot' });
        await prisma.$transaction(async (tx) => {
            await tx.characterEquipment.deleteMany({
                where: {
                    characterId: character.id,
                    OR: [
                        { slotCode },
                        { characterInventoryId: inventory.id },
                    ],
                },
            });
            await tx.characterEquipment.create({
                data: {
                    characterId: character.id,
                    slotCode,
                    characterInventoryId: inventory.id,
                },
            });
        });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.delete('/api/characters/:id/equipment/:slotCode', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const characterId = Number(req.params.id);
        const slotCode = req.params.slotCode;
        if (!Number.isInteger(characterId) || characterId <= 0)
            return res.status(400).json({ error: 'Invalid character id' });
        if (!slotCode)
            return res.status(400).json({ error: 'Invalid slot code' });
        const character = await prisma.character.findFirst({
            where: { id: BigInt(characterId), userId: BigInt(userId) },
            select: { id: true },
        });
        if (!character)
            return res.status(404).json({ error: 'Character not found' });
        await prisma.characterEquipment.deleteMany({
            where: { characterId: character.id, slotCode },
        });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/relationships', authRequired, async (req, res) => {
    try {
        const userId = req.userId;
        const { sourceCharacterId, targetCharacterId } = req.body ?? {};
        if (!Number.isInteger(sourceCharacterId) || sourceCharacterId <= 0)
            return res.status(400).json({ error: 'Invalid source character id' });
        if (!Number.isInteger(targetCharacterId) || targetCharacterId <= 0)
            return res.status(400).json({ error: 'Invalid target character id' });
        if (sourceCharacterId === targetCharacterId)
            return res.status(400).json({ error: 'Cannot add yourself as a friend' });
        const source = await prisma.character.findFirst({
            where: { id: BigInt(sourceCharacterId), userId: BigInt(userId), isNpc: false },
            select: { id: true },
        });
        if (!source)
            return res.status(404).json({ error: 'Source character not found' });
        const target = await prisma.character.findFirst({
            where: { id: BigInt(targetCharacterId), isNpc: false },
            select: { id: true },
        });
        if (!target)
            return res.status(404).json({ error: 'Target character not found' });
        const aId = source.id < target.id ? source.id : target.id;
        const bId = source.id < target.id ? target.id : source.id;
        await prisma.relationship.upsert({
            where: { aId_bId: { aId, bId } },
            update: { status: 'friend' },
            create: { aId, bId, status: 'friend' },
        });
        return res.status(201).json({ status: 'ok' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
