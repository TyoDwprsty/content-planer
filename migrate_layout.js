const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.phases ADD COLUMN IF NOT EXISTS layout_mode TEXT DEFAULT 'grid-2';
    `)
    console.log("Added layout_mode to phases.")
    
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
