const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }});
  if (!admin) {
    console.log("No admin found.");
    return;
  }
  
  console.log("Admin email:", admin.email);

  const token = jwt.sign({
    sub: admin.id,
    role: admin.role,
    isSuperAdmin: admin.isSuperAdmin,
    permissions: admin.permissions || []
  }, JWT_SECRET, { expiresIn: '8h' });

  console.log("Token:", token);

  const res = await fetch('http://localhost:4000/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

main().catch(console.error).finally(() => prisma.$disconnect());
