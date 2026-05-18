const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.canvases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `)
    console.log("Created canvases table.")
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.phases ADD COLUMN IF NOT EXISTS canvas_id UUID REFERENCES public.canvases(id) ON DELETE CASCADE;
    `)
    console.log("Added canvas_id to phases.")
    
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
