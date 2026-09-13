import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage, NotificationType, Prisma } from '@prisma/client';

describe('Optional Addon: Deal Activity Notifications Integration Tests', { timeout: 35000 }, () => {
  const app = createApp();

  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep 1)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep 2)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep 3)

  const TEAM_ID        = '00000000-0000-4000-8000-000000000002';
  const COMPANY_ACME   = '20000000-0000-4000-8000-000000000001';

  let managerToken: string;
  let rep1Token: string;
  let rep2Token: string;
  let rep3Token: string;

  // Track created test deal IDs for clean up
  const createdTestDealIds: string[] = [];

  const cleanupTestDeals = async () => {
    if (createdTestDealIds.length > 0) {
      const ids = [...createdTestDealIds];
      await prisma.notification.deleteMany({ where: { dealId: { in: ids } } });
      await prisma.dealCollaborator.deleteMany({ where: { dealId: { in: ids } } });
      await prisma.dealHistory.deleteMany({ where: { dealId: { in: ids } } });
      await prisma.deal.deleteMany({ where: { id: { in: ids } } });
      createdTestDealIds.length = 0;
    }
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token = signToken({ sub: USER_REP1_ID });
    rep2Token = signToken({ sub: USER_REP2_ID });
    rep3Token = signToken({ sub: USER_REP3_ID });
  });

  afterAll(async () => {
    await cleanupTestDeals();
  });

  // Helper to create an isolated test deal
  const createTestDeal = async (
    ownerId: string,
    stage: DealStage = DealStage.NEW,
    title = 'Test Notification Deal'
  ) => {
    const deal = await prisma.deal.create({
      data: {
        title,
        companyId: COMPANY_ACME,
        teamId: TEAM_ID,
        ownerId,
        value: new Prisma.Decimal('10000.00'),
        expectedCloseDate: new Date('2026-12-31T00:00:00.000Z'),
        stage,
      },
    });
    createdTestDealIds.push(deal.id);
    return deal;
  };

  // 1. Stage advance creates notifications for owner, collaborators, and managers
  it('1. should create DEAL_STAGE_ADVANCED notifications for owner, collaborators, and managers upon stage advance', async () => {
    // Deal owned by Rep 1, with Rep 2 as collaborator
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Stage Advance Notification Deal');
    await prisma.dealCollaborator.create({
      data: { dealId: deal.id, userId: USER_REP2_ID },
    });

    // Advance deal as Rep 1 (owner is actor)
    const res = await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: DealStage.QUALIFIED });

    expect(res.status).toBe(200);

    // Notifications for this deal
    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_STAGE_ADVANCED },
    });

    // Rep 2 (collaborator) and Manager should be notified
    const notifiedUserIds = notifs.map((n) => n.userId);
    expect(notifiedUserIds).toContain(USER_REP2_ID);
    expect(notifiedUserIds).toContain(USER_MANAGER_ID);
    // Actor (Rep 1) should NOT be notified
    expect(notifiedUserIds).not.toContain(USER_REP1_ID);
  });

  // 2. Actor does not receive self-notification
  it('2. should NOT notify the actor who performed the stage transition', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.QUALIFIED, 'Actor Excluded Deal');
    await prisma.dealCollaborator.create({
      data: { dealId: deal.id, userId: USER_REP2_ID },
    });

    // Advance deal as Rep 2 (collaborator is actor)
    await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep2Token}`)
      .send({ stage: DealStage.PROPOSAL });

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_STAGE_ADVANCED },
    });

    const notifiedUserIds = notifs.map((n) => n.userId);
    expect(notifiedUserIds).toContain(USER_REP1_ID); // Owner gets it
    expect(notifiedUserIds).toContain(USER_MANAGER_ID); // Manager gets it
    expect(notifiedUserIds).not.toContain(USER_REP2_ID); // Actor does NOT get it
  });

  // 3. Backward transition creates notification
  it('3. should create DEAL_STAGE_REGRESSED notification when moving backward with a reason', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.QUALIFIED, 'Regress Deal');

    // Regress from QUALIFIED to NEW with reason as Manager
    const res = await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ stage: DealStage.NEW, reason: 'Budget constraints on client end' });

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_STAGE_REGRESSED },
    });

    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs.some((n) => n.userId === USER_REP1_ID)).toBe(true);
  });

  // 4. Won creates notification
  it('4. should create DEAL_WON notification when a deal is closed won', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEGOTIATION, 'Won Deal');

    const res = await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: DealStage.WON });

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_WON },
    });

    expect(notifs.some((n) => n.userId === USER_MANAGER_ID)).toBe(true);
  });

  // 5. Lost creates notification
  it('5. should create DEAL_LOST notification when a deal is closed lost', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEGOTIATION, 'Lost Deal');

    const res = await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: DealStage.LOST, reason: 'Competitor undercut price' });

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_LOST },
    });

    expect(notifs.some((n) => n.userId === USER_MANAGER_ID)).toBe(true);
  });

  // 6. Reopen creates notification
  it('6. should create DEAL_REOPENED notification when manager reopens a closed deal', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEGOTIATION, 'Reopen Deal');
    // Mark Won first
    await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: DealStage.WON });

    // Reopen as Manager
    const res = await request(app)
      .post(`/api/deals/${deal.id}/reopen`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.DEAL_REOPENED },
    });

    expect(notifs.some((n) => n.userId === USER_REP1_ID)).toBe(true);
    expect(notifs.some((n) => n.userId === USER_MANAGER_ID)).toBe(false); // Actor not notified
  });

  // 7. Note creates notification
  it('7. should create NOTE_ADDED notification when a note is added to a deal', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Note Deal');

    const res = await request(app)
      .post(`/api/deals/${deal.id}/notes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Important client meeting scheduled for next week.' });

    expect(res.status).toBe(201);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.NOTE_ADDED },
    });

    expect(notifs.some((n) => n.userId === USER_REP1_ID)).toBe(true);
  });

  // 8. Collaborator added creates correct notifications
  it('8. should create COLLABORATOR_ADDED notification including newly added collaborator', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Collab Add Deal');

    const res = await request(app)
      .post(`/api/deals/${deal.id}/collaborators`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ userId: USER_REP2_ID });

    expect(res.status).toBe(201);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.COLLABORATOR_ADDED },
    });

    const notifiedIds = notifs.map((n) => n.userId);
    expect(notifiedIds).toContain(USER_REP2_ID); // New collaborator gets notified!
    expect(notifiedIds).toContain(USER_MANAGER_ID); // Manager gets notified!
    expect(notifiedIds).not.toContain(USER_REP1_ID); // Actor doesn't get notified
  });

  // 9. Collaborator removed does not notify removed collaborator
  it('9. should NOT notify removed collaborator upon COLLABORATOR_REMOVED', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Collab Remove Deal');
    await prisma.dealCollaborator.create({
      data: { dealId: deal.id, userId: USER_REP2_ID },
    });

    const res = await request(app)
      .delete(`/api/deals/${deal.id}/collaborators/${USER_REP2_ID}`)
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.COLLABORATOR_REMOVED },
    });

    const notifiedIds = notifs.map((n) => n.userId);
    expect(notifiedIds).not.toContain(USER_REP2_ID); // Removed collaborator must NOT be notified!
    expect(notifiedIds).toContain(USER_MANAGER_ID); // Manager gets notified
  });

  // 10. Owner changed notifies new owner, current collaborators, and managers
  it('10. should notify new owner, collaborators, and managers upon OWNER_CHANGED', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Owner Changed Deal');
    await prisma.dealCollaborator.create({
      data: { dealId: deal.id, userId: USER_REP3_ID },
    });

    // Reassign as Manager to Rep 2
    const res = await request(app)
      .patch(`/api/deals/${deal.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ ownerId: USER_REP2_ID });

    expect(res.status).toBe(200);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, type: NotificationType.OWNER_CHANGED },
    });

    const notifiedIds = notifs.map((n) => n.userId);
    expect(notifiedIds).toContain(USER_REP2_ID); // New owner notified!
    expect(notifiedIds).toContain(USER_REP3_ID); // Collaborator notified!
    expect(notifiedIds).not.toContain(USER_MANAGER_ID); // Actor not notified
  });

  // 11. Bulk advance creates notifications ONLY for successful deals
  it('11. should create DEAL_STAGE_ADVANCED notifications only for deals that successfully advance in bulk advance', async () => {
    const deal1 = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Bulk Advance Success 1');
    const deal2 = await createTestDeal(USER_REP2_ID, DealStage.QUALIFIED, 'Bulk Advance Success 2');

    const res = await request(app)
      .post('/api/deals/bulk/advance')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ dealIds: [deal1.id, deal2.id] });

    expect(res.status).toBe(200);
    expect(res.body.summary.succeeded).toBe(2);

    const notifs1 = await prisma.notification.findMany({
      where: { dealId: deal1.id, type: NotificationType.DEAL_STAGE_ADVANCED },
    });
    expect(notifs1.some((n) => n.userId === USER_REP1_ID)).toBe(true);

    const notifs2 = await prisma.notification.findMany({
      where: { dealId: deal2.id, type: NotificationType.DEAL_STAGE_ADVANCED },
    });
    expect(notifs2.some((n) => n.userId === USER_REP2_ID)).toBe(true);
  });

  // 12. Negotiation bulk-advance failure creates no notification
  it('12. should NOT create any notification when a deal fails to advance in bulk advance (e.g. Negotiation)', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEGOTIATION, 'Bulk Advance Negotiation Blocked');

    const res = await request(app)
      .post('/api/deals/bulk/advance')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ dealIds: [deal.id] });

    expect(res.status).toBe(200);
    expect(res.body.summary.failed).toBe(1);

    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id },
    });
    expect(notifs.length).toBe(0);
  });

  // 13. Bulk reassignment creates OWNER_CHANGED notifications for successful deals
  it('13. should create OWNER_CHANGED notifications for each deal successfully reassigned in bulk', async () => {
    const deal1 = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Bulk Reassign 1');
    const deal2 = await createTestDeal(USER_REP3_ID, DealStage.NEW, 'Bulk Reassign 2');

    const res = await request(app)
      .post('/api/deals/bulk/reassign')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        dealIds: [deal1.id, deal2.id],
        ownerId: USER_REP2_ID,
      });

    expect(res.status).toBe(200);
    expect(res.body.summary.succeeded).toBe(2);

    const notifs1 = await prisma.notification.findMany({
      where: { dealId: deal1.id, type: NotificationType.OWNER_CHANGED },
    });
    expect(notifs1.some((n) => n.userId === USER_REP2_ID)).toBe(true);

    const notifs2 = await prisma.notification.findMany({
      where: { dealId: deal2.id, type: NotificationType.OWNER_CHANGED },
    });
    expect(notifs2.some((n) => n.userId === USER_REP2_ID)).toBe(true);
  });

  // 14. Unrelated Sales Rep cannot see another user's notifications
  it('14. should not allow an unrelated Sales Rep to see another user notifications', async () => {
    // Deal owned by Rep 1, action performed by Manager
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Private Notification Deal');
    await request(app)
      .post(`/api/deals/${deal.id}/notes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Confidential client note' });

    // Rep 1 checks notifications
    const resRep1 = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${rep1Token}`);
    expect(resRep1.status).toBe(200);
    expect(resRep1.body.data.some((n: any) => n.dealId === deal.id)).toBe(true);

    // Unrelated Rep 3 checks notifications
    const resRep3 = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${rep3Token}`);
    expect(resRep3.status).toBe(200);
    // Rep 3 must NOT see notification for deal they do not own or collaborate on
    expect(resRep3.body.data.some((n: any) => n.dealId === deal.id)).toBe(false);
  });

  // 15. IDOR protection for notification read endpoint
  it('15. should return 404 when trying to mark another user notification as read', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'IDOR Read Deal');
    await request(app)
      .post(`/api/deals/${deal.id}/notes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Note generating notif for Rep 1' });

    const rep1Notifs = await prisma.notification.findMany({
      where: { dealId: deal.id, userId: USER_REP1_ID },
    });
    expect(rep1Notifs.length).toBeGreaterThan(0);
    const notifId = rep1Notifs[0].id;

    // Rep 2 attempts to mark Rep 1's notification as read
    const res = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${rep2Token}`);

    expect(res.status).toBe(404);
  });

  // 16. Mark all as read only affects current user's notifications
  it('16. should only mark current user unread notifications as read upon POST /api/notifications/mark-all-read', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Mark All Read Deal');
    await prisma.dealCollaborator.create({
      data: { dealId: deal.id, userId: USER_REP2_ID },
    });

    // Manager adds note -> creates unread notification for Rep 1 AND Rep 2
    await request(app)
      .post(`/api/deals/${deal.id}/notes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Note for both Reps' });

    // Rep 1 marks all as read
    const res = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    // Verify Rep 1's notification is read
    const rep1Notif = await prisma.notification.findFirst({
      where: { dealId: deal.id, userId: USER_REP1_ID },
    });
    expect(rep1Notif?.readAt).not.toBeNull();

    // Verify Rep 2's notification remains UNREAD
    const rep2Notif = await prisma.notification.findFirst({
      where: { dealId: deal.id, userId: USER_REP2_ID },
    });
    expect(rep2Notif?.readAt).toBeNull();
  });

  // 17. Notification count correctly returns unread/total counts
  it('17. should accurately return unread and total activity notification counts', async () => {
    const res = await request(app)
      .get('/api/notifications/count')
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('unreadCount');
    expect(res.body.data).toHaveProperty('totalCount');
    expect(typeof res.body.data.unreadCount).toBe('number');
    expect(typeof res.body.data.totalCount).toBe('number');
    expect(res.body.data.unreadCount).toBeLessThanOrEqual(res.body.data.totalCount);
  });

  // 18. Notification list filters correctly support all/unread/read
  it('18. should filter notifications properly by status: all, unread, and read', async () => {
    const [resAll, resUnread, resRead] = await Promise.all([
      request(app).get('/api/notifications?status=all').set('Authorization', `Bearer ${rep1Token}`),
      request(app).get('/api/notifications?status=unread').set('Authorization', `Bearer ${rep1Token}`),
      request(app).get('/api/notifications?status=read').set('Authorization', `Bearer ${rep1Token}`),
    ]);

    expect(resAll.status).toBe(200);
    expect(resUnread.status).toBe(200);
    expect(resRead.status).toBe(200);

    // All read notifications should have readAt != null
    resRead.body.data.forEach((n: any) => {
      expect(n.readAt).not.toBeNull();
    });

    // All unread notifications should have readAt == null
    resUnread.body.data.forEach((n: any) => {
      expect(n.readAt).toBeNull();
    });
  });

  // 19. Notification creation failure does not weaken existing business transaction behavior
  it('19. should maintain transaction integrity: if deal mutation fails, no notification is persisted', async () => {
    const deal = await createTestDeal(USER_REP1_ID, DealStage.NEW, 'Transaction Rollback Deal');

    // Attempt illegal transition (skipping from NEW to PROPOSAL)
    const res = await request(app)
      .patch(`/api/deals/${deal.id}/stage`)
      .set('Authorization', `Bearer ${rep1Token}`)
      .send({ stage: DealStage.PROPOSAL });

    expect(res.status).toBe(400);

    // No notification should have been persisted
    const notifs = await prisma.notification.findMany({
      where: { dealId: deal.id },
    });
    expect(notifs.length).toBe(0);
  });

  // 20. Server-side pagination for activity notifications
  it('20. should support server-side pagination with limit and page and return pagination metadata', async () => {
    const res = await request(app)
      .get('/api/notifications?page=1&limit=5')
      .set('Authorization', `Bearer ${rep1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(typeof res.body.pagination.total).toBe('number');
    expect(typeof res.body.pagination.totalPages).toBe('number');
  });

  // 21. Lightweight notification bell retrieval
  it('21. should support lightweight recent notifications retrieval with limit=5 for bell preview', async () => {
    const res = await request(app)
      .get('/api/notifications?limit=5')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });
});
