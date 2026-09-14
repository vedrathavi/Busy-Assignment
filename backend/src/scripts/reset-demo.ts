import { PrismaClient } from '@prisma/client';
import { DEMO_USERS, DEMO_COMPANIES } from './seed-demo';

const prisma = new PrismaClient();

export async function resetDemoDataset() {
  console.log('🧹 Starting Demo Dataset Reset (Restoring to baseline)...');

  const demoUserIds = Object.values(DEMO_USERS);
  const demoCompanyIds = Object.values(DEMO_COMPANIES);

  // Find all demo deals belonging to demo companies or demo users
  const demoDeals = await prisma.deal.findMany({
    where: {
      OR: [
        { companyId: { in: demoCompanyIds } },
        { ownerId: { in: demoUserIds } },
      ],
    },
    select: { id: true },
  });
  const demoDealIds = demoDeals.map((d) => d.id);

  // Find all demo tasks
  const demoTasks = await prisma.task.findMany({
    where: {
      OR: [
        { dealId: { in: demoDealIds } },
        { createdById: { in: demoUserIds } },
        { assignedToId: { in: demoUserIds } },
      ],
    },
    select: { id: true },
  });
  const demoTaskIds = demoTasks.map((t) => t.id);

  // 1. Delete Demo Deal Alerts
  console.log('Deleting demo DealAlerts...');
  if (demoDealIds.length > 0) {
    await prisma.dealAlert.deleteMany({
      where: {
        dealId: { in: demoDealIds },
      },
    });
  }

  // 2. Delete Demo Notifications
  console.log('Deleting demo Notifications...');
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { userId: { in: demoUserIds } },
        ...(demoDealIds.length > 0 ? [{ dealId: { in: demoDealIds } }] : []),
      ],
    },
  });

  // 3. Delete Demo Task Assignees
  console.log('Deleting demo TaskAssignees...');
  await prisma.taskAssignee.deleteMany({
    where: {
      OR: [
        { userId: { in: demoUserIds } },
        ...(demoTaskIds.length > 0 ? [{ taskId: { in: demoTaskIds } }] : []),
      ],
    },
  });

  // 4. Delete Demo Tasks
  console.log('Deleting demo Tasks...');
  if (demoTaskIds.length > 0) {
    await prisma.task.deleteMany({
      where: {
        id: { in: demoTaskIds },
      },
    });
  }

  // 5. Delete Demo Deal History
  console.log('Deleting demo DealHistory...');
  await prisma.dealHistory.deleteMany({
    where: {
      OR: [
        { actorId: { in: demoUserIds } },
        ...(demoDealIds.length > 0 ? [{ dealId: { in: demoDealIds } }] : []),
      ],
    },
  });

  // 6. Delete Demo Deal Collaborators
  console.log('Deleting demo DealCollaborators...');
  await prisma.dealCollaborator.deleteMany({
    where: {
      OR: [
        { userId: { in: demoUserIds } },
        ...(demoDealIds.length > 0 ? [{ dealId: { in: demoDealIds } }] : []),
      ],
    },
  });

  // 7. Delete Demo Deals
  console.log('Deleting demo Deals...');
  if (demoDealIds.length > 0) {
    await prisma.deal.deleteMany({
      where: {
        id: { in: demoDealIds },
      },
    });
  }

  // 8. Delete Demo Companies
  console.log('Deleting demo Companies...');
  await prisma.company.deleteMany({
    where: {
      OR: [
        { id: { in: demoCompanyIds } },
        { ownerId: { in: demoUserIds } },
      ],
    },
  });

  // 9. Delete Demo Users
  console.log('Deleting demo Users...');
  await prisma.user.deleteMany({
    where: {
      id: { in: demoUserIds },
    },
  });

  console.log('✅ Demo Dataset successfully reset! Deterministic baseline preserved.');
}

async function run() {
  try {
    await resetDemoDataset();
  } catch (error) {
    console.error('❌ Demo reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}
