import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage } from '@prisma/client';
import { dealTransitionPolicy } from '../modules/deals/deal.transition-policy';

describe('Phase 5: Deals & Lifecycle State Machine Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Seed Company UUIDs
  const COMPANIES = {
    acme:       '20000000-0000-4000-8000-000000000001', // Owner: Alex Rivera
    apex:       '20000000-0000-4000-8000-000000000002', // Owner: Priya Sharma
    stellar:    '20000000-0000-4000-8000-000000000003', // Owner: Marcus Chen
    zenith:     '20000000-0000-4000-8000-000000000004', // Owner: Alex Rivera
    horizon:    '20000000-0000-4000-8000-000000000005', // Owner: Priya Sharma
    vortex:     '20000000-0000-4000-8000-000000000006', // Owner: Marcus Chen
    beacon:     '20000000-0000-4000-8000-000000000007', // Owner: Alex Rivera
    legacyIron: '20000000-0000-4000-8000-000000000008', // Owner: Marcus Chen (Archived)
  };

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // Alex, NEW, Acme
    d2:  '30000000-0000-4000-8000-000000000002', // Priya, QUALIFIED, Apex
    d3:  '30000000-0000-4000-8000-000000000003', // Marcus, PROPOSAL, Stellar (Collabs: Alex & Priya)
    d4:  '30000000-0000-4000-8000-000000000004', // Alex, NEGOTIATION, Zenith (Collab: Priya)
    d5:  '30000000-0000-4000-8000-000000000005', // Priya, WON, Horizon (previousStage: NEGOTIATION)
    d6:  '30000000-0000-4000-8000-000000000006', // Marcus, LOST, Vortex (previousStage: NEGOTIATION)
    d7:  '30000000-0000-4000-8000-000000000007', // Alex, NEW, Beacon
    d8:  '30000000-0000-4000-8000-000000000008', // Priya, PROPOSAL, Apex (Collab: Marcus)
    d10: '30000000-0000-4000-8000-000000000010', // Priya, NEGOTIATION, Horizon (Collab: Alex)
    d11: '30000000-0000-4000-8000-000000000011', // Alex, WON, Zenith (previousStage: NEGOTIATION)
    d18: '30000000-0000-4000-8000-000000000018', // Priya, NEW, Apex (Soft-deleted)
  };

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

  const createdDealIds: string[] = [];

  const resetAllDeals = async () => {
    // Clean up any dynamically created test deals and their history
    if (createdDealIds.length > 0) {
      await prisma.dealHistory.deleteMany({
        where: { dealId: { in: createdDealIds } },
      });
      await prisma.dealCollaborator.deleteMany({
        where: { dealId: { in: createdDealIds } },
      });
      await prisma.deal.deleteMany({
        where: { id: { in: createdDealIds } },
      });
      createdDealIds.length = 0;
    }

    // Reset all modified seeded deal states
    await prisma.deal.update({
      where: { id: DEALS.d1 },
      data: {
        title: 'Global Supply ERP Rollout',
        stage: DealStage.NEW,
        value: '125000.00',
        closedAt: null,
        previousStage: null,
        deletedAt: null,
        deletedById: null,
        ownerId: USER_REP1_ID,
      },
    });

    await prisma.deal.update({
      where: { id: DEALS.d4 },
      data: {
        title: 'Hospital Management Core Suite',
        stage: DealStage.NEGOTIATION,
        value: '350000.00',
        closedAt: null,
        previousStage: null,
        deletedAt: null,
        deletedById: null,
        ownerId: USER_REP1_ID,
      },
    });

    await prisma.deal.update({
      where: { id: DEALS.d5 },
      data: {
        stage: DealStage.WON,
        closedAt: new Date('2026-08-20T16:00:00.000Z'),
        previousStage: DealStage.NEGOTIATION,
        deletedAt: null,
      },
    });

    await prisma.deal.update({
      where: { id: DEALS.d7 },
      data: {
        stage: DealStage.NEW,
        closedAt: null,
        previousStage: null,
        deletedAt: null,
      },
    });

    await prisma.deal.update({
      where: { id: DEALS.d11 },
      data: {
        stage: DealStage.WON,
        closedAt: new Date('2026-08-30T17:45:00.000Z'),
        previousStage: DealStage.NEGOTIATION,
        deletedAt: null,
      },
    });
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });
    rep3Token    = signToken({ sub: USER_REP3_ID });

    await resetAllDeals();
  });

  afterAll(async () => {
    await resetAllDeals();
  });

  // ==========================================================================
  // 1. Pure Unit Tests: DealTransitionPolicy State Machine
  // ==========================================================================
  describe('1. Pure State Machine: DealTransitionPolicy Unit Tests', () => {
    it('1. should allow legal 1-step forward transitions without a reason', () => {
      expect(dealTransitionPolicy.isTransitionLegal(DealStage.NEW, DealStage.QUALIFIED).legal).toBe(true);
      expect(dealTransitionPolicy.isTransitionLegal(DealStage.QUALIFIED, DealStage.PROPOSAL).legal).toBe(true);
      expect(dealTransitionPolicy.isTransitionLegal(DealStage.PROPOSAL, DealStage.NEGOTIATION).legal).toBe(true);
      expect(dealTransitionPolicy.isTransitionLegal(DealStage.NEGOTIATION, DealStage.WON).legal).toBe(true);
      expect(dealTransitionPolicy.isTransitionLegal(DealStage.NEGOTIATION, DealStage.LOST).legal).toBe(true);
    });

    it('2. should reject forward multi-step skipping', () => {
      const r1 = dealTransitionPolicy.isTransitionLegal(DealStage.NEW, DealStage.PROPOSAL);
      expect(r1.legal).toBe(false);
      expect(r1.error).toContain('Moves must be exactly one step');

      const r2 = dealTransitionPolicy.isTransitionLegal(DealStage.NEW, DealStage.WON);
      expect(r2.legal).toBe(false);

      const r3 = dealTransitionPolicy.isTransitionLegal(DealStage.QUALIFIED, DealStage.WON);
      expect(r3.legal).toBe(false);
    });

    it('3. should allow exactly 1-step backward transitions only when a non-empty reason is provided', () => {
      const valid = dealTransitionPolicy.isTransitionLegal(
        DealStage.QUALIFIED,
        DealStage.NEW,
        'Lead was premature'
      );
      expect(valid.legal).toBe(true);
      expect(valid.isClosing).toBe(false);

      const valid2 = dealTransitionPolicy.isTransitionLegal(
        DealStage.NEGOTIATION,
        DealStage.PROPOSAL,
        'Budget revised'
      );
      expect(valid2.legal).toBe(true);
    });

    it('4. should reject 1-step backward transitions without a reason', () => {
      const r1 = dealTransitionPolicy.isTransitionLegal(DealStage.QUALIFIED, DealStage.NEW);
      expect(r1.legal).toBe(false);
      expect(r1.error).toContain('reason is required');

      const r2 = dealTransitionPolicy.isTransitionLegal(DealStage.PROPOSAL, DealStage.QUALIFIED, '   ');
      expect(r2.legal).toBe(false);
      expect(r2.error).toContain('reason is required');
    });

    it('5. should reject backward multi-step jumps even if a reason is provided', () => {
      const r1 = dealTransitionPolicy.isTransitionLegal(
        DealStage.NEGOTIATION,
        DealStage.NEW,
        'Restarting deal completely'
      );
      expect(r1.legal).toBe(false);
      expect(r1.error).toContain('Moves must be exactly one step');
    });

    it('6. should reject any direct transition from a closed state (WON or LOST)', () => {
      const r1 = dealTransitionPolicy.isTransitionLegal(DealStage.WON, DealStage.NEGOTIATION);
      expect(r1.legal).toBe(false);
      expect(r1.error).toContain('Closed deals cannot be transitioned');

      const r2 = dealTransitionPolicy.isTransitionLegal(DealStage.LOST, DealStage.NEW);
      expect(r2.legal).toBe(false);
      expect(r2.error).toContain('Closed deals cannot be transitioned');
    });

    it('7. should validate manager reopen rules correctly', () => {
      const reopenWon = dealTransitionPolicy.canReopen(DealStage.WON, DealStage.NEGOTIATION);
      expect(reopenWon.legal).toBe(true);
      expect(reopenWon.targetStage).toBe(DealStage.NEGOTIATION);

      const reopenLost = dealTransitionPolicy.canReopen(DealStage.LOST, DealStage.PROPOSAL);
      expect(reopenLost.legal).toBe(true);
      expect(reopenLost.targetStage).toBe(DealStage.PROPOSAL);

      const reopenNoPrev = dealTransitionPolicy.canReopen(DealStage.WON, null);
      expect(reopenNoPrev.legal).toBe(false);
      expect(reopenNoPrev.error).toContain('no previous stage was recorded');

      const reopenActive = dealTransitionPolicy.canReopen(DealStage.NEGOTIATION, null);
      expect(reopenActive.legal).toBe(false);
      expect(reopenActive.error).toContain('Only closed deals');

      // Defensive hardening checks against corrupted / impossible previousStage states
      const reopenWonWithWon = dealTransitionPolicy.canReopen(DealStage.WON, DealStage.WON);
      expect(reopenWonWithWon.legal).toBe(false);
      expect(reopenWonWithWon.error).toContain('deal cannot be reopened into a closed stage');

      const reopenWonWithLost = dealTransitionPolicy.canReopen(DealStage.WON, DealStage.LOST);
      expect(reopenWonWithLost.legal).toBe(false);
      expect(reopenWonWithLost.error).toContain('deal cannot be reopened into a closed stage');

      const reopenLostWithLost = dealTransitionPolicy.canReopen(DealStage.LOST, DealStage.LOST);
      expect(reopenLostWithLost.legal).toBe(false);
      expect(reopenLostWithLost.error).toContain('deal cannot be reopened into a closed stage');
    });
  });

  // ==========================================================================
  // 2. Authentication Perimeter
  // ==========================================================================
  describe('2. Authentication Perimeter', () => {
    it('8. should reject unauthenticated GET /api/deals with 401', async () => {
      const res = await request(app).get('/api/deals');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('9. should reject unauthenticated GET /api/deals/trash with 401', async () => {
      const res = await request(app).get('/api/deals/trash');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('10. should reject unauthenticated POST /api/deals with 401', async () => {
      const res = await request(app)
        .post('/api/deals')
        .send({
          title: 'Unauth Deal',
          companyId: COMPANIES.acme,
          value: '1000.00',
          expectedCloseDate: '2026-12-31',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Deal Creation (POST /api/deals)
  // ==========================================================================
  describe('3. Deal Creation (POST /api/deals)', () => {
    it('11. should allow Sales Rep to create a deal on an active company and verify exact decimal and history', async () => {
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Autonomous Drone Fleet Pilot',
          companyId: COMPANIES.acme,
          value: '125000.50',
          expectedCloseDate: '2026-11-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        title: 'Autonomous Drone Fleet Pilot',
        companyId: COMPANIES.acme,
        ownerId: USER_REP1_ID,
        stage: DealStage.NEW,
        value: '125000.50',
        expectedCloseDate: '2026-11-30',
        stageProbability: 0.10,
        weightedValue: '12500.05', // Exact 125000.50 * 0.10
        closedAt: null,
        deletedAt: null,
      });

      const newId = res.body.data.id;
      createdDealIds.push(newId);

      // Verify DealHistory was atomically created with CREATED action
      const history = await prisma.dealHistory.findMany({
        where: { dealId: newId },
      });
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('CREATED');
      expect(history[0].actorId).toBe(USER_REP1_ID);
    });

    it('12. should reject Sales Rep attempting to assign deal to another user with 403', async () => {
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Unauthorized Delegated Deal',
          companyId: COMPANIES.acme,
          value: '50000.00',
          expectedCloseDate: '2026-12-01',
          ownerId: USER_REP2_ID,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot assign deals to other users');
    });

    it('13. should allow Manager to create a deal assigned to a team Sales Rep', async () => {
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Manager Assigned Venture Deal',
          companyId: COMPANIES.apex,
          value: '80000.00',
          expectedCloseDate: '2026-12-15',
          ownerId: USER_REP2_ID, // Priya
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(USER_REP2_ID);
      expect(res.body.data.owner.name).toBe('Priya Sharma');

      createdDealIds.push(res.body.data.id);
    });

    it('14. should reject deal creation on an archived company with 400', async () => {
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Deal on Archived Company',
          companyId: COMPANIES.legacyIron, // Archived in seed
          value: '50000.00',
          expectedCloseDate: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot create deals for archived companies');
    });

    it('15. should reject deal creation with zero or negative value with 400', async () => {
      const res1 = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Zero Deal',
          companyId: COMPANIES.acme,
          value: '0.00',
          expectedCloseDate: '2026-12-01',
        });
      expect(res1.status).toBe(400);
      expect(res1.body.message).toBe('Validation failed');

      const res2 = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Negative Deal',
          companyId: COMPANIES.acme,
          value: '-500.00',
          expectedCloseDate: '2026-12-01',
        });
      expect(res2.status).toBe(400);
    });

    it('16. should reject invalid calendar date format with 400', async () => {
      const res = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Bad Date Deal',
          companyId: COMPANIES.acme,
          value: '10000.00',
          expectedCloseDate: '2026/11/15', // Wrong format
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // ==========================================================================
  // 4. Server-Side Scoped Visibility (GET /api/deals & GET /api/deals/:id)
  // ==========================================================================
  describe('4. Server-Side Scoped Visibility (GET /api/deals & GET /api/deals/:id)', () => {
    it('17. should allow Manager to see all active non-deleted team deals', async () => {
      const res = await request(app)
        .get('/api/deals?limit=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const dealIds = res.body.data.map((d: any) => d.id);
      expect(dealIds).toContain(DEALS.d1);
      expect(dealIds).toContain(DEALS.d2);
      expect(dealIds).toContain(DEALS.d3);
      expect(dealIds).toContain(DEALS.d4);
      expect(dealIds).toContain(DEALS.d5);
      expect(dealIds).toContain(DEALS.d6);
      // Soft-deleted deal d18 must be excluded
      expect(dealIds).not.toContain(DEALS.d18);
    });

    it('18. should scope Sales Rep Alex to owned deals and collaborated deals only', async () => {
      const res = await request(app)
        .get('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      const dealIds = res.body.data.map((d: any) => d.id);

      // Alex owns d1, d4, d7, d11
      expect(dealIds).toContain(DEALS.d1);
      expect(dealIds).toContain(DEALS.d4);
      expect(dealIds).toContain(DEALS.d7);
      expect(dealIds).toContain(DEALS.d11);

      // Alex collaborates on d3 (owned by Marcus) and d10 (owned by Priya)
      expect(dealIds).toContain(DEALS.d3);
      expect(dealIds).toContain(DEALS.d10);

      // Alex does NOT own and does NOT collaborate on d2, d6, d8
      expect(dealIds).not.toContain(DEALS.d2);
      expect(dealIds).not.toContain(DEALS.d6);
      expect(dealIds).not.toContain(DEALS.d8);
    });

    it('19. should return 404 (IDOR Protection) when Sales Rep requests direct unassociated deal ID', async () => {
      // Alex requests d2 (Priya's deal, no collaboration)
      const res = await request(app)
        .get(`/api/deals/${DEALS.d2}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Deal not found');
    });

    it('20. should return 200 when Sales Rep requests direct ID of a deal they collaborate on', async () => {
      // Alex requests d3 (Marcus is owner, Alex is collaborator)
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(DEALS.d3);
      expect(res.body.data.owner.name).toBe('Marcus Chen');
      expect(res.body.data.collaborators.length).toBeGreaterThanOrEqual(1);
    });

    it('21. should filter deals by stage and calculate exact weightedValue', async () => {
      const res = await request(app)
        .get(`/api/deals?stage=${DealStage.NEGOTIATION}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      for (const d of res.body.data) {
        expect(d.stage).toBe(DealStage.NEGOTIATION);
        expect(d.stageProbability).toBe(0.75);
      }
    });

    it('22. should support pagination metadata for deals', async () => {
      const res = await request(app)
        .get('/api/deals?page=1&limit=3')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 3,
      });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(15);
    });
  });

  // ==========================================================================
  // 5. Deal Mutation & Collaborator Permissions (PATCH /api/deals/:id)
  // ==========================================================================
  describe('5. Deal Mutation & Collaborator Permissions (PATCH /api/deals/:id)', () => {
    it('23. should allow Deal Owner to update deal details', async () => {
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d1}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Global Supply ERP Enterprise Rollout',
          value: '135000.00',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Global Supply ERP Enterprise Rollout');
      expect(res.body.data.value).toBe('135000.00');
    });

    it('24. [CRITICAL REGRESSION] should allow Collaborator to update a deal', async () => {
      // Deal 4 is owned by Alex. Priya is a collaborator on Deal 4.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d4}`)
        .set('Authorization', `Bearer ${rep2Token}`) // Priya
        .send({
          title: 'Hospital Management Core Suite - Updated by Priya',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Hospital Management Core Suite - Updated by Priya');
    });

    it('25. [CRITICAL REGRESSION] should reject Collaborator attempting to reassign deal owner with 403', async () => {
      // Priya is a collaborator on Deal 4. Priya tries to reassign ownership.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d4}`)
        .set('Authorization', `Bearer ${rep2Token}`) // Priya
        .send({
          ownerId: USER_REP2_ID,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only managers can reassign deal ownership');
    });

    it('26. should reject Sales Rep attempting to edit an unassociated deal with 403', async () => {
      // Alex attempts to edit d2 (owned by Priya, no collab)
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d2}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ title: 'Hacked Deal' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission to edit this deal');
    });

    it('27. should allow Manager to reassign deal owner to another team Sales Rep and record history', async () => {
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          ownerId: USER_REP3_ID, // Marcus
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(USER_REP3_ID);
      expect(res.body.data.owner.name).toBe('Marcus Chen');

      // Verify DealHistory contains OWNER_CHANGED
      const history = await prisma.dealHistory.findFirst({
        where: {
          dealId: DEALS.d1,
          type: 'OWNER_CHANGED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(history).toBeDefined();
      expect(history?.actorId).toBe(USER_MANAGER_ID);

      // Reassign back to Alex
      await request(app)
        .patch(`/api/deals/${DEALS.d1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP1_ID });
    });
  });

  // ==========================================================================
  // 6. Stage Lifecycle Transitions (PATCH /api/deals/:id/stage)
  // ==========================================================================
  describe('6. Stage Lifecycle Transitions (PATCH /api/deals/:id/stage)', () => {
    it('28. should allow Owner to advance deal forward 1 step (NEW -> QUALIFIED)', async () => {
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d1}/stage`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ stage: DealStage.QUALIFIED });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe(DealStage.QUALIFIED);
      expect(res.body.data.stageProbability).toBe(0.25);
    });

    it('29. [CRITICAL REGRESSION] should allow Collaborator to transition deal stage', async () => {
      // Deal 4 is currently NEGOTIATION. Priya is a collaborator.
      // Priya transitions Deal 4 forward to WON.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d4}/stage`)
        .set('Authorization', `Bearer ${rep2Token}`) // Priya
        .send({ stage: DealStage.WON });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe(DealStage.WON);
      expect(res.body.data.stageProbability).toBe(1.00);
      expect(res.body.data.closedAt).not.toBeNull();
      expect(res.body.data.previousStage).toBe(DealStage.NEGOTIATION);
    });

    it('30. should reject multi-step forward skip with 400', async () => {
      // d7 is currently NEW. Attempting to jump directly to WON.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d7}/stage`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ stage: DealStage.WON });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Moves must be exactly one step');
    });

    it('31. should reject 1-step backward transition without a reason with 400', async () => {
      // d1 is now QUALIFIED. Transitioning back to NEW without reason.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d1}/stage`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ stage: DealStage.NEW });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('reason is required');
    });

    it('32. should allow 1-step backward transition when a valid reason is provided', async () => {
      // d1 is QUALIFIED. Move back to NEW with reason.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d1}/stage`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          stage: DealStage.NEW,
          reason: 'Client requested postponement of qualification',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe(DealStage.NEW);

      // Verify DealHistory records STAGE_CHANGED with reason
      const history = await prisma.dealHistory.findFirst({
        where: { dealId: DEALS.d1, type: 'STAGE_CHANGED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(history?.reason).toBe('Client requested postponement of qualification');
    });

    it('33. should reject direct stage modification of a closed deal with 400', async () => {
      // d5 is WON. Attempting to change to LOST or QUALIFIED directly.
      const res = await request(app)
        .patch(`/api/deals/${DEALS.d5}/stage`)
        .set('Authorization', `Bearer ${rep2Token}`)
        .send({ stage: DealStage.LOST });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Closed deals cannot be transitioned');
    });
  });

  // ==========================================================================
  // 7. Manager Reopen (POST /api/deals/:id/reopen)
  // ==========================================================================
  describe('7. Manager Reopen (POST /api/deals/:id/reopen)', () => {
    it('34. should reject Sales Rep attempting to reopen a closed deal with 403', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d5}/reopen`)
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only managers can reopen closed deals');
    });

    it('35. should allow Manager to reopen a closed deal back to its previousStage', async () => {
      // d11 is WON with previousStage = NEGOTIATION
      const res = await request(app)
        .post(`/api/deals/${DEALS.d11}/reopen`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe(DealStage.NEGOTIATION);
      expect(res.body.data.closedAt).toBeNull();
      // previousStage remains the pre-close stage
      expect(res.body.data.previousStage).toBe(DealStage.NEGOTIATION);

      // Verify DealHistory records REOPENED action
      const history = await prisma.dealHistory.findFirst({
        where: { dealId: DEALS.d11, type: 'REOPENED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(history?.actorId).toBe(USER_MANAGER_ID);
    });

    it('36. should reject reopening an active non-closed deal with 400', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEALS.d1}/reopen`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only closed deals');
    });
  });

  // ==========================================================================
  // 8. Soft Deletion & Trash Visibility
  // ==========================================================================
  describe('8. Soft Deletion & Trash Visibility', () => {
    it('37. should allow Deal Owner to soft-delete a deal and record DELETED in history', async () => {
      // Create a temporary deal for deletion
      const createRes = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          title: 'Deal to be soft-deleted',
          companyId: COMPANIES.acme,
          value: '30000.00',
          expectedCloseDate: '2026-11-20',
        });
      const tempId = createRes.body.data.id;
      createdDealIds.push(tempId);

      const deleteRes = await request(app)
        .delete(`/api/deals/${tempId}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.deletedAt).not.toBeNull();
      expect(deleteRes.body.data.deletedById).toBe(USER_REP1_ID);

      // Verify excluded from normal list
      const listRes = await request(app)
        .get('/api/deals')
        .set('Authorization', `Bearer ${rep1Token}`);
      const ids = listRes.body.data.map((d: any) => d.id);
      expect(ids).not.toContain(tempId);

      // Verify appears in trash list for Alex
      const trashRes = await request(app)
        .get('/api/deals/trash')
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(trashRes.status).toBe(200);
      const trashIds = trashRes.body.data.map((d: any) => d.id);
      expect(trashIds).toContain(tempId);
    });

    it('38. should reject collaborator attempting to delete deal with 403', async () => {
      // Priya is a collaborator on d4 (owned by Alex)
      const res = await request(app)
        .delete(`/api/deals/${DEALS.d4}`)
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission to delete this deal');
    });

    it('39. should allow Manager to see all team soft-deleted deals in GET /api/deals/trash', async () => {
      const res = await request(app)
        .get('/api/deals/trash')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const trashIds = res.body.data.map((d: any) => d.id);
      // d18 is soft-deleted in seed
      expect(trashIds).toContain(DEALS.d18);
    });

    it('40. should scope Trash view for Sales Reps based on ownership and collaboration', async () => {
      // d18 is owned by Priya (Rep 2) and has NO collaborators.
      // Priya sees d18 in trash
      const priyaTrash = await request(app)
        .get('/api/deals/trash')
        .set('Authorization', `Bearer ${rep2Token}`);
      expect(priyaTrash.body.data.map((d: any) => d.id)).toContain(DEALS.d18);

      // Alex does NOT see d18 in trash
      const alexTrash = await request(app)
        .get('/api/deals/trash')
        .set('Authorization', `Bearer ${rep1Token}`);
      expect(alexTrash.body.data.map((d: any) => d.id)).not.toContain(DEALS.d18);
    });
  });

  // ==========================================================================
  // 9. Response Safety & Security
  // ==========================================================================
  describe('9. Response Safety & Security', () => {
    it('41. should never expose passwordHash in deal owner or collaborator responses', async () => {
      const res = await request(app)
        .get(`/api/deals/${DEALS.d3}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.owner.passwordHash).toBeUndefined();
      for (const c of res.body.data.collaborators) {
        expect(c.user.passwordHash).toBeUndefined();
      }
      expect(JSON.stringify(res.body)).not.toContain('$2a$');
      expect(JSON.stringify(res.body)).not.toContain('$2b$');
    });
  });
});
