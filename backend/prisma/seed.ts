import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@cat-consulting.com';
  const password = 'Admin@CAT2024!';
  const name = 'Super Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️  Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Super admin created:`);
  console.log(`   ID   : ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role : ${admin.role}`);
  console.log(`   Pass : ${password}   ← change this after first login!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
