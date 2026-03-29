import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'contact.catconsultingoffice@gmail.com';
  const password = 'Admin@CAT2024!'; // Vous pourrez changer ce mot de passe
  const name = 'Super Administrateur';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️  Super admin already exists: ${email}`);
    // Optional: make sure it's isSuperAdmin
    await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true, role: 'ADMIN' }
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      isSuperAdmin: true,
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
