const { PrismaClient } = require('../node_modules/@prisma/client')
const db = new PrismaClient()

async function run() {
  const ancestries = await db.ancestry.findMany()
  const attributes = await db.attribute.findMany()
  console.log('ancestries', ancestries)
  console.log('attributes', attributes)
}

run().finally(() => db.$disconnect())
