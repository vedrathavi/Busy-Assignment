import { prisma } from '../database/prisma';

async function migrateTaskAssignees() {
  console.log('--- Starting TaskAssignee Data Migration ---');

  // Count existing tasks
  const allTasks = await prisma.task.findMany({
    select: {
      id: true,
      assignedToId: true,
      completedAt: true,
      createdAt: true,
      assignees: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  console.log(`Found ${allTasks.length} total tasks in database.`);

  let createdCount = 0;
  let alreadyPresentCount = 0;

  for (const task of allTasks) {
    if (!task.assignedToId) continue;

    const existingAssignee = task.assignees.find((a) => a.userId === task.assignedToId);
    if (existingAssignee) {
      alreadyPresentCount++;
      continue;
    }

    await prisma.taskAssignee.create({
      data: {
        taskId: task.id,
        userId: task.assignedToId,
        assignedAt: task.createdAt,
        completedAt: task.completedAt,
        completionNote: task.completedAt ? 'Completed' : null,
      },
    });
    createdCount++;
  }

  console.log(`Migration complete: ${createdCount} TaskAssignee records created, ${alreadyPresentCount} already present.`);
}

migrateTaskAssignees()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
