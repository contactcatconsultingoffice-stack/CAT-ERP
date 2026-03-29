import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- Database Health Check ---');
  try {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.project.count(),
      prisma.collaborator.count(),
      prisma.partner.count(),
      prisma.mission.count(),
      prisma.financialRecord.count(),
      prisma.contract.count(),
      prisma.prospect.count(),
      prisma.auditLog.count(),
    ]);

    const labels = [
      'Users', 'Clients', 'Projects', 'Collaborators', 'Partners',
      'Missions', 'Financial Records', 'Contracts', 'Prospects', 'Audit Logs'
    ];

    counts.forEach((count, i) => {
      console.log(`${labels[i]}: ${count}`);
    });

    console.log('\n--- Integrity Checks ---');
    
    // Check for projects with missing clients (should be 0 since it's required in schema but good to verify)
    const projects = await prisma.project.findMany({ include: { client: true } });
    const orphanedProjects = projects.filter(p => !p.client);
    console.log(`Orphaned Projects: ${orphanedProjects.length}`);

    // Check for collaborators without users
    const collaborators = await prisma.collaborator.findMany({ include: { user: true } });
    const orphanedCollabs = collaborators.filter(c => !c.user);
    console.log(`Orphaned Collaborators: ${orphanedCollabs.length}`);

    // Check for financial records without projects
    const financial = await prisma.financialRecord.findMany({ include: { project: true } });
    const orphanedFinancial = financial.filter(f => !f.project);
    console.log(`Orphaned Financial Records: ${orphanedFinancial.length}`);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
