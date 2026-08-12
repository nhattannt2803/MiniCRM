import { PrismaClient } from '@prisma/client';
import { runSeedEngine } from '../src/services/seedEngine';

const prisma = new PrismaClient();

async function main() {
  const industryKey = process.argv[2] || process.env.INDUSTRY || 'xedien';
  console.log(`🚀 Executing Seed for Industry: "${industryKey}"`);

  await runSeedEngine(industryKey);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
