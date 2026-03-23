import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'contact.catconsultingoffice@gmail.com';
  console.log(`Promoting ${email} to Super Admin...`);
  
  const user = await prisma.user.update({
    where: { email },
    data: { 
      role: 'ADMIN',
      isSuperAdmin: true 
    }
  });

  console.log('User promoted successfully:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
