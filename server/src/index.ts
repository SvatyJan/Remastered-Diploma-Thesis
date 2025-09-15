import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
    return res.status(201).json({ user, token })
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
    return res.json({ user: { id: user.id, email: user.email, username: user.username }, token })
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
  return res.json({ items })
})

// Create simple character (temporary minimal payload)
app.post('/api/characters', authRequired, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { name, ancestryId } = req.body ?? {}
    if (!name) return res.status(400).json({ error: 'Missing name' })
    const created = await prisma.character.create({
      data: {
        userId: BigInt(userId),
        ancestryId: BigInt(ancestryId ?? 1),
        name,
      },
      select: { id: true, name: true, level: true, ancestryId: true },
    })
    return res.status(201).json({ item: created })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
