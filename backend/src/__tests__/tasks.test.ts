import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { NotificationType } from '@prisma/client';

describe('Multi-Assignee Deal Tasks with Creation-Time Immutable Assignment', { timeout: 60000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // Alex, NEW, Acme (No collaborators)
    d2:  '30000000-0000-4000-8000-000000000002', // Priya, QUALIFIED, Apex
    d3:  '30000000-0000-4000-8000-000000000003', // Marcus, PROPOSAL, Stellar (Collabs: Alex & Priya)
    d4:  '30000000-0000-4000-8000-000000000004', // Alex, NEGOTIATION, Zenith (Collab: Priya)
    d18: '30000000-0000-4000-8000-000000000018', // Priya, NEW, Apex (Soft-deleted)
  };

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

  const trackedTaskIds = new Set<string>();

  const trackTask = (id?: string) => {
    if (id) trackedTaskIds.add(id);
  };

  const cleanupTracked = async () => {
    const taskIds = Array.from(trackedTaskIds);
    if (taskIds.length > 0) {
      // Cascades to TaskAssignee automatically
      await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
      trackedTaskIds.clear();
    }
    // Clean up any test-generated task notifications/notes for test deals
    await prisma.notification.deleteMany({
      where: {
        dealId: { in: [DEALS.d1, DEALS.d3, DEALS.d4] },
        type: { in: [NotificationType.TASK_ASSIGNED, NotificationType.TASK_COMPLETED] },
      },
    });
    await prisma.dealHistory.deleteMany({
      where: {
        dealId: { in: [DEALS.d1, DEALS.d3, DEALS.d4] },
        note: { startsWith: 'Task completed' },
      },
    });
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });
    rep3Token    = signToken({ sub: USER_REP3_ID });

    // Ensure canonical baseline state for DEALS.d4 (Alex as owner, Priya as collaborator)
    await prisma.deal.update({
      where: { id: DEALS.d4 },
      data: { ownerId: USER_REP1_ID },
    });

    // Ensure canonical baseline collaborators for DEALS.d3 and DEALS.d4
    await prisma.dealCollaborator.upsert({
      where: { dealId_userId: { dealId: DEALS.d3, userId: USER_REP1_ID } },
      update: {},
      create: { dealId: DEALS.d3, userId: USER_REP1_ID },
    });
    await prisma.dealCollaborator.upsert({
      where: { dealId_userId: { dealId: DEALS.d3, userId: USER_REP2_ID } },
      update: {},
      create: { dealId: DEALS.d3, userId: USER_REP2_ID },
    });
    await prisma.dealCollaborator.upsert({
      where: { dealId_userId: { dealId: DEALS.d4, userId: USER_REP2_ID } },
      update: {},
      create: { dealId: DEALS.d4, userId: USER_REP2_ID },
    });
  });

  afterAll(async () => {
    await cleanupTracked();
  });

  // ==========================================================================
  // 1. Task Creation & Multi-Assignee Boundaries
  // ==========================================================================
  describe('1. Task Creation & Multi-Assignee Boundaries', () => {
    it('1. should create task with a single assignee using TaskAssignee', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Single assignee task',
          description: 'Review procurement requirements',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID],
          dueDate: '2026-09-25',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignees).toHaveLength(1);
      expect(res.body.data.assignees[0].userId).toBe(USER_REP1_ID);
      trackTask(res.body.data.id);
    });

    it('2. should create task with multiple assignees (Deal Owner + Collaborator)', async () => {
      // Deal 4: Alex (Owner), Priya (Collaborator)
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Joint proposal review',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID, USER_REP2_ID],
          dueDate: '2026-09-26',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignees).toHaveLength(2);
      const assigneeIds = res.body.data.assignees.map((a: any) => a.userId);
      expect(assigneeIds).toContain(USER_REP1_ID);
      expect(assigneeIds).toContain(USER_REP2_ID);
      trackTask(res.body.data.id);
    });

    it('3. should create task with multiple collaborators on Deal 3', async () => {
      // Deal 3: Marcus (Owner), Alex & Priya (Collaborators)
      const res = await request(app)
        .post(`/api/deals/${DEALS.d3}/tasks`)
        .set('Authorization', `Bearer ${rep3Token}`)
        .send({
          title: 'Collaborative technical deep-dive',
          priority: 'MEDIUM',
          assignedToIds: [USER_REP1_ID, USER_REP2_ID, USER_REP3_ID],
          dueDate: '2026-09-28',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignees).toHaveLength(3);
      trackTask(res.body.data.id);
    });

    it('4. should allow collaborator (Priya) to create a task and assign to another collaborator (Alex) on Deal 3', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d3}/tasks`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({
          title: 'Review infrastructure architecture',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID], // Alex
          dueDate: '2026-09-29',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdById).toBe(USER_REP2_ID);
      expect(res.body.data.assignees[0].userId).toBe(USER_REP1_ID);
      trackTask(res.body.data.id);
    });

    it('5. should allow collaborator (Priya) to create a task and assign to Deal Owner (Marcus) on Deal 3', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d3}/tasks`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({
          title: 'Approve special discount pricing',
          priority: 'HIGH',
          assignedToIds: [USER_REP3_ID], // Marcus (Deal Owner)
          dueDate: '2026-09-29',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdById).toBe(USER_REP2_ID);
      expect(res.body.data.assignees[0].userId).toBe(USER_REP3_ID);
      trackTask(res.body.data.id);
    });

    it('6. should allow creator to create task without assigning themselves', async () => {
      // Alex creates task on Deal 4 assigned only to Priya
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Priya solo task on Deal 4',
          priority: 'LOW',
          assignedToIds: [USER_REP2_ID],
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.createdById).toBe(USER_REP1_ID);
      expect(res.body.data.assignees).toHaveLength(1);
      expect(res.body.data.assignees[0].userId).toBe(USER_REP2_ID);
      trackTask(res.body.data.id);
    });

    it('7. should deduplicate duplicate assignees in creation payload', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Duplicate test task',
          priority: 'MEDIUM',
          assignedToIds: [USER_REP2_ID, USER_REP2_ID, USER_REP2_ID],
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assignees).toHaveLength(1);
      expect(res.body.data.assignees[0].userId).toBe(USER_REP2_ID);
      trackTask(res.body.data.id);
    });

    it('8. should reject assigning to unrelated CRM user outside deal with 403', async () => {
      // Marcus is NOT a collaborator on Deal 1
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Unrelated user task',
          assignedToIds: [USER_REP3_ID],
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not associated with this deal/i);
    });

    it('9. should reject Manager assigning a deal task to a Sales Rep not associated with the deal', async () => {
      // Manager cannot assign Deal 1 (Owner: Alex, no collaborators) to Marcus
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Manager invalid assignee assignment',
          assignedToIds: [USER_REP3_ID], // Marcus is not on Deal 1
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not associated with this deal/i);
    });

    it('10. should reject mixed valid and invalid assignees atomically without partial creation', async () => {
      // Deal 1: Alex is Owner (valid), Marcus is unrelated (invalid)
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Mixed assignee task',
          assignedToIds: [USER_REP1_ID, USER_REP3_ID],
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not associated with this deal/i);

      // Verify no task was created
      const dbTask = await prisma.task.findFirst({
        where: { title: 'Mixed assignee task' },
      });
      expect(dbTask).toBeNull();
    });

    it('11. should reject unauthorized user creating a task with 403', async () => {
      // Marcus is not on Deal 1
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${rep3Token}`)
        .send({
          title: 'Marcus unauthorized task',
          assignedToIds: [USER_REP3_ID],
          dueDate: '2026-09-30',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Strict Immutability of Assignees After Creation
  // ==========================================================================
  describe('2. Strict Immutability of Assignees After Creation', () => {
    let immutableTaskId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Original immutable task',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID, USER_REP2_ID],
          dueDate: '2026-10-01',
        });
      immutableTaskId = res.body.data.id;
      trackTask(immutableTaskId);
    });

    it('10. should allow updating title, description, priority, and dueDate', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${immutableTaskId}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Updated title for task',
          description: 'Added detailed notes',
          priority: 'MEDIUM',
          dueDate: '2026-10-15',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated title for task');
      expect(res.body.data.priority).toBe('MEDIUM');
      expect(res.body.data.dueDate.slice(0, 10)).toBe('2026-10-15');
    });

    it('11. should ignore or forbid modifying assignees via PATCH (assignees remain locked)', async () => {
      // Attempt to reassign to Marcus
      const res = await request(app)
        .patch(`/api/tasks/${immutableTaskId}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Attempted reassignment',
          assignedToId: USER_REP3_ID,
          assignedToIds: [USER_REP3_ID],
        });

      // The PATCH should either update only valid fields or succeed without modifying assignees
      expect(res.status).toBe(200);

      // Verify assignees in DB are completely unchanged
      const verifyRes = await request(app)
        .get(`/api/tasks/${immutableTaskId}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.assignees).toHaveLength(2);
      const assigneeIds = verifyRes.body.data.assignees.map((a: any) => a.userId);
      expect(assigneeIds).toContain(USER_REP1_ID);
      expect(assigneeIds).toContain(USER_REP2_ID);
      expect(assigneeIds).not.toContain(USER_REP3_ID);
    });

    it('12. should prevent Manager from altering assignees on existing task', async () => {
      await request(app)
        .patch(`/api/tasks/${immutableTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          assignedToId: USER_REP3_ID,
          assignedToIds: [USER_REP3_ID],
        });

      const verifyRes = await request(app)
        .get(`/api/tasks/${immutableTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(verifyRes.body.data.assignees).toHaveLength(2);
      expect(verifyRes.body.data.assignees.some((a: any) => a.userId === USER_REP3_ID)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Multi-Assignee Completion Lifecycle & Reopen Behavior
  // ==========================================================================
  describe('3. Multi-Assignee Completion Lifecycle & Reopen Behavior', () => {
    let multiTaskId: string;

    beforeEach(async () => {
      // Deal 3: Marcus Owner, Alex & Priya Collaborators
      const res = await request(app)
        .post(`/api/deals/${DEALS.d3}/tasks`)
        .set('Authorization', `Bearer ${rep3Token}`)
        .send({
          title: 'Triple-collaboration proposal sign-off',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID, USER_REP2_ID, USER_REP3_ID], // Alex, Priya, Marcus
          dueDate: '2026-10-10',
        });
      multiTaskId = res.body.data.id;
      trackTask(multiTaskId);
    });

    it('13. should keep task Open after first and second assignees complete, and mark Completed only when all complete', async () => {
      // 1. Alex completes his assignment with a note
      const alexCompleteRes = await request(app)
        .post(`/api/tasks/${multiTaskId}/complete`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ completionNote: 'Alex technical review completed.' });

      expect(alexCompleteRes.status).toBe(200);
      expect(alexCompleteRes.body.data.completedAt).toBeNull(); // Task remains open!
      const alexAssignee = alexCompleteRes.body.data.assignees.find((a: any) => a.userId === USER_REP1_ID);
      expect(alexAssignee.completedAt).not.toBeNull();
      expect(alexAssignee.completionNote).toBe('Alex technical review completed.');

      // 2. Priya completes her assignment with a note
      const priyaCompleteRes = await request(app)
        .post(`/api/tasks/${multiTaskId}/complete`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({ completionNote: 'Priya legal compliance confirmed.' });

      expect(priyaCompleteRes.status).toBe(200);
      expect(priyaCompleteRes.body.data.completedAt).toBeNull(); // Still open!
      const priyaAssignee = priyaCompleteRes.body.data.assignees.find((a: any) => a.userId === USER_REP2_ID);
      expect(priyaAssignee.completedAt).not.toBeNull();
      expect(priyaAssignee.completionNote).toBe('Priya legal compliance confirmed.');

      // 3. Marcus (final assignee) completes his assignment
      const marcusCompleteRes = await request(app)
        .post(`/api/tasks/${multiTaskId}/complete`)
        .set('Authorization', `Bearer ${rep3Token}`)
        .send({ completionNote: 'Marcus executive sign-off granted.' });

      expect(marcusCompleteRes.status).toBe(200);
      expect(marcusCompleteRes.body.data.completedAt).not.toBeNull(); // Now overall task is Completed!

      // 4. Verify notes were preserved independently on each TaskAssignee
      const finalTaskRes = await request(app)
        .get(`/api/tasks/${multiTaskId}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      const assignees = finalTaskRes.body.data.assignees;
      expect(assignees.find((a: any) => a.userId === USER_REP1_ID).completionNote).toBe('Alex technical review completed.');
      expect(assignees.find((a: any) => a.userId === USER_REP2_ID).completionNote).toBe('Priya legal compliance confirmed.');
      expect(assignees.find((a: any) => a.userId === USER_REP3_ID).completionNote).toBe('Marcus executive sign-off granted.');
    });

    it('14. should allow an individual assignee to reopen their own work and reset overall completedAt to null', { timeout: 60000 }, async () => {
      // Alex, Priya, Marcus all complete
      await request(app).post(`/api/tasks/${multiTaskId}/complete`).set('Authorization', `Bearer ${rep1Token}`).send({});
      await request(app).post(`/api/tasks/${multiTaskId}/complete`).set('Authorization', `Bearer ${rep2Token}`).send({});
      await request(app).post(`/api/tasks/${multiTaskId}/complete`).set('Authorization', `Bearer ${rep3Token}`).send({});

      // Verify task is completed
      const check1 = await request(app).get(`/api/tasks/${multiTaskId}`).set('Authorization', `Bearer ${rep1Token}`);
      expect(check1.body.data.completedAt).not.toBeNull();

      // Alex reopens his own work
      const reopenRes = await request(app)
        .post(`/api/tasks/${multiTaskId}/reopen`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.completedAt).toBeNull(); // Overall task is now open again!

      const alexAssignee = reopenRes.body.data.assignees.find((a: any) => a.userId === USER_REP1_ID);
      const priyaAssignee = reopenRes.body.data.assignees.find((a: any) => a.userId === USER_REP2_ID);
      const marcusAssignee = reopenRes.body.data.assignees.find((a: any) => a.userId === USER_REP3_ID);

      expect(alexAssignee.completedAt).toBeNull();
      // Priya and Marcus work remains completed!
      expect(priyaAssignee.completedAt).not.toBeNull();
      expect(marcusAssignee.completedAt).not.toBeNull();
    });

    it('15. should reject an unassigned user attempting to complete a task with 403', async () => {
      // Create task on Deal 1 assigned to Alex only
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Alex solo task',
          assignedToIds: [USER_REP1_ID],
          dueDate: '2026-10-15',
        });
      const soloTaskId = res.body.data.id;
      trackTask(soloTaskId);

      // Priya attempts to complete Alex's task
      const priyaAttempt = await request(app)
        .post(`/api/tasks/${soloTaskId}/complete`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({});

      expect(priyaAttempt.status).toBe(403);
      expect(priyaAttempt.body.message).toContain('not assigned to this task');
    });
  });

  // ==========================================================================
  // 4. Perspectives, Filtering & Deduplicated Queries
  // ==========================================================================
  describe('4. Perspectives, Filtering & Deduplicated Queries', () => {
    let dualTaskId: string;
    let priyaMarcusTaskId: string;

    beforeAll(async () => {
      await cleanupTracked();

      const todayStr = new Date().toISOString().slice(0, 10);

      // Task 1: Alex creates task assigned to Alex + Priya (Deal 4)
      const t1 = await request(app)
        .post(`/api/deals/${DEALS.d4}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Dual perspective joint task',
          priority: 'HIGH',
          assignedToIds: [USER_REP1_ID, USER_REP2_ID],
          dueDate: todayStr,
        });
      expect(t1.status).toBe(201);
      dualTaskId = t1.body.data.id;
      trackTask(dualTaskId);

      // Task 2: Alex creates task assigned to Priya + Marcus (Deal 3)
      const t2 = await request(app)
        .post(`/api/deals/${DEALS.d3}/tasks`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Priya and Marcus collaboration',
          priority: 'MEDIUM',
          assignedToIds: [USER_REP2_ID, USER_REP3_ID],
          dueDate: todayStr,
        });
      expect(t2.status).toBe(201);
      priyaMarcusTaskId = t2.body.data.id;
      trackTask(priyaMarcusTaskId);
    });

    it('16. should show self-assigned multi-assignee task in BOTH assigned_to_me and assigned_by_me for Alex', async () => {
      // 1. In assigned_to_me
      const toMeRes = await request(app)
        .get('/api/tasks?scope=assigned_to_me&limit=100')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(toMeRes.status).toBe(200);
      expect(toMeRes.body.data.some((t: any) => t.id === dualTaskId)).toBe(true);

      // 2. In assigned_by_me
      const byMeRes = await request(app)
        .get('/api/tasks?scope=assigned_by_me&limit=100')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(byMeRes.status).toBe(200);
      expect(byMeRes.body.data.some((t: any) => t.id === dualTaskId)).toBe(true);
    });

    it('17. should filter tasks by assignedToId matching any assignee in TaskAssignee', async () => {
      // Query tasks where Priya is an assignee
      const res = await request(app)
        .get(`/api/tasks?scope=team&assignedToId=${USER_REP2_ID}&limit=100`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((t: any) => t.id === dualTaskId)).toBe(true);
      expect(res.body.data.some((t: any) => t.id === priyaMarcusTaskId)).toBe(true);

      // Verify each task row is unique (no duplicate rows from joins)
      const ids = res.body.data.map((t: any) => t.id);
      const uniqueIds = Array.from(new Set(ids));
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('18. should count unique tasks in summary metrics', async () => {
      const res = await request(app)
        .get('/api/tasks?scope=team')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(typeof res.body.summary.open).toBe('number');
      expect(typeof res.body.summary.dueToday).toBe('number');
      expect(typeof res.body.summary.overdue).toBe('number');
    });
  });
});
