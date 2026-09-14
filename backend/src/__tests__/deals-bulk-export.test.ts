import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage, HistoryType } from '@prisma/client';

describe('Phase 7: Bulk Operations & Pipeline CSV Export Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // NEW, Owner: Alex (Acme)
    d2:  '30000000-0000-4000-8000-000000000002', // QUALIFIED, Owner: Alex (Beacon)
    d3:  '30000000-0000-4000-8000-000000000003', // PROPOSAL, Owner: Marcus (Stellar)
    d4:  '30000000-0000-4000-8000-000000000004', // NEGOTIATION, Owner: Alex (Zenith)
    d5:  '30000000-0000-4000-8000-000000000005', // WON, Owner: Priya (Apex)
    d6:  '30000000-0000-4000-8000-000000000006', // LOST, Owner: Priya (Apex)
    d7:  '30000000-0000-4000-8000-000000000007', // NEW, Owner: Priya (Horizon)
    d8:  '30000000-0000-4000-8000-000000000008', // PROPOSAL, Owner: Priya (Horizon)
    d9:  '30000000-0000-4000-8000-000000000009', // QUALIFIED, Owner: Marcus (Stellar)
    d10: '30000000-0000-4000-8000-000000000010', // NEGOTIATION, Owner: Alex (Horizon)
    d18_softDeleted: '30000000-0000-4000-8000-000000000018', // Soft-deleted deal
  };

  const NON_EXISTENT_ID = '99999999-9999-4000-8000-999999999999';

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya

  const seededCollaborators = [
    { dealId: DEALS.d3, userId: USER_REP1_ID },
    { dealId: DEALS.d3, userId: USER_REP2_ID },
    { dealId: DEALS.d4, userId: USER_REP2_ID },
    { dealId: DEALS.d8, userId: USER_REP3_ID },
    { dealId: DEALS.d10, userId: USER_REP1_ID },
  ];

  const resetDeals = async () => {
    await prisma.$transaction([
      prisma.deal.update({
        where: { id: DEALS.d1 },
        data: { stage: DealStage.NEW, ownerId: USER_REP1_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d2 },
        data: { stage: DealStage.QUALIFIED, ownerId: USER_REP2_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d3 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP3_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d4 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP1_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d5 },
        data: { stage: DealStage.WON, ownerId: USER_REP2_ID, closedAt: new Date('2026-08-20T16:00:00.000Z'), deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d6 },
        data: { stage: DealStage.LOST, ownerId: USER_REP3_ID, closedAt: new Date('2026-08-25T14:30:00.000Z'), deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d7 },
        data: { stage: DealStage.NEW, ownerId: USER_REP1_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d8 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP2_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d9 },
        data: { stage: DealStage.QUALIFIED, ownerId: USER_REP3_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d10 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP2_ID, closedAt: null, previousStage: null, deletedAt: null },
      }),
    ]);

    for (const c of seededCollaborators) {
      await prisma.dealCollaborator.upsert({
        where: { dealId_userId: { dealId: c.dealId, userId: c.userId } },
        create: c,
        update: {},
      });
    }
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });

    await resetDeals();
  }, 30000);

  afterAll(async () => {
    await resetDeals();
  }, 30000);

  beforeEach(async () => {
    await resetDeals();
  });

  // ==========================================================================
  // 1. Bulk Reassign (POST /api/deals/bulk/reassign)
  // ==========================================================================
  describe('1. Manager Bulk Reassign (POST /api/deals/bulk/reassign)', () => {
    it('1. should allow Manager to bulk reassign multiple valid deals and append OWNER_CHANGED history', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1, DEALS.d7], // Currently owned by Alex (REP1)
          ownerId: USER_REP2_ID,        // Reassign to Priya (REP2)
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toEqual({
        requested: 2,
        succeeded: 2,
        failed: 0,
      });
      expect(res.body.results).toEqual([
        { dealId: DEALS.d1, status: 'success' },
        { dealId: DEALS.d7, status: 'success' },
      ]);

      // Verify deals updated in database
      const deal1 = await prisma.deal.findUnique({ where: { id: DEALS.d1 } });
      const deal7 = await prisma.deal.findUnique({ where: { id: DEALS.d7 } });
      expect(deal1?.ownerId).toBe(USER_REP2_ID);
      expect(deal7?.ownerId).toBe(USER_REP2_ID);

      // Verify immutable OWNER_CHANGED history created
      const history1 = await prisma.dealHistory.findMany({
        where: { dealId: DEALS.d1, type: HistoryType.OWNER_CHANGED },
        orderBy: { createdAt: 'desc' },
      });
      expect(history1.length).toBeGreaterThanOrEqual(1);
      expect(history1[0].actorId).toBe(USER_MANAGER_ID);
      expect(history1[0].oldOwnerId).toBe(USER_REP1_ID);
      expect(history1[0].newOwnerId).toBe(USER_REP2_ID);
    });

    it('2. should automatically remove new owner from collaborators while preserving other collaborators on bulk reassign', async () => {
      // Deal d3 is owned by Marcus (REP3) and has Alex & Priya as collaborators
      const collaboratorsBefore = await prisma.dealCollaborator.findMany({
        where: { dealId: DEALS.d3 },
      });
      expect(collaboratorsBefore.length).toBe(2);

      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d3],
          ownerId: USER_REP1_ID, // Reassign to Alex (who was a collaborator)
        });

      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('success');

      // Alex is now the owner and automatically removed from collaborators; Priya remains
      const collaboratorsAfter = await prisma.dealCollaborator.findMany({
        where: { dealId: DEALS.d3 },
      });
      expect(collaboratorsAfter.length).toBe(1);
      expect(collaboratorsAfter[0].userId).toBe(USER_REP2_ID);
    });

    it('3. should reject Sales Rep attempting to bulk reassign with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          dealIds: [DEALS.d1],
          ownerId: USER_REP2_ID,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only managers can perform bulk deal reassignment');
    });

    it('4. should reject bulk reassign with non-existent owner ID with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1],
          ownerId: NON_EXISTENT_ID,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Target owner does not exist');
    });

    it('5. should reject assigning deals to a Manager with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1],
          ownerId: USER_MANAGER_ID, // Target is Manager
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Deals can only be assigned to Sales Reps');
    });

    it('6. should reject empty dealIds array or duplicate IDs with 400 Bad Request', async () => {
      const resEmpty = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [],
          ownerId: USER_REP2_ID,
        });

      expect(resEmpty.status).toBe(400);

      const resDuplicate = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1, DEALS.d1],
          ownerId: USER_REP2_ID,
        });

      expect(resDuplicate.status).toBe(400);
      expect(resDuplicate.body.success).toBe(false);
      expect(JSON.stringify(resDuplicate.body)).toContain('Duplicate deal IDs');
    });

    it('7. should return partial success for mixed valid, non-existent, soft-deleted, and already-assigned deals', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/reassign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [
            DEALS.d1,                 // Valid (owned by Alex -> becomes Priya)
            NON_EXISTENT_ID,          // Non-existent deal -> DEAL_NOT_FOUND
            DEALS.d18_softDeleted,    // Soft-deleted deal -> DEAL_DELETED
            DEALS.d8,                 // Already owned by Priya -> ALREADY_ASSIGNED
          ],
          ownerId: USER_REP2_ID, // Priya
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toEqual({
        requested: 4,
        succeeded: 1,
        failed: 3,
      });

      expect(res.body.results).toEqual([
        { dealId: DEALS.d1, status: 'success' },
        { dealId: NON_EXISTENT_ID, status: 'failed', reason: 'DEAL_NOT_FOUND', message: 'Deal was not found.' },
        { dealId: DEALS.d18_softDeleted, status: 'failed', reason: 'DEAL_DELETED', message: 'Cannot reassign a soft-deleted deal.' },
        { dealId: DEALS.d8, status: 'failed', reason: 'ALREADY_ASSIGNED', message: 'Deal is already assigned to this sales rep.' },
      ]);

      // Confirm valid deal d1 succeeded despite other deal failures in the batch
      const deal1 = await prisma.deal.findUnique({ where: { id: DEALS.d1 } });
      expect(deal1?.ownerId).toBe(USER_REP2_ID);
    });
  });

  // ==========================================================================
  // 2. Bulk Advance (POST /api/deals/bulk/advance)
  // ==========================================================================
  describe('2. Manager Bulk Advance (POST /api/deals/bulk/advance)', () => {
    it('1. should allow Manager to bulk advance valid open deals forward one stage and record history', async () => {
      // d1 is NEW -> should become QUALIFIED
      // d2 is QUALIFIED -> should become PROPOSAL
      // d3 is PROPOSAL -> should become NEGOTIATION
      const res = await request(app)
        .post('/api/deals/bulk/advance')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1, DEALS.d2, DEALS.d3],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toEqual({
        requested: 3,
        succeeded: 3,
        failed: 0,
      });

      // Verify stages advanced
      const deal1 = await prisma.deal.findUnique({ where: { id: DEALS.d1 } });
      const deal2 = await prisma.deal.findUnique({ where: { id: DEALS.d2 } });
      const deal3 = await prisma.deal.findUnique({ where: { id: DEALS.d3 } });

      expect(deal1?.stage).toBe(DealStage.QUALIFIED);
      expect(deal2?.stage).toBe(DealStage.PROPOSAL);
      expect(deal3?.stage).toBe(DealStage.NEGOTIATION);

      // Verify STAGE_CHANGED history created
      const history1 = await prisma.dealHistory.findMany({
        where: { dealId: DEALS.d1, type: HistoryType.STAGE_CHANGED },
        orderBy: { createdAt: 'desc' },
      });
      expect(history1[0].oldStage).toBe(DealStage.NEW);
      expect(history1[0].newStage).toBe(DealStage.QUALIFIED);
    });

    it('2. should reject Sales Rep attempting to bulk advance with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/advance')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          dealIds: [DEALS.d1],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only managers can perform bulk deal stage advancement');
    });

    it('3. should return TRANSITION_REQUIRES_TARGET for NEGOTIATION deals without guessing WON/LOST', async () => {
      // Deal d4 is in NEGOTIATION stage
      const res = await request(app)
        .post('/api/deals/bulk/advance')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d4],
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toEqual({
        requested: 1,
        succeeded: 0,
        failed: 1,
      });
      expect(res.body.results[0]).toEqual({
        dealId: DEALS.d4,
        status: 'failed',
        reason: 'TRANSITION_REQUIRES_TARGET',
        message: 'Advancing from NEGOTIATION requires an explicit target stage (WON or LOST).',
      });

      // Stage must remain NEGOTIATION
      const deal4 = await prisma.deal.findUnique({ where: { id: DEALS.d4 } });
      expect(deal4?.stage).toBe(DealStage.NEGOTIATION);
    });

    it('4. should return partial success for mixed valid, NEGOTIATION, closed, deleted, and non-existent deals', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/advance')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [
            DEALS.d1,                 // Valid NEW -> QUALIFIED (succeeds)
            DEALS.d4,                 // In NEGOTIATION -> TRANSITION_REQUIRES_TARGET
            DEALS.d5,                 // WON -> DEAL_CLOSED
            DEALS.d6,                 // LOST -> DEAL_CLOSED
            DEALS.d18_softDeleted,    // Soft-deleted -> DEAL_DELETED
            NON_EXISTENT_ID,          // Non-existent -> DEAL_NOT_FOUND
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toEqual({
        requested: 6,
        succeeded: 1,
        failed: 5,
      });

      expect(res.body.results).toEqual([
        { dealId: DEALS.d1, status: 'success' },
        { dealId: DEALS.d4, status: 'failed', reason: 'TRANSITION_REQUIRES_TARGET', message: 'Advancing from NEGOTIATION requires an explicit target stage (WON or LOST).' },
        { dealId: DEALS.d5, status: 'failed', reason: 'DEAL_CLOSED', message: 'Closed deals cannot be transitioned.' },
        { dealId: DEALS.d6, status: 'failed', reason: 'DEAL_CLOSED', message: 'Closed deals cannot be transitioned.' },
        { dealId: DEALS.d18_softDeleted, status: 'failed', reason: 'DEAL_DELETED', message: 'Cannot advance a soft-deleted deal.' },
        { dealId: NON_EXISTENT_ID, status: 'failed', reason: 'DEAL_NOT_FOUND', message: 'Deal was not found.' },
      ]);

      // Confirm deal d1 successfully advanced
      const deal1 = await prisma.deal.findUnique({ where: { id: DEALS.d1 } });
      expect(deal1?.stage).toBe(DealStage.QUALIFIED);
    });

    it('5. should reject duplicate deal IDs in bulk advance with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/deals/bulk/advance')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dealIds: [DEALS.d1, DEALS.d1],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Duplicate deal IDs');
    });
  });

  // ==========================================================================
  // 3. Pipeline CSV Export (GET /api/deals/export)
  // ==========================================================================
  describe('3. Pipeline CSV Export (GET /api/deals/export)', () => {
    it('1. should allow Manager to export CSV with all active open team deals and exact headers', async () => {
      const res = await request(app)
        .get('/api/deals/export')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="deals.csv"');

      const csv = res.text;
      const lines = csv.trim().split(/\r?\n/);

      // Verify header row
      expect(lines[0]).toBe('Company,Stage,Value,Weighted Value');

      // All open deals in team must appear; closed deals (d5 WON, d6 LOST) and soft-deleted (d18) must NOT appear
      expect(csv).not.toContain('WON');
      expect(csv).not.toContain('LOST');

      // Verify line structure and formatting
      expect(lines.length).toBeGreaterThan(5); // Multiple open seeded deals
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        expect(parts.length).toBeGreaterThanOrEqual(4);
        const stage = parts[parts.length - 3];
        const value = parts[parts.length - 2];
        const weightedValue = parts[parts.length - 1];

        expect(['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION']).toContain(stage);
        expect(value).toMatch(/^\d+\.\d{2}$/);
        expect(weightedValue).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it('2. should scope Sales Rep CSV export to owned and collaborated open deals only', async () => {
      // Alex (REP1) owns d1, d2, d4, d10 and collaborates on d3
      // Priya (REP2) owns d7, d8 and collaborates on d3, d4
      const resPriya = await request(app)
        .get('/api/deals/export')
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(resPriya.status).toBe(200);
      const csvPriya = resPriya.text;

      // Priya sees Apex (d2, d8), Stellar (d3 - collab), Zenith (d4 - collab), Beacon (d16)
      // Priya must NOT see Acme (d1) or Vortex (d9, d17) which are owned by other reps with no collab from Priya
      expect(csvPriya).toContain('Apex Global Logistics');
      expect(csvPriya).toContain('Stellar Cloud Systems');
      expect(csvPriya).toContain('Zenith Healthcare Solutions');
      expect(csvPriya).not.toContain('Acme Corp');
      expect(csvPriya).not.toContain('Vortex Financial Technologies');
    });

    it('3. should correctly escape CSV fields containing commas or quotes', async () => {
      // Create a test deal on a company with a comma in its name
      const companyWithComma = await prisma.company.create({
        data: {
          name: 'Global Exports, LLC',
          industry: 'Logistics',
          teamId: '00000000-0000-4000-8000-000000000002',
          ownerId: USER_REP1_ID,
        },
      });

      const testDeal = await prisma.deal.create({
        data: {
          title: 'Comma Test Deal',
          companyId: companyWithComma.id,
          teamId: '00000000-0000-4000-8000-000000000002',
          ownerId: USER_REP1_ID,
          value: '10000.00',
          expectedCloseDate: new Date('2026-12-31'),
          stage: DealStage.NEW,
        },
      });

      const res = await request(app)
        .get('/api/deals/export')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('"Global Exports, LLC",NEW,10000.00,1000.00');

      // Cleanup
      await prisma.deal.delete({ where: { id: testDeal.id } });
      await prisma.company.delete({ where: { id: companyWithComma.id } });
    });

    it('4. should reject unauthenticated CSV export request with 401', async () => {
      const res = await request(app).get('/api/deals/export');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
