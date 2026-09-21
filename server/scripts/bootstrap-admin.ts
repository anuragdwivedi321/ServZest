import { PrismaClient } from '@prisma/client';

const phone = process.env.ADMIN_PHONE;
if (!phone || !/^[6-9]\d{9}$/.test(phone)) throw new Error('Set ADMIN_PHONE to a valid 10-digit Indian mobile number.');
const name = process.env.ADMIN_NAME?.trim() || 'ServZest Administrator';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { phone },
    update: { name, role: 'ADMIN', deletedAt: null },
    create: { phone, name, role: 'ADMIN' },
    select: { id: true, phone: true, name: true, role: true },
  });
  console.log(`Administrator ready: ${user.id} (${user.phone})`);
}

main().finally(() => prisma.$disconnect());
