import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage } from '@prisma/client';
import { dashboardRepository } from '../modules/dashboard/dashboard.repository';

describe('Phase 9: Dashboard Pipeline Metrics & Analytics Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  const TEAM_ID         = '00000000-0000-4000-8000-000000000002';
  const COMPANY_ACME    = '20000000-0000-4000-8000-000000000001';

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // "Global Supply ERP Rollout", Acme (Alex), NEW, 125000.00
    d2:  '30000000-0000-4000-8000-000000000002', // "Fleet Tracking System Upgrade", Apex (Priya), QUALIFIED, 84000.00
    d3:  '30000000-0000-4000-8000-000000000003', // "Multi-Cloud Migration Advisory", Stellar (Marcus, Collabs: Alex, Priya), PROPOSAL, 240000.00
    d4:  '30000000-0000-4000-8000-000000000004', // "Hospital Management Core Suite", Zenith (Alex, Collab: Priya), NEGOTIATION, 350000.00
    d5:  '30000000-0000-4000-8000-000000000005', // "Omnichannel POS Integration", Horizon (Priya), WON, 195000.00, closedAt: 2026-08-20
    d6:  '30000000-0000-4000-8000-000000000006', // "Payment Gateway Microservices", Vortex (Marcus), LOST, 160000.00, closedAt: 2026-07-15
    d7:  '30000000-0000-4000-8000-000000000007', // "Smart Grid Analytics Pilot", Beacon (Alex), NEW, 95000.00
    d8:  '30000000-0000-4000-8000-000000000008', // "Warehouse Automation Sensor Mesh", Apex (Priya, Collab: Marcus), PROPOSAL, 145000.00
    d9:  '30000000-0000-4000-8000-000000000009', // "Cybersecurity Compliance Audit", Vortex (Marcus), QUALIFIED, 68000.00
    d10: '30000000-0000-4000-8000-000000000010', // "E-Commerce Recommendation Engine", Horizon (Priya, Collab: Alex), NEGOTIATION, 110000.00
    d11: '30000000-0000-4000-8000-000000000011', // "Electronic Health Records Portal", Zenith (Alex), WON, 280000.00, closedAt: 2026-08-30
    d12: '30000000-0000-4000-8000-000000000012', // "Plant Safety Telemetry", Acme (Alex), LOST, 52000.00, closedAt: 2026-08-05
    d13: '30000000-0000-4000-8000-000000000013', // "Reopened Enterprise Cloud Expansion", Stellar (Marcus, Collab: Alex), NEGOTIATION, 310000.00
    d14: '30000000-0000-4000-8000-000000000014', // "Overdue Live Deal - Stalled Negotiation", Acme (Alex), NEGOTIATION, 75000.00
    d15: '30000000-0000-4000-8000-000000000015', // "Overdue Deal with Dismissed Alert", Beacon (Alex), PROPOSAL, 88000.00
    d16: '30000000-0000-4000-8000-000000000016', // "Backup Power Infrastructure", Beacon (Priya), QUALIFIED, 130000.00
    d17: '30000000-0000-4000-8000-000000000017', // "Automated Reconciliation Engine", Vortex (Marcus), PROPOSAL, 215000.00
    d18_softDeleted: '30000000-0000-4000-8000-000000000018', // Soft-deleted deal (Priya), NEW, 45000.00
  };

  const ALL_SEEDED_DEAL_IDS = Object.values(DEALS);

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya

  const seededCollaborators = [
    { dealId: DEALS.d3, userId: USER_REP1_ID },
    { dealId: DEALS.d3, userId: USER_REP2_ID },
    { dealId: DEALS.d4, userId: USER_REP2_ID },
    { dealId: DEALS.d8, userId: USER_REP3_ID },
    { dealId: DEALS.d10, userId: USER_REP1_ID },
    { dealId: DEALS.d13, userId: USER_REP1_ID },
  ];

  const resetDeals = async () => {
    await prisma.$transaction([
      prisma.dealHistory.deleteMany({
        where: {
          OR: [
            { dealId: { notIn: ALL_SEEDED_DEAL_IDS } },
            { createdAt: { gte: new Date('2026-09-10T00:00:00.000Z') } },
          ],
        },
      }),
      prisma.dealCollaborator.deleteMany({
        where: { dealId: { notIn: ALL_SEEDED_DEAL_IDS } },
      }),
      prisma.deal.deleteMany({
        where: { id: { notIn: ALL_SEEDED_DEAL_IDS } },
      }),
      // Restore stages, owners, and closedAt for all seed deals
      prisma.deal.update({
        where: { id: DEALS.d1 },
        data: { stage: DealStage.NEW, ownerId: USER_REP1_ID, value: '125000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d2 },
        data: { stage: DealStage.QUALIFIED, ownerId: USER_REP2_ID, value: '84000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d3 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP3_ID, value: '240000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d4 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP1_ID, value: '350000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d5 },
        data: { stage: DealStage.WON, ownerId: USER_REP2_ID, value: '195000.00', closedAt: new Date('2026-08-20T16:00:00.000Z'), previousStage: DealStage.NEGOTIATION, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d6 },
        data: { stage: DealStage.LOST, ownerId: USER_REP3_ID, value: '160000.00', closedAt: new Date('2026-07-15T11:30:00.000Z'), previousStage: DealStage.NEGOTIATION, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d7 },
        data: { stage: DealStage.NEW, ownerId: USER_REP1_ID, value: '95000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d8 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP2_ID, value: '145000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d9 },
        data: { stage: DealStage.QUALIFIED, ownerId: USER_REP3_ID, value: '68000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d10 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP2_ID, value: '110000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d11 },
        data: { stage: DealStage.WON, ownerId: USER_REP1_ID, value: '280000.00', closedAt: new Date('2026-08-30T10:00:00.000Z'), previousStage: DealStage.NEGOTIATION, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d12 },
        data: { stage: DealStage.LOST, ownerId: USER_REP1_ID, value: '52000.00', closedAt: new Date('2026-08-05T14:00:00.000Z'), previousStage: DealStage.PROPOSAL, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d13 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP3_ID, value: '310000.00', closedAt: null, previousStage: DealStage.NEGOTIATION, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d14 },
        data: { stage: DealStage.NEGOTIATION, ownerId: USER_REP1_ID, value: '75000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d15 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP1_ID, value: '88000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d16 },
        data: { stage: DealStage.QUALIFIED, ownerId: USER_REP2_ID, value: '130000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d17 },
        data: { stage: DealStage.PROPOSAL, ownerId: USER_REP3_ID, value: '215000.00', closedAt: null, previousStage: null, deletedAt: null },
      }),
      prisma.deal.update({
        where: { id: DEALS.d18_softDeleted },
        data: { stage: DealStage.NEW, ownerId: USER_REP2_ID, value: '45000.00', closedAt: null, deletedAt: new Date('2026-09-08T10:00:00.000Z') },
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

  // ==========================================================================
  // 1. Authentication & Scoped Visibility
  // ==========================================================================
  describe('1. Authentication & Scoped Visibility', () => {
    it('1. should reject unauthenticated GET /api/dashboard with 401', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. should return complete dashboard metrics for Manager across entire team', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;

      // 13 active open deals in team (18 total - 2 WON - 2 LOST - 1 soft-deleted = 13)
      expect(data.openDeals).toBe(13);

      // Verify stage breakdown sums to total open deals
      const stageSum = data.openDealsByStage.reduce((acc: number, s: any) => acc + s.count, 0);
      expect(stageSum).toBe(13);

      // Verify owner breakdown sums to total open deals
      const ownerSum = data.openDealsByOwner.reduce((acc: number, o: any) => acc + o.count, 0);
      expect(ownerSum).toBe(13);

      // Verify exact Decimal string format
      expect(data.weightedPipeline).toMatch(/^\d+\.\d{2}$/);
    });

    it('3. should scope Sales Rep dashboard strictly to owned and collaborated deals', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;

      // Alex owns 5 open deals (d1, d4, d7, d14, d15) + collaborates on 3 open deals (d3, d10, d13) = 8 open deals
      expect(data.openDeals).toBe(8);

      // Verify stage breakdown sums to 8
      const stageSum = data.openDealsByStage.reduce((acc: number, s: any) => acc + s.count, 0);
      expect(stageSum).toBe(8);

      // Verify owner breakdown sums to 8
      const ownerSum = data.openDealsByOwner.reduce((acc: number, o: any) => acc + o.count, 0);
      expect(ownerSum).toBe(8);

      // Alex should only see owners of visible open deals (Alex, Marcus, Priya)
      const visibleOwnerNames = data.openDealsByOwner.map((o: any) => o.ownerName);
      expect(visibleOwnerNames).toContain('Alex Rivera');
      expect(visibleOwnerNames).toContain('Marcus Chen');
      expect(visibleOwnerNames).toContain('Priya Sharma');
    });

    it('4. should prevent Sales Rep from altering dashboard scope via query parameters (IDOR immunity)', async () => {
      // Rep attempts to pass ?teamId or ?ownerId to see full team dashboard
      const res = await request(app)
        .get(`/api/dashboard?ownerId=${USER_MANAGER_ID}&teamId=${TEAM_ID}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      // Scope remains Alex's accessible deals (8), NOT full team (13)
      expect(res.body.data.openDeals).toBe(8);
    });
  });

  // ==========================================================================
  // 2. Open Deals, Stage Breakdown & Weighted Pipeline Calculations
  // ==========================================================================
  describe('2. Open Deals, Stage Breakdown & Weighted Pipeline Calculations', () => {
    it('5. should exclude soft-deleted deals and WON/LOST deals from open metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      const { data } = res.body;

      // Ensure open deals count is 13 (excludes d5 WON, d6 LOST, d11 WON, d12 LOST, d18 soft-deleted)
      expect(data.openDeals).toBe(13);

      // Verify openDealsByStage contains ONLY the 4 open stages
      const stages = data.openDealsByStage.map((s: any) => s.stage);
      expect(stages).toEqual(['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION']);
      expect(stages).not.toContain('WON');
      expect(stages).not.toContain('LOST');
    });

    it('6. should calculate exact weighted pipeline using Decimal arithmetic', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      const { data } = res.body;

      // Seed Open Deals Breakdown:
      // NEW (prob 0.10):
      // - d1: 125,000.00
      // - d7: 95,000.00
      // Total NEW = 220,000.00 * 0.10 = 22,000.00
      //
      // QUALIFIED (prob 0.25):
      // - d2: 84,000.00
      // - d9: 68,000.00
      // - d16: 130,000.00
      // Total QUALIFIED = 282,000.00 * 0.25 = 70,500.00
      //
      // PROPOSAL (prob 0.50):
      // - d3: 240,000.00
      // - d8: 145,000.00
      // - d15: 88,000.00
      // - d17: 215,000.00
      // Total PROPOSAL = 688,000.00 * 0.50 = 344,000.00
      //
      // NEGOTIATION (prob 0.75):
      // - d4: 350,000.00
      // - d10: 110,000.00
      // - d13: 310,000.00
      // - d14: 75,000.00
      // Total NEGOTIATION = 845,000.00 * 0.75 = 633,750.00
      //
      // Grand Total Weighted Pipeline = 22,000.00 + 70,500.00 + 344,000.00 + 633,750.00 = 1,070,250.00
      expect(data.weightedPipeline).toBe('1070250.00');
    });

    it('7. should guarantee all four open stages are present even if count is 0', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      const { data } = res.body;
      expect(data.openDealsByStage.length).toBe(4);
      expect(data.openDealsByStage[0].stage).toBe('NEW');
      expect(data.openDealsByStage[1].stage).toBe('QUALIFIED');
      expect(data.openDealsByStage[2].stage).toBe('PROPOSAL');
      expect(data.openDealsByStage[3].stage).toBe('NEGOTIATION');
    });
  });

  // ==========================================================================
  // 3. Won / Lost This Month & Half-Open Monthly Boundaries
  // ==========================================================================
  describe('3. Won / Lost This Month & Half-Open Monthly Boundaries', () => {
    it('8. should use closedAt for won/lost metrics and exclude deals closed outside the month', async () => {
      // In seed data:
      // d5 (WON): closedAt = 2026-08-20
      // d11 (WON): closedAt = 2026-08-30
      // d6 (LOST): closedAt = 2026-07-15
      // d12 (LOST): closedAt = 2026-08-05

      // Evaluate repository metrics for August 2026 reference date
      const augDate = new Date('2026-08-15T12:00:00.000Z');
      const managerUser = {
        id: USER_MANAGER_ID,
        role: 'MANAGER',
        teamId: TEAM_ID,
        organizationId: '00000000-0000-4000-8000-000000000001',
        email: 'manager@busy.com',
        name: 'Sarah Jenkins',
      } as any;

      const augMetrics = await dashboardRepository.getDashboardMetrics(managerUser, augDate);

      // August: d5 and d11 won -> wonThisMonth = 2
      expect(augMetrics.wonThisMonth).toBe(2);
      // August: d12 lost -> lostThisMonth = 1 (d6 was lost in July)
      expect(augMetrics.lostThisMonth).toBe(1);
    });

    it('9. should handle exact half-open monthly boundaries [startOfMonth, startOfNextMonth)', async () => {
      // Create deals at exact boundaries
      const startOfMonthDeal = await prisma.deal.create({
        data: {
          title: 'Start of Month Won Deal',
          companyId: COMPANY_ACME,
          teamId: TEAM_ID,
          ownerId: USER_REP1_ID,
          value: '10000.00',
          expectedCloseDate: new Date('2026-09-15'),
          stage: DealStage.WON,
          closedAt: new Date('2026-09-01T00:00:00.000Z'), // Exact start of Sept
        },
      });

      const startOfNextMonthDeal = await prisma.deal.create({
        data: {
          title: 'Start of Next Month Won Deal',
          companyId: COMPANY_ACME,
          teamId: TEAM_ID,
          ownerId: USER_REP1_ID,
          value: '10000.00',
          expectedCloseDate: new Date('2026-10-15'),
          stage: DealStage.WON,
          closedAt: new Date('2026-10-01T00:00:00.000Z'), // Exact start of Oct (must NOT be counted in Sept)
        },
      });

      const septDate = new Date('2026-09-15T12:00:00.000Z');
      const managerUser = {
        id: USER_MANAGER_ID,
        role: 'MANAGER',
        teamId: TEAM_ID,
        organizationId: '00000000-0000-4000-8000-000000000001',
        email: 'manager@busy.com',
        name: 'Sarah Jenkins',
      } as any;

      const septMetrics = await dashboardRepository.getDashboardMetrics(managerUser, septDate);

      // Exactly 1 deal won in September (startOfMonthDeal is included; startOfNextMonthDeal is excluded)
      expect(septMetrics.wonThisMonth).toBe(1);

      // Clean up boundary test deals
      await prisma.deal.deleteMany({
        where: { id: { in: [startOfMonthDeal.id, startOfNextMonthDeal.id] } },
      });
    });
  });

  // ==========================================================================
  // 4. Won Per Week (8-Week Trend) & Half-Open ISO Week Boundaries
  // ==========================================================================
  describe('4. Won Per Week (8-Week Trend) & Half-Open ISO Week Boundaries', () => {
    it('10. should return exactly 8 chronological weekly buckets with Monday-Sunday dates', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      const { data } = res.body;

      expect(Array.isArray(data.wonPerWeek)).toBe(true);
      expect(data.wonPerWeek.length).toBe(8);

      // Chronological order: weekStart[i] < weekStart[i+1]
      for (let i = 0; i < data.wonPerWeek.length - 1; i++) {
        const currentStart = data.wonPerWeek[i].weekStart;
        const nextStart = data.wonPerWeek[i + 1].weekStart;
        expect(currentStart < nextStart).toBe(true);

        // weekStart is YYYY-MM-DD
        expect(currentStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(data.wonPerWeek[i].weekEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('11. should handle exact half-open weekly boundaries [Monday 00:00:00, next Monday 00:00:00)', async () => {
      // Reference date: Wednesday 2026-09-09
      // Current ISO week: Monday 2026-09-07 to Sunday 2026-09-13 (next Monday: 2026-09-14)
      const refDate = new Date('2026-09-09T12:00:00.000Z');

      // Deal 1: Exact Monday 00:00:00 UTC (included in current week)
      const monDeal = await prisma.deal.create({
        data: {
          title: 'Monday Won Deal',
          companyId: COMPANY_ACME,
          teamId: TEAM_ID,
          ownerId: USER_REP1_ID,
          value: '5000.00',
          expectedCloseDate: new Date('2026-09-07'),
          stage: DealStage.WON,
          closedAt: new Date('2026-09-07T00:00:00.000Z'),
        },
      });

      // Deal 2: Sunday 23:59:59.999 UTC (included in current week)
      const sunDeal = await prisma.deal.create({
        data: {
          title: 'Sunday Won Deal',
          companyId: COMPANY_ACME,
          teamId: TEAM_ID,
          ownerId: USER_REP1_ID,
          value: '5000.00',
          expectedCloseDate: new Date('2026-09-13'),
          stage: DealStage.WON,
          closedAt: new Date('2026-09-13T23:59:59.999Z'),
        },
      });

      // Deal 3: Next Monday 00:00:00 UTC (excluded from this 8-week window because it is in the future)
      const nextMonDeal = await prisma.deal.create({
        data: {
          title: 'Next Monday Won Deal',
          companyId: COMPANY_ACME,
          teamId: TEAM_ID,
          ownerId: USER_REP1_ID,
          value: '5000.00',
          expectedCloseDate: new Date('2026-09-14'),
          stage: DealStage.WON,
          closedAt: new Date('2026-09-14T00:00:00.000Z'),
        },
      });

      const managerUser = {
        id: USER_MANAGER_ID,
        role: 'MANAGER',
        teamId: TEAM_ID,
        organizationId: '00000000-0000-4000-8000-000000000001',
        email: 'manager@busy.com',
        name: 'Sarah Jenkins',
      } as any;

      const metrics = await dashboardRepository.getDashboardMetrics(managerUser, refDate);

      // The last weekly bucket (current week 2026-09-07 to 2026-09-13) must have count = 2
      const currentWeekBucket = metrics.wonPerWeek[metrics.wonPerWeek.length - 1];
      expect(currentWeekBucket.weekStart).toBe('2026-09-07');
      expect(currentWeekBucket.weekEnd).toBe('2026-09-13');
      expect(currentWeekBucket.count).toBe(2);

      // Clean up boundary test deals
      await prisma.deal.deleteMany({
        where: { id: { in: [monDeal.id, sunDeal.id, nextMonDeal.id] } },
      });
    });

    it('12. should exclude LOST and soft-deleted deals from won-per-week trend', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      const { data } = res.body;

      // Count total won deals across all 8 weekly buckets
      const totalWeeklyWins = data.wonPerWeek.reduce((acc: number, w: any) => acc + w.count, 0);

      // Seed has only 2 active WON deals: d5 (2026-08-20) and d11 (2026-08-30)
      expect(totalWeeklyWins).toBeLessThanOrEqual(2);
    });
  });
});
