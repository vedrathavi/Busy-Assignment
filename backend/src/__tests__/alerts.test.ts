import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage, HistoryType, NotificationType } from '@prisma/client';

describe('Phase 10: Notification Foundation & Overdue DealAlerts Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // NEW, Alex
    d3:  '30000000-0000-4000-8000-000000000003', // PROPOSAL, Marcus (Collabs: Alex, Priya)
    d5:  '30000000-0000-4000-8000-000000000005', // WON, Priya
    d6:  '30000000-0000-4000-8000-000000000006', // LOST, Marcus
    d14: '30000000-0000-4000-8000-000000000014', // Overdue active deal (Alex), 2026-09-01
    d15: '30000000-0000-4000-8000-000000000015', // Overdue dismissed deal (Alex), 2026-09-05
    d16: '30000000-0000-4000-8000-000000000016', // Future QUALIFIED deal (Priya), 2026-11-20
    d18_softDeleted: '30000000-0000-4000-8000-000000000018', // Soft-deleted deal (Priya)
  };

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token = signToken({ sub: USER_REP1_ID });
    rep2Token = signToken({ sub: USER_REP2_ID });
    rep3Token = signToken({ sub: USER_REP3_ID });
  });

  const resetAlertsState = async () => {
    // 1. Clean any test-created deal alerts on non-seeded deals (e.g. Deal 14)
    const extraAlerts = await prisma.dealAlert.findMany({
      where: { dealId: { not: DEALS.d15 } },
      select: { id: true, notificationId: true },
    });
    for (const a of extraAlerts) {
      await prisma.dealAlert.delete({ where: { id: a.id } });
      if (a.notificationId !== '50000000-0000-4000-8000-000000000001') {
        await prisma.notification.deleteMany({ where: { id: a.notificationId } });
      }
    }

    // 2. Remove any deal collaborators on Deal 15 added during tests
    await prisma.dealCollaborator.deleteMany({
      where: { dealId: DEALS.d15 },
    });

    // 3. Restore Notification for Deal 15 overdue alert to seed state (recipient = Alex)
    await prisma.notification.upsert({
      where: { id: '50000000-0000-4000-8000-000000000001' },
      update: {
        userId: USER_REP1_ID,
        type: NotificationType.DEAL_OVERDUE,
        readAt: null,
      },
      create: {
        id: '50000000-0000-4000-8000-000000000001',
        userId: USER_REP1_ID,
        type: NotificationType.DEAL_OVERDUE,
        readAt: null,
        createdAt: new Date('2026-09-06T09:00:00.000Z'),
      },
    });

    // 4. Reset Deal 14 and 15 properties to pristine seed state
    await prisma.deal.update({
      where: { id: DEALS.d14 },
      data: {
        ownerId: USER_REP1_ID,
        expectedCloseDate: new Date('2026-09-01'),
        stage: DealStage.NEGOTIATION,
        deletedAt: null,
      },
    });

    await prisma.deal.update({
      where: { id: DEALS.d15 },
      data: {
        ownerId: USER_REP1_ID,
        expectedCloseDate: new Date('2026-09-05'),
        stage: DealStage.PROPOSAL,
        deletedAt: null,
      },
    });

    // 5. Restore DealAlert for Deal 15 with seed dismissedCloseDate
    await prisma.dealAlert.upsert({
      where: { dealId: DEALS.d15 },
      update: {
        dismissedCloseDate: new Date('2026-09-05'),
        dismissedAt: new Date('2026-09-06T09:00:00.000Z'),
      },
      create: {
        id: '60000000-0000-4000-8000-000000000001',
        notificationId: '50000000-0000-4000-8000-000000000001',
        dealId: DEALS.d15,
        dismissedCloseDate: new Date('2026-09-05'),
        dismissedAt: new Date('2026-09-06T09:00:00.000Z'),
      },
    });

    // 6. Reset other deals that may have had temporary date changes during test
    await prisma.deal.update({
      where: { id: DEALS.d3 },
      data: { expectedCloseDate: new Date('2026-10-15') },
    });

    await prisma.deal.update({
      where: { id: DEALS.d5 },
      data: { expectedCloseDate: new Date('2026-08-20') },
    });

    await prisma.deal.update({
      where: { id: DEALS.d18_softDeleted },
      data: { expectedCloseDate: new Date('2026-09-10') },
    });
  };

  beforeEach(async () => {
    await resetAlertsState();
  });

  afterAll(async () => {
    await resetAlertsState();
  });

  // ==========================================================================
  // 1. Data Model & Architecture Invariants
  // ==========================================================================
  describe('1. Data Model & Composition Invariants', () => {
    it('1. should have Notification model with DEAL_OVERDUE discriminator and 1:1 DealAlert relation', async () => {
      const alert = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d15 },
        include: { notification: true, deal: true },
      });

      expect(alert).not.toBeNull();
      expect(alert?.notification).not.toBeNull();
      expect(alert?.notification.type).toBe(NotificationType.DEAL_OVERDUE);
      expect(alert?.notification.userId).toBe(USER_REP1_ID); // Recipient = deal owner
      expect(alert?.dealId).toBe(DEALS.d15);
    });

    it('2. should enforce unique constraint on DealAlert.dealId and DealAlert.notificationId', async () => {
      const alert = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d15 },
      });
      expect(alert).not.toBeNull();

      // Attempting to duplicate notificationId should fail unique constraint
      await expect(
        prisma.dealAlert.create({
          data: {
            notificationId: alert!.notificationId,
            dealId: DEALS.d14,
            dismissedCloseDate: new Date('2026-09-01'),
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 2. Dynamic Overdue Alert Detection (GET /api/alerts)
  // ==========================================================================
  describe('2. Dynamic Overdue Alert Derivation (GET /api/alerts)', () => {
    it('1. should return active overdue deals without writing any rows to the database (pure GET read)', async () => {
      const notifCountBefore = await prisma.notification.count();
      const alertCountBefore = await prisma.dealAlert.count();

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify no new records were inserted
      const notifCountAfter = await prisma.notification.count();
      const alertCountAfter = await prisma.dealAlert.count();
      expect(notifCountAfter).toBe(notifCountBefore);
      expect(alertCountAfter).toBe(alertCountBefore);

      // Deal 14 is active overdue without dismissal -> present
      const d14Alert = res.body.data.find((a: any) => a.dealId === DEALS.d14);
      expect(d14Alert).toBeDefined();
      expect(d14Alert.title).toBe('Overdue Live Deal - Stalled Negotiation');
      expect(d14Alert.expectedCloseDate).toBe('2026-09-01');
      expect(d14Alert.stage).toBe('NEGOTIATION');
      expect(d14Alert.type).toBe('DEAL_OVERDUE');
      expect(d14Alert.company.name).toBe('Acme Corp');
      expect(d14Alert.owner.email).toBe('alex@busy.com');

      // Deal 15 is overdue WITH matching dismissal date -> excluded
      const d15Alert = res.body.data.find((a: any) => a.dealId === DEALS.d15);
      expect(d15Alert).toBeUndefined();
    });

    it('2. should exclude closed deals (WON/LOST) even if expectedCloseDate was in the past', async () => {
      // Create past date on Won deal
      await prisma.deal.update({
        where: { id: DEALS.d5 },
        data: { expectedCloseDate: new Date('2026-08-01') },
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const wonAlert = res.body.data.find((a: any) => a.dealId === DEALS.d5);
      expect(wonAlert).toBeUndefined();
    });

    it('3. should exclude soft-deleted deals (Trash)', async () => {
      // Soft-deleted deal 18 has expectedCloseDate in past
      await prisma.deal.update({
        where: { id: DEALS.d18_softDeleted },
        data: { expectedCloseDate: new Date('2026-08-15') },
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const deletedAlert = res.body.data.find((a: any) => a.dealId === DEALS.d18_softDeleted);
      expect(deletedAlert).toBeUndefined();
    });

    it('4. should exclude deals with future expectedCloseDate', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const futureAlert = res.body.data.find((a: any) => a.dealId === DEALS.d16);
      expect(futureAlert).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. Role-Based Visibility
  // ==========================================================================
  describe('3. Role-Based Visibility for Alerts', () => {
    it('1. should allow Manager to see all team overdue alerts', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const deal14 = res.body.data.find((a: any) => a.dealId === DEALS.d14);
      expect(deal14).toBeDefined();
    });

    it('2. should allow Sales Rep to see overdue alerts for deals they own', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep1Token}`); // Alex owns Deal 14

      expect(res.status).toBe(200);
      const deal14 = res.body.data.find((a: any) => a.dealId === DEALS.d14);
      expect(deal14).toBeDefined();
    });

    it('3. should allow Sales Rep to see overdue alerts for deals where they are a collaborator', async () => {
      // Make Deal 3 overdue (owned by Marcus, Alex & Priya are collaborators)
      await prisma.deal.update({
        where: { id: DEALS.d3 },
        data: { expectedCloseDate: new Date('2026-09-02') },
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep2Token}`); // Priya

      expect(res.status).toBe(200);
      const deal3Alert = res.body.data.find((a: any) => a.dealId === DEALS.d3);
      expect(deal3Alert).toBeDefined();
    });

    it('4. should NOT allow Sales Rep to see overdue deals of others where they are neither owner nor collaborator', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep2Token}`); // Priya does NOT own/collaborate on Deal 14

      expect(res.status).toBe(200);
      const deal14 = res.body.data.find((a: any) => a.dealId === DEALS.d14);
      expect(deal14).toBeUndefined();
    });

    it('5. should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // 4. Alert Count Endpoint (GET /api/alerts/count)
  // ==========================================================================
  describe('4. Alert Counts (GET /api/alerts/count)', () => {
    it('1. should return exact count matching GET /api/alerts length', async () => {
      const listRes = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      const countRes = await request(app)
        .get('/api/alerts/count')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.success).toBe(true);
      expect(countRes.body.data.count).toBe(listRes.body.data.length);
      expect(typeof countRes.body.data.unreadCount).toBe('number');
    });

    it('2. should reject unauthenticated count request with 401', async () => {
      const res = await request(app).get('/api/alerts/count');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // 5. Dismissal Endpoint (POST /api/alerts/:dealId/dismiss)
  // ==========================================================================
  describe('5. Dismissal Endpoint (POST /api/alerts/:dealId/dismiss)', () => {
    it('1. should allow Deal Owner to dismiss an overdue deal alert', async () => {
      const res = await request(app)
        .post(`/api/alerts/${DEALS.d14}/dismiss`)
        .set('Authorization', `Bearer ${rep1Token}`); // Alex owns Deal 14

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dealId).toBe(DEALS.d14);
      expect(res.body.data.dismissedCloseDate).toBe('2026-09-01');

      // Verify DealAlert is persisted in database
      const alert = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d14 },
        include: { notification: true },
      });
      expect(alert).not.toBeNull();
      expect(alert?.notification.userId).toBe(USER_REP1_ID);

      // Verify deal is now excluded from GET /api/alerts
      const getRes = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep1Token}`);
      const d14Alert = getRes.body.data.find((a: any) => a.dealId === DEALS.d14);
      expect(d14Alert).toBeUndefined();
    });

    it('2. should allow Manager to dismiss any team overdue deal alert', async () => {
      const res = await request(app)
        .post(`/api/alerts/${DEALS.d14}/dismiss`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dealId).toBe(DEALS.d14);
    });

    it('3. should reject non-owner collaborator attempting to dismiss with 403 Forbidden', async () => {
      // Make Deal 3 overdue (owned by Marcus, Priya is collaborator)
      await prisma.deal.update({
        where: { id: DEALS.d3 },
        data: { expectedCloseDate: new Date('2026-09-02') },
      });

      const res = await request(app)
        .post(`/api/alerts/${DEALS.d3}/dismiss`)
        .set('Authorization', `Bearer ${rep2Token}`); // Priya is collaborator, not owner

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the deal owner or a manager can dismiss');
    });

    it('4. should reject dismissal of a non-overdue deal with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/alerts/${DEALS.d16}/dismiss`) // Deal 16 has future expectedCloseDate 2026-11-20
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Deal is not overdue');
    });

    it('5. should reject dismissal of a closed deal with 400 Bad Request', async () => {
      // Past date on Won deal
      await prisma.deal.update({
        where: { id: DEALS.d5 },
        data: { expectedCloseDate: new Date('2026-08-01') },
      });

      const res = await request(app)
        .post(`/api/alerts/${DEALS.d5}/dismiss`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Deal is already closed');
    });

    it('6. should reject dismissal of a soft-deleted deal with 400 Bad Request', async () => {
      await prisma.deal.update({
        where: { id: DEALS.d18_softDeleted },
        data: { expectedCloseDate: new Date('2026-08-01') },
      });

      const res = await request(app)
        .post(`/api/alerts/${DEALS.d18_softDeleted}/dismiss`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('deleted deal');
    });

    it('7. should reject dismissal of non-existent deal with 404 Not Found', async () => {
      const randomId = '00000000-9999-4000-8000-000000000999';
      const res = await request(app)
        .post(`/api/alerts/${randomId}/dismiss`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
    });

    it('8. should be idempotent: repeated dismissal succeeds and does not duplicate rows', async () => {
      const res1 = await request(app)
        .post(`/api/alerts/${DEALS.d14}/dismiss`)
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(res1.status).toBe(200);

      const alertCount1 = await prisma.dealAlert.count();

      const res2 = await request(app)
        .post(`/api/alerts/${DEALS.d14}/dismiss`)
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(res2.status).toBe(200);

      const alertCount2 = await prisma.dealAlert.count();
      expect(alertCount2).toBe(alertCount1);
    });
  });

  // ==========================================================================
  // 6. Alert Reappearance on Date Change
  // ==========================================================================
  describe('6. Alert Reappearance on Date Change', () => {
    beforeEach(async () => {
      await resetAlertsState();
    });

    it('1. should allow dismissed deal alert to reappear when expectedCloseDate is modified to a different overdue date', async () => {
      // Deal 15 is initially dismissed for expectedCloseDate 2026-09-05
      let res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeUndefined();

      // Change Deal 15's expectedCloseDate to a new overdue date: 2026-09-03
      await prisma.deal.update({
        where: { id: DEALS.d15 },
        data: { expectedCloseDate: new Date('2026-09-03') },
      });

      // The alert should now reappear in GET /api/alerts
      res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      const d15Reappeared = res.body.data.find((a: any) => a.dealId === DEALS.d15);
      expect(d15Reappeared).toBeDefined();
      expect(d15Reappeared.expectedCloseDate).toBe('2026-09-03');

      // Dismissing it again updates the dismissedCloseDate to the new date
      const dismissRes = await request(app)
        .post(`/api/alerts/${DEALS.d15}/dismiss`)
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(dismissRes.status).toBe(200);
      expect(dismissRes.body.data.dismissedCloseDate).toBe('2026-09-03');

      // Deal 15 is dismissed again
      res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeUndefined();
    });
  });

  // ==========================================================================
  // 7. Owner Reassignment & Notification Recipient Synchronization
  // ==========================================================================
  describe('7. Owner Reassignment & Notification Recipient Synchronization', () => {
    beforeEach(async () => {
      await resetAlertsState();
    });

    it('1. should atomically update Notification.userId and record OWNER_CHANGED history when deal ownership is reassigned', async () => {
      // Deal 15 is currently owned by Rep 1 (Alex), with an existing Notification + DealAlert
      const alertBefore = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d15 },
        include: { notification: true },
      });
      expect(alertBefore).not.toBeNull();
      expect(alertBefore?.notification.userId).toBe(USER_REP1_ID);

      // Reassign Deal 15 to Rep 2 (Priya) via single deal update
      const updateRes = await request(app)
        .patch(`/api/deals/${DEALS.d15}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP2_ID });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.ownerId).toBe(USER_REP2_ID);

      // Verify Notification.userId was updated to Rep 2
      const alertAfter = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d15 },
        include: { notification: true },
      });
      expect(alertAfter?.notification.userId).toBe(USER_REP2_ID);

      // Verify DealHistory contains OWNER_CHANGED
      const history = await prisma.dealHistory.findFirst({
        where: { dealId: DEALS.d15, type: HistoryType.OWNER_CHANGED },
        orderBy: { createdAt: 'desc' },
      });
      expect(history).not.toBeNull();
      expect(history?.oldOwnerId).toBe(USER_REP1_ID);
      expect(history?.newOwnerId).toBe(USER_REP2_ID);
    });

    it('2. should enforce old owner vs new owner visibility and dismissal authorization after reassignment', async () => {
      // Reassign Deal 15 to Rep 2 first
      await request(app)
        .patch(`/api/deals/${DEALS.d15}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP2_ID });

      // Old Owner (Rep 1) cannot dismiss Deal 15 (not owner, not collaborator)
      const oldOwnerDismiss = await request(app)
        .post(`/api/alerts/${DEALS.d15}/dismiss`)
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(oldOwnerDismiss.status).toBe(403);

      // Make Deal 15 overdue again by changing expectedCloseDate
      await prisma.deal.update({
        where: { id: DEALS.d15 },
        data: { expectedCloseDate: new Date('2026-09-02') },
      });

      // Old Owner (Rep 1) does NOT see Deal 15 in GET /api/alerts
      const rep1Alerts = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(rep1Alerts.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeUndefined();

      // New Owner (Rep 2) DOES see Deal 15 in GET /api/alerts
      const rep2Alerts = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep2Token}`);
      expect(rep2Alerts.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeDefined();

      // Manager sees Deal 15 in GET /api/alerts
      const mgrAlerts = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(mgrAlerts.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeDefined();

      // New Owner (Rep 2) CAN dismiss Deal 15
      const newOwnerDismiss = await request(app)
        .post(`/api/alerts/${DEALS.d15}/dismiss`)
        .set('Authorization', `Bearer ${rep2Token}`);
      expect(newOwnerDismiss.status).toBe(200);
      expect(newOwnerDismiss.body.data.dismissedCloseDate).toBe('2026-09-02');
    });

    it('3. should grant collaborator visibility on reassigned deal but prevent collaborator dismissal with 403 Forbidden', async () => {
      // Reassign Deal 15 to Rep 2
      await request(app)
        .patch(`/api/deals/${DEALS.d15}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP2_ID });

      // Reset Deal 15 expectedCloseDate to overdue date 2026-09-01 so alert triggers
      await prisma.deal.update({
        where: { id: DEALS.d15 },
        data: { expectedCloseDate: new Date('2026-09-01') },
      });

      // Add Rep 3 (Marcus) as collaborator on Deal 15
      await prisma.dealCollaborator.upsert({
        where: {
          dealId_userId: {
            dealId: DEALS.d15,
            userId: USER_REP3_ID,
          },
        },
        update: {},
        create: {
          dealId: DEALS.d15,
          userId: USER_REP3_ID,
        },
      });

      // Collaborator (Rep 3) sees Deal 15 in GET /api/alerts
      const rep3Alerts = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${rep3Token}`);
      expect(rep3Alerts.body.data.find((a: any) => a.dealId === DEALS.d15)).toBeDefined();

      // Collaborator (Rep 3) is REJECTED when attempting to dismiss with 403 Forbidden
      const rep3Dismiss = await request(app)
        .post(`/api/alerts/${DEALS.d15}/dismiss`)
        .set('Authorization', `Bearer ${rep3Token}`);
      expect(rep3Dismiss.status).toBe(403);
      expect(rep3Dismiss.body.message).toContain('Only the deal owner or a manager can dismiss deal alerts');
    });

    it('4. should synchronize Notification.userId on bulk reassignment', async () => {
      // Bulk reassign Deal 15 to Rep 3
      const bulkRes = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d15],
          ownerId: USER_REP3_ID,
        });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.summary.succeeded).toBe(1);

      // Check notification is now assigned to Rep 3
      const alert = await prisma.dealAlert.findUnique({
        where: { dealId: DEALS.d15 },
        include: { notification: true },
      });
      expect(alert?.notification.userId).toBe(USER_REP3_ID);
    });
  });
});

