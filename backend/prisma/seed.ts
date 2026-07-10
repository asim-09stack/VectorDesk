import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Database seed script.
 *
 * Creates a default admin and a demo user so the app is immediately usable
 * after `npm run seed`. Uses `upsert` so the script is idempotent and safe to
 * run repeatedly.
 *
 * Default credentials (change in production!):
 *   admin@vectordesk.local / Admin@123
 *   user@vectordesk.local  / User@123
 */
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const userPassword = await bcrypt.hash('User@123', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vectordesk.local' },
    update: {},
    create: {
      name: 'VectorDesk Admin',
      email: 'admin@vectordesk.local',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@vectordesk.local' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@vectordesk.local',
      password: userPassword,
      role: Role.USER,
    },
  });

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete:');
  // eslint-disable-next-line no-console
  console.log(`   ADMIN → ${admin.email} / Admin@123`);
  // eslint-disable-next-line no-console
  console.log(`   USER  → ${user.email} / User@123`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
