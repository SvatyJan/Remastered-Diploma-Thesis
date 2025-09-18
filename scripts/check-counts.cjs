const { PrismaClient } = require('../node_modules/@prisma/client')
const db = new PrismaClient()

async function run() {
  const ancestryCount = await db.$queryRaw`SELECT COUNT(*) AS cnt FROM ancestry`
  const attributeCount = await db.$queryRaw`SELECT COUNT(*) AS cnt FROM attribute`
  console.log('ancestry count', ancestryCount)
  console.log('attribute count', attributeCount)
}

run().finally(() => db.$disconnect())
