import { PrismaClient, DealStage } from '@prisma/client';

const prisma = new PrismaClient();

async function validateDemoData() {
  console.log('📊 Starting Demo Dataset Validation & Statistics Report...\n');

  // 1. Team & Users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
  const managers = users.filter((u) => u.role === 'MANAGER');
  const reps = users.filter((u) => u.role === 'SALES_REP');

  console.log('=== 1. TEAM & USERS ===');
  console.log(`Total Users: ${users.length}`);
  console.log(`Managers (${managers.length}): ${managers.map((m) => m.name).join(', ')}`);
  console.log(`Sales Reps (${reps.length}): ${reps.map((r) => `${r.name} (${r.email})`).join(', ')}\n`);

  // 2. Companies
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, industry: true, isArchived: true },
  });
  const activeCompanies = companies.filter((c) => !c.isArchived);
  const archivedCompanies = companies.filter((c) => c.isArchived);

  console.log('=== 2. COMPANIES ===');
  console.log(`Total Companies: ${companies.length} (${activeCompanies.length} active, ${archivedCompanies.length} archived)\n`);

  // 3. Deals
  const deals = await prisma.deal.findMany({
    where: { deletedAt: null },
    include: {
      owner: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  const dealsByRep: Record<string, number> = {};
  const dealsByStage: Record<string, number> = {
    [DealStage.NEW]: 0,
    [DealStage.QUALIFIED]: 0,
    [DealStage.PROPOSAL]: 0,
    [DealStage.NEGOTIATION]: 0,
    [DealStage.WON]: 0,
    [DealStage.LOST]: 0,
  };

  let openPipelineTotal = 0;
  let wonTotal = 0;
  let lostTotal = 0;
  let overdueOpenDeals = 0;
  const today = new Date('2026-09-14T00:00:00.000Z');

  for (const d of deals) {
    const ownerName = d.owner.name;
    dealsByRep[ownerName] = (dealsByRep[ownerName] || 0) + 1;
    dealsByStage[d.stage] = (dealsByStage[d.stage] || 0) + 1;

    const val = Number(d.value);
    if (d.stage === DealStage.WON) {
      wonTotal += val;
    } else if (d.stage === DealStage.LOST) {
      lostTotal += val;
    } else {
      openPipelineTotal += val;
      if (new Date(d.expectedCloseDate) < today) {
        overdueOpenDeals++;
      }
    }
  }

  console.log('=== 3. DEALS & PIPELINE ===');
  console.log(`Total Active Deals: ${deals.length}`);
  console.log('Deals by Rep:', JSON.stringify(dealsByRep, null, 2));
  console.log('Deals by Stage:', JSON.stringify(dealsByStage, null, 2));
  console.log(`Total Open Pipeline Value: ₹${openPipelineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Total Won Value: ₹${wonTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Total Lost Value: ₹${lostTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Overdue Open Deals: ${overdueOpenDeals}\n`);

  // 4. Tasks
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    include: {
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
      assignees: { include: { user: { select: { name: true } } } },
    },
  });

  let completedTasks = 0;
  let openTasks = 0;
  let dueTodayTasks = 0;
  let overdueTasks = 0;
  const tasksByAssignee: Record<string, number> = {};

  const todayStr = '2026-09-14';

  for (const t of tasks) {
    const isCompleted = !!t.completedAt;
    if (isCompleted) completedTasks++;
    else openTasks++;

    const dueStr = t.dueDate.toISOString().split('T')[0];
    if (!isCompleted) {
      if (dueStr === todayStr) dueTodayTasks++;
      else if (t.dueDate < today) overdueTasks++;
    }

    for (const a of t.assignees) {
      const uName = a.user.name;
      tasksByAssignee[uName] = (tasksByAssignee[uName] || 0) + 1;
    }
  }

  console.log('=== 4. TASKS ===');
  console.log(`Total Tasks: ${tasks.length}`);
  console.log(`Completed Tasks: ${completedTasks} (${Math.round((completedTasks / tasks.length) * 100)}%)`);
  console.log(`Open Tasks: ${openTasks} (${Math.round((openTasks / tasks.length) * 100)}%)`);
  console.log(`  - Due Today: ${dueTodayTasks}`);
  console.log(`  - Overdue: ${overdueTasks}`);
  console.log('Tasks by Assignee:', JSON.stringify(tasksByAssignee, null, 2), '\n');

  // 5. Notifications
  const notifications = await prisma.notification.findMany({
    include: { user: { select: { name: true } } },
  });

  const notifsByUser: Record<string, { total: number; read: number; unread: number }> = {};
  let totalRead = 0;
  let totalUnread = 0;

  for (const n of notifications) {
    const uName = n.user.name;
    if (!notifsByUser[uName]) {
      notifsByUser[uName] = { total: 0, read: 0, unread: 0 };
    }
    notifsByUser[uName].total++;
    if (n.readAt) {
      notifsByUser[uName].read++;
      totalRead++;
    } else {
      notifsByUser[uName].unread++;
      totalUnread++;
    }
  }

  console.log('=== 5. NOTIFICATIONS ===');
  console.log(`Total Notifications: ${notifications.length}`);
  console.log(`Read: ${totalRead} (${Math.round((totalRead / notifications.length) * 100)}%)`);
  console.log(`Unread: ${totalUnread} (${Math.round((totalUnread / notifications.length) * 100)}%)`);
  console.log('Notifications by User:', JSON.stringify(notifsByUser, null, 2), '\n');

  // 6. Alerts
  const alerts = await prisma.dealAlert.findMany();
  const activeAlerts = alerts.filter((a) => !a.dismissedAt);
  const dismissedAlerts = alerts.filter((a) => !!a.dismissedAt);

  console.log('=== 6. DEAL ALERTS ===');
  console.log(`Total Deal Alerts: ${alerts.length}`);
  console.log(`Active Alerts: ${activeAlerts.length}`);
  console.log(`Dismissed Alerts: ${dismissedAlerts.length}\n`);

  // 7. Collaborators
  const collabs = await prisma.dealCollaborator.findMany();
  console.log('=== 7. COLLABORATIONS ===');
  console.log(`Total Collaborator Links: ${collabs.length}\n`);
}

validateDemoData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
