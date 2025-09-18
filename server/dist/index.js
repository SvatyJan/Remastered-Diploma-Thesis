import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
