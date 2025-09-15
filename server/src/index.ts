import express, { Request, Response } from 'express'
import cors from 'cors'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const app = express()
app.use(cors())
app.use(express.json())

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
    return res.status(201).json({ user })
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

    return res.json({ user: { id: user.id, email: user.email, username: user.username } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/characters', async (_req: Request, res: Response) => {
  // Placeholder endpoint until characters flow is implemented
  return res.json({ items: [] })
})

const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
