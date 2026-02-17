import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: adminPass, role: UserRole.ADMIN, verified: true, trusted: true }
  });

  const humans = [
    { email: 'anna@demo.com', name: 'Anna', skills: ['delivery','photography'], city: 'Berlin' },
    { email: 'mike@demo.com', name: 'Mike', skills: ['shopping','translation'], city: 'Paris' },
    { email: 'sara@demo.com', name: 'Sara', skills: ['inspection','photography'], city: 'Berlin' }
  ];

  for (const h of humans) {
    const user = await prisma.user.upsert({
      where: { email: h.email },
      update: {},
      create: { email: h.email, passwordHash: await bcrypt.hash('worker123', 10), verified: true }
    });
    await prisma.humanProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name: h.name, skills: h.skills, city: h.city, country: 'EU', languages: ['en'], hourlyRate: 20, fixedRate: 40 }
    });
  }

  const raw = randomBytes(24).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  await prisma.agentClient.upsert({
    where: { apiKeyHash: hash },
    update: {},
    create: { name: 'Demo Agent', apiKeyHash: hash }
  });
  console.log('Seeded admin:', admin.email);
  console.log('Seeded agent API key:', raw);
}
main().finally(() => prisma.$disconnect());
