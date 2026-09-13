import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../database/prisma';

export interface BaselineSnapshot {
  timestamp: string;
  counts: {
    tasks: number;
    notifications: number;
    dealHistory: number;
    deals: number;
    companies: number;
    users: number;
    dealAlerts: number;
    dealCollaborators: number;
  };
  ids: {
    tasks: string[];
    notifications: string[];
    dealHistory: string[];
    deals: string[];
    companies: string[];
    users: string[];
    dealAlerts: string[];
    dealCollaborators: string[];
  };
}

const SNAPSHOT_FILE = path.join(__dirname, 'baseline-snapshot.json');

export async function captureBaseline(): Promise<BaselineSnapshot> {
  const [tasks, notifs, history, deals, companies, users, alerts, collabs] = await Promise.all([
    prisma.task.findMany({ select: { id: true } }),
    prisma.notification.findMany({ select: { id: true } }),
    prisma.dealHistory.findMany({ select: { id: true } }),
    prisma.deal.findMany({ select: { id: true } }),
    prisma.company.findMany({ select: { id: true } }),
    prisma.user.findMany({ select: { id: true } }),
    prisma.dealAlert.findMany({ select: { id: true } }),
    prisma.dealCollaborator.findMany({ select: { dealId: true, userId: true } }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    counts: {
      tasks: tasks.length,
      notifications: notifs.length,
      dealHistory: history.length,
      deals: deals.length,
      companies: companies.length,
      users: users.length,
      dealAlerts: alerts.length,
      dealCollaborators: collabs.length,
    },
    ids: {
      tasks: tasks.map((t) => t.id),
      notifications: notifs.map((n) => n.id),
      dealHistory: history.map((h) => h.id),
      deals: deals.map((d) => d.id),
      companies: companies.map((c) => c.id),
      users: users.map((u) => u.id),
      dealAlerts: alerts.map((a) => a.id),
      dealCollaborators: collabs.map((c) => `${c.dealId}:${c.userId}`),
    },
  };
}

export async function saveBaseline() {
  const baseline = await captureBaseline();
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(baseline, null, 2), 'utf-8');
  console.log('=== BASELINE SAVED TO', SNAPSHOT_FILE, '===');
  console.log(JSON.stringify(baseline.counts, null, 2));
}

export async function verifyBaselineIntegrity(): Promise<boolean> {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.error('No baseline file found at', SNAPSHOT_FILE);
    return false;
  }

  const baseline: BaselineSnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
  const current = await captureBaseline();

  console.log('=== BASELINE INTEGRITY AUDIT ===');
  let hasError = false;

  // Check that all baseline deals still exist
  const missingDeals = baseline.ids.deals.filter((id) => !current.ids.deals.includes(id));
  if (missingDeals.length > 0) {
    console.error('CRITICAL: Missing baseline deals:', missingDeals);
    hasError = true;
  }

  // Check companies
  const missingCompanies = baseline.ids.companies.filter((id) => !current.ids.companies.includes(id));
  if (missingCompanies.length > 0) {
    console.error('CRITICAL: Missing baseline companies:', missingCompanies);
    hasError = true;
  }

  // Check users
  const missingUsers = baseline.ids.users.filter((id) => !current.ids.users.includes(id));
  if (missingUsers.length > 0) {
    console.error('CRITICAL: Missing baseline users:', missingUsers);
    hasError = true;
  }

  // Check baseline tasks
  const missingTasks = baseline.ids.tasks.filter((id) => !current.ids.tasks.includes(id));
  if (missingTasks.length > 0) {
    console.error('CRITICAL: Missing baseline tasks:', missingTasks);
    hasError = true;
  }

  // Check baseline notifications
  const missingNotifs = baseline.ids.notifications.filter((id) => !current.ids.notifications.includes(id));
  if (missingNotifs.length > 0) {
    console.error('CRITICAL: Missing baseline notifications:', missingNotifs);
    hasError = true;
  }

  // Check baseline dealHistory
  const missingHistory = baseline.ids.dealHistory.filter((id) => !current.ids.dealHistory.includes(id));
  if (missingHistory.length > 0) {
    console.error('CRITICAL: Missing baseline deal history:', missingHistory);
    hasError = true;
  }

  if (hasError) {
    console.error('❌ BASELINE INTEGRITY FAILED: Pre-existing data was deleted or corrupted.');
    return false;
  } else {
    console.log('✅ BASELINE INTEGRITY VERIFIED: 100% of baseline records remain intact.');
    console.log('Current Counts:', JSON.stringify(current.counts, null, 2));
    return true;
  }
}

async function run() {
  const arg = process.argv[2];
  if (arg === '--verify') {
    const success = await verifyBaselineIntegrity();
    if (!success) process.exit(1);
  } else {
    await saveBaseline();
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
