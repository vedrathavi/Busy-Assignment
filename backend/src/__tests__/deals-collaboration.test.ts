import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage, HistoryType, UserRole } from '@prisma/client';

describe('Phase 6: Deal Collaborators, Immutable History & Notes Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Seed Deal UUIDs
  const DEALS = {
    d7:  '30000000-0000-4000-8000-000000000007', // Alex, NEW, Beacon (No collaborators seeded)
    d2:  '30000000-0000-4000-8000-000000000002', // Priya, QUALIFIED, Apex
    d3:  '30000000-0000-4000-8000-000000000003', // Marcus, PROPOSAL, Stellar (Collabs: Alex & Priya)
    d4:  '30000000-0000-4000-8000-000000000004', // Alex, NEGOTIATION, Zenith (Collab: Priya)
    d18: '30000000-0000-4000-8000-000000000018', // Priya, NEW, Apex (Soft-deleted)
  };

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

  const seededCollaborators = [
    { dealId: '30000000-0000-4000-8000-000000000003', userId: USER_REP1_ID },
    { dealId: '30000000-0000-4000-8000-000000000003', userId: USER_REP2_ID },
    { dealId: '30000000-0000-4000-8000-000000000004', userId: USER_REP2_ID },
    { dealId: '30000000-0000-4000-8000-000000000008', userId: USER_REP3_ID },
    { dealId: '30000000-0000-4000-8000-000000000010', userId: USER_REP1_ID },
    { dealId: '30000000-0000-4000-8000-000000000013', userId: USER_REP1_ID },
  ];

  const cleanupCollaborators = async () => {
    // Delete any non-seeded collaborators
    await prisma.dealCollaborator.deleteMany({
      where: {
        NOT: {
          OR: seededCollaborators.map((c) => ({
            dealId: c.dealId,
            userId: c.userId,
          })),
        },
      },
    });

    // Ensure all seeded collaborators exist
    for (const c of seededCollaborators) {
      await prisma.dealCollaborator.upsert({
        where: { dealId_userId: { dealId: c.dealId, userId: c.userId } },
        create: c,
        update: {},
      });
    }

    // Delete dynamically generated test history events
    await prisma.dealHistory.deleteMany({
      where: {
        type: { in: [HistoryType.COLLABORATOR_ADDED, HistoryType.COLLABORATOR_REMOVED, HistoryType.NOTE_ADDED] },
        createdAt: { gte: new Date('2026-09-10T00:00:00.000Z') },
      },
    });
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });
    rep3Token    = signToken({ sub: USER_REP3_ID });

    await cleanupCollaborators();
  }, 30000);

  afterAll(async () => {
    await cleanupCollaborators();
  }, 30000);

  // ==========================================================================
  // 1. Collaborator Listing (GET /api/deals/:id/collaborators)
  // ==========================================================================
  describe('1. Collaborator Listing (GET /api/deals/:id/collaborators)', () => {
    it('1. should allow Manager to list collaborators on any team deal', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const userIds = res.body.data.map((c: any) => c.userId);
      expect(userIds).toContain(USER_REP1_ID);
      expect(userIds).toContain(USER_REP2_ID);
    });

    it('2. should allow Deal Owner to list collaborators', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}/collaborators`)
        .set('Authorization', `Bearer ${rep3Token}`); // Marcus is owner of d3

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('3. should allow existing Collaborator to list collaborators', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}/collaborators`)
        .set('Authorization', `Bearer ${rep1Token}`); // Alex is collaborator on d3

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('4. should reject unauthorized Sales Rep with 404 (IDOR Protection)', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep3Token}`); // Marcus has no relation to d1

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('5. should never expose passwordHash in collaborator list user objects', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.user).toHaveProperty('id');
        expect(item.user).toHaveProperty('name');
        expect(item.user).toHaveProperty('email');
        expect(item.user).not.toHaveProperty('passwordHash');
        expect(item.user).not.toHaveProperty('password');
      }
    });
  });

  // ==========================================================================
  // 2. Collaborator Addition (POST /api/deals/:id/collaborators)
  // ==========================================================================
  describe('2. Collaborator Addition (POST /api/deals/:id/collaborators)', () => {
    it('6. should allow Deal Owner to add a valid Sales Rep as collaborator and record COLLABORATOR_ADDED history', async () => {
      // Alex (owner of d1) adds Priya (rep2) as collaborator
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ userId: USER_REP2_ID });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dealId).toBe(DEALS.d7);
      expect(res.body.data.userId).toBe(USER_REP2_ID);
      expect(res.body.data.user.name).toBe('Priya Sharma');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      // Verify immutable history event was created atomically
      const history = await prisma.dealHistory.findFirst({
        where: {
          dealId: DEALS.d7,
          type: HistoryType.COLLABORATOR_ADDED,
          collaboratorId: USER_REP2_ID,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(history).not.toBeNull();
      expect(history?.actorId).toBe(USER_REP1_ID);
      expect(history?.collaboratorId).toBe(USER_REP2_ID);
    });

    it('7. should allow Manager to add a collaborator to any team deal', async () => {
      // Sarah (manager) adds Marcus (rep3) as collaborator to d1
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: USER_REP3_ID });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(USER_REP3_ID);

      // Verify history actorId is Manager
      const history = await prisma.dealHistory.findFirst({
        where: {
          dealId: DEALS.d7,
          type: HistoryType.COLLABORATOR_ADDED,
          collaboratorId: USER_REP3_ID,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(history?.actorId).toBe(USER_MANAGER_ID);
    });

    it('8. should reject Collaborator attempting to add another collaborator with 403 Forbidden', async () => {
      // Priya is a collaborator on d1 (not owner/manager). Attempts to add someone else.
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({ userId: USER_REP3_ID });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only the deal owner or a manager');
    });

    it('9. should reject adding the Deal Owner as a collaborator with 400 Bad Request', async () => {
      // Alex is the owner of d1. Manager tries to add Alex as collaborator on d1.
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: USER_REP1_ID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Deal owner cannot be added as a collaborator');
    });

    it('10. should reject adding a Manager as a collaborator with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ userId: USER_MANAGER_ID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must have the SALES_REP role');
    });

    it('11. should reject adding duplicate collaborator with 400 Bad Request', async () => {
      // Priya is already a collaborator on d1 from test 6
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ userId: USER_REP2_ID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already a collaborator');
    });

    it('12. should reject adding non-existent user ID with 400 Bad Request', async () => {
      const fakeUserId = '99999999-0000-4000-8000-000000000099';
      const res = await request(app)
        .post(`/api/deals/${DEALS.d7}/collaborators`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ userId: fakeUserId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Target collaborator does not exist');
    });

    it('13. should reject adding collaborator to a soft-deleted deal with 404', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d18}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: USER_REP1_ID });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Collaborator Removal (DELETE /api/deals/:id/collaborators/:userId)
  // ==========================================================================
  describe('3. Collaborator Removal (DELETE /api/deals/:id/collaborators/:userId)', () => {
    it('14. should reject Collaborator attempting to remove another collaborator with 403', async () => {
      // Priya (collaborator on d1) attempts to remove Marcus (collaborator on d1)
      const res = await request(app)
        .delete(`/api/deals/${DEALS.d7}/collaborators/${USER_REP3_ID}`)
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('15. should allow Deal Owner to remove a collaborator and record COLLABORATOR_REMOVED history', async () => {
      // Alex (owner of d1) removes Marcus (collaborator on d1)
      const res = await request(app)
        .delete(`/api/deals/${DEALS.d7}/collaborators/${USER_REP3_ID}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('removed successfully');

      // Verify removal from database
      const collaborator = await prisma.dealCollaborator.findUnique({
        where: { dealId_userId: { dealId: DEALS.d7, userId: USER_REP3_ID } },
      });
      expect(collaborator).toBeNull();

      // Verify COLLABORATOR_REMOVED history event was recorded
      const history = await prisma.dealHistory.findFirst({
        where: {
          dealId: DEALS.d7,
          type: HistoryType.COLLABORATOR_REMOVED,
          collaboratorId: USER_REP3_ID,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(history).not.toBeNull();
      expect(history?.actorId).toBe(USER_REP1_ID);
      expect(history?.collaboratorId).toBe(USER_REP3_ID);
    });

    it('16. should allow Manager to remove a collaborator', async () => {
      // Manager removes Priya from d1
      const res = await request(app)
        .delete(`/api/deals/${DEALS.d7}/collaborators/${USER_REP2_ID}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const history = await prisma.dealHistory.findFirst({
        where: {
          dealId: DEALS.d7,
          type: HistoryType.COLLABORATOR_REMOVED,
          collaboratorId: USER_REP2_ID,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(history?.actorId).toBe(USER_MANAGER_ID);
    });

    it('17. should reject removing a non-collaborator user with 400 Bad Request', async () => {
      // Marcus is no longer a collaborator on d1
      const res = await request(app)
        .delete(`/api/deals/${DEALS.d7}/collaborators/${USER_REP3_ID}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not a collaborator on this deal');
    });
  });

  // ==========================================================================
  // 4. Deal Notes (POST /api/deals/:id/notes)
  // ==========================================================================
  describe('4. Deal Notes (POST /api/deals/:id/notes)', () => {
    it('18. should allow Deal Owner to add a note and record NOTE_ADDED history', async () => {
      const noteContent = 'Discussed renewal terms with client CFO.';
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${rep1Token}`) // Alex is owner
        .send({ note: noteContent });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe(HistoryType.NOTE_ADDED);
      expect(res.body.data.note).toBe(noteContent);
      expect(res.body.data.actor.name).toBe('Alex Rivera');
      expect(res.body.data.actor).not.toHaveProperty('passwordHash');

      // Verify persisted in DealHistory
      const history = await prisma.dealHistory.findFirst({
        where: { dealId: DEALS.d4, type: HistoryType.NOTE_ADDED, note: noteContent },
      });
      expect(history).not.toBeNull();
      expect(history?.actorId).toBe(USER_REP1_ID);
    });

    it('19. should allow Collaborator to add a note', async () => {
      const noteContent = 'Collaborator update: technical evaluation passed.';
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${rep2Token}`) // Priya is collaborator on d4
        .send({ note: noteContent });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actor.name).toBe('Priya Sharma');
    });

    it('20. should allow Manager to add a note', async () => {
      const noteContent = 'Manager note: approved for special executive discount.';
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: noteContent });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actor.name).toBe('Sarah Jenkins');
    });

    it('21. should reject unauthorized Sales Rep attempting to add a note with 403/404', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${rep3Token}`) // Marcus is not associated with d4
        .send({ note: 'Unauthorized note' });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('22. should reject empty or whitespace-only note with 400 Bad Request', async () => {
      const res1 = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ note: '' });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .post(`/api/deals/${DEALS.d4}/notes`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ note: '    ' });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it('23. should reject adding note to a soft-deleted deal with 404', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d18}/notes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: 'Note on deleted deal' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 5. Immutable History API (GET /api/deals/:id/history)
  // ==========================================================================
  describe('5. Immutable History API (GET /api/deals/:id/history)', () => {
    it('24. should allow Manager to retrieve complete history ordered newest-first', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d4}/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      // Verify descending timestamp order
      for (let i = 0; i < res.body.data.length - 1; i++) {
        const t1 = new Date(res.body.data[i].createdAt).getTime();
        const t2 = new Date(res.body.data[i + 1].createdAt).getTime();
        expect(t1).toBeGreaterThanOrEqual(t2);
      }

      // Verify structure of history records
      const firstItem = res.body.data[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('dealId');
      expect(firstItem).toHaveProperty('actorId');
      expect(firstItem).toHaveProperty('type');
      expect(firstItem).toHaveProperty('createdAt');
      expect(firstItem.actor).toHaveProperty('name');
      expect(firstItem.actor).not.toHaveProperty('passwordHash');
    });

    it('25. should allow Collaborator to view history', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d4}/history`)
        .set('Authorization', `Bearer ${rep2Token}`); // Priya is collaborator on d4

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('26. should reject unauthorized Sales Rep from viewing history with 404 (IDOR Protection)', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d4}/history`)
        .set('Authorization', `Bearer ${rep3Token}`); // Marcus has no access to d4

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('27. should allow authorized Manager/Owner to view history of a soft-deleted deal', async () => {
      // d18 is soft-deleted
      const res = await request(app)
        .get(`/api/deals/${DEALS.d18}/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const types = res.body.data.map((h: any) => h.type);
      expect(types).toContain(HistoryType.CREATED);
      expect(types).toContain(HistoryType.DELETED);
    });

    it('28. should return collaboratorId and safe collaborator object on collaborator events', async () => {
      // Fetch history for d1 (where collaborator was added and removed in earlier tests)
      const res = await request(app)
        .get(`/api/deals/${DEALS.d7}/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const addEvent = res.body.data.find((h: any) => h.type === HistoryType.COLLABORATOR_ADDED);
      expect(addEvent).toBeDefined();
      expect(addEvent.collaboratorId).toBeDefined();
      expect(addEvent.collaborator).toBeDefined();
      expect(addEvent.collaborator.name).toBeDefined();
      expect(addEvent.collaborator).not.toHaveProperty('passwordHash');

      const removeEvent = res.body.data.find((h: any) => h.type === HistoryType.COLLABORATOR_REMOVED);
      expect(removeEvent).toBeDefined();
      expect(removeEvent.collaboratorId).toBeDefined();
    });

    it('29. should confirm history immutability: no mutation endpoints exist (PATCH/PUT/DELETE return 404)', async () => {
      const resPatch = await request(app)
        .patch(`/api/deals/${DEALS.d4}/history`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: 'Tampered history' });
      expect(resPatch.status).toBe(404);

      const resDelete = await request(app)
        .delete(`/api/deals/${DEALS.d4}/history`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(resDelete.status).toBe(404);
    });
  });

  // ==========================================================================
  // 6. Ownership Reassignment & Collaborator Preservation
  // ==========================================================================
  describe('6. Ownership Reassignment & Collaborator Preservation', () => {
    it('30. should preserve existing collaborators when Manager reassigns deal owner', async () => {
      // d4 is owned by Alex with Priya as collaborator.
      // Manager reassigns d4 owner from Alex to Marcus.
      const resUpdate = await request(app)
        .patch(`/api/deals/${DEALS.d4}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP3_ID });

      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.data.ownerId).toBe(USER_REP3_ID);

      // Verify Priya is STILL a collaborator on d4
      const collabsRes = await request(app)
        .get(`/api/deals/${DEALS.d4}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(collabsRes.status).toBe(200);
      const userIds = collabsRes.body.data.map((c: any) => c.userId);
      expect(userIds).toContain(USER_REP2_ID);

      // Verify Marcus is NOT added as a collaborator (he is owner)
      expect(userIds).not.toContain(USER_REP3_ID);

      // Restore d4 owner back to Alex
      await request(app)
        .patch(`/api/deals/${DEALS.d4}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP1_ID });
    });
  });
});
