import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';
import { DealStage } from '@prisma/client';

describe('Phase 8: Deal Search, Filtering, Sorting & Pagination Integration Tests', { timeout: 30000 }, () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)
  const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003'; // Priya Sharma (Sales Rep)
  const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004'; // Marcus Chen (Sales Rep)

  // Company UUIDs from seed
  const COMPANIES = {
    acme:       '20000000-0000-4000-8000-000000000001', // Acme Corporation (Alex)
    apex:       '20000000-0000-4000-8000-000000000002', // Apex Global Logistics (Priya)
    stellar:    '20000000-0000-4000-8000-000000000003', // Stellar Cloud Systems (Marcus)
    zenith:     '20000000-0000-4000-8000-000000000004', // Zenith Healthcare Solutions (Alex)
    horizon:    '20000000-0000-4000-8000-000000000005', // Horizon Retail Group (Priya)
    vortex:     '20000000-0000-4000-8000-000000000006', // Vortex Financial Technologies (Marcus)
    beacon:     '20000000-0000-4000-8000-000000000007', // Beacon Clean Energy (Alex)
    legacyIron: '20000000-0000-4000-8000-000000000008', // Legacy Ironworks Inc (Archived)
  };

  // Seed Deal UUIDs
  const DEALS = {
    d1:  '30000000-0000-4000-8000-000000000001', // "Global Supply ERP Rollout", Acme (Alex), NEW, 125000.00
    d2:  '30000000-0000-4000-8000-000000000002', // "Fleet Tracking System Upgrade", Apex (Priya), QUALIFIED, 84000.00
    d3:  '30000000-0000-4000-8000-000000000003', // "Multi-Cloud Migration Advisory", Stellar (Marcus, Collabs: Alex, Priya), PROPOSAL, 240000.00
    d4:  '30000000-0000-4000-8000-000000000004', // "Hospital Management Core Suite", Zenith (Alex, Collab: Priya), NEGOTIATION, 350000.00
    d5:  '30000000-0000-4000-8000-000000000005', // "Omnichannel POS Integration", Horizon (Priya), WON, 195000.00
    d6:  '30000000-0000-4000-8000-000000000006', // "Payment Gateway Microservices", Vortex (Marcus), LOST, 160000.00
    d7:  '30000000-0000-4000-8000-000000000007', // "Smart Grid Analytics Pilot", Beacon (Alex), NEW, 95000.00
    d8:  '30000000-0000-4000-8000-000000000008', // "Warehouse Automation Sensor Mesh", Apex (Priya, Collab: Marcus), PROPOSAL, 145000.00
    d9:  '30000000-0000-4000-8000-000000000009', // "Cybersecurity Compliance Audit", Vortex (Marcus), QUALIFIED, 68000.00
    d10: '30000000-0000-4000-8000-000000000010', // "E-Commerce Recommendation Engine", Horizon (Priya, Collab: Alex), NEGOTIATION, 110000.00
    d11: '30000000-0000-4000-8000-000000000011', // "Electronic Health Records Portal", Zenith (Alex), WON, 280000.00
    d12: '30000000-0000-4000-8000-000000000012', // "Plant Safety Telemetry", Acme (Alex), LOST, 52000.00
    d13: '30000000-0000-4000-8000-000000000013', // "Reopened Enterprise Cloud Expansion", Stellar (Marcus, Collab: Alex), NEGOTIATION, 310000.00
    d14: '30000000-0000-4000-8000-000000000014', // "Overdue Live Deal - Stalled Negotiation", Acme (Alex), NEGOTIATION, 75000.00
    d15: '30000000-0000-4000-8000-000000000015', // "Overdue Deal with Dismissed Alert", Beacon (Alex), PROPOSAL, 88000.00
    d16: '30000000-0000-4000-8000-000000000016', // "Backup Power Infrastructure", Beacon (Priya), QUALIFIED, 130000.00
    d17: '30000000-0000-4000-8000-000000000017', // "Automated Reconciliation Engine", Vortex (Marcus), PROPOSAL, 215000.00
    d18_softDeleted: '30000000-0000-4000-8000-000000000018', // Soft-deleted deal
  };

  const ALL_SEEDED_DEAL_IDS = Object.values(DEALS);

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

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
    ]);
  };

  beforeAll(async () => {
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });
    rep3Token    = signToken({ sub: USER_REP3_ID });

    await resetDeals();
  }, 30000);

  afterAll(async () => {
    await resetDeals();
  }, 30000);

  // ==========================================================================
  // 1. Authorization & Visibility Scoping
  // ==========================================================================
  describe('1. Authorization & Visibility Scoping', () => {
    it('1. should allow Manager to see all active non-deleted team deals (17 active)', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.total).toBe(17);
      expect(res.body.data.length).toBe(17);

      // Verify soft-deleted deal is excluded
      const dealIds = res.body.data.map((d: any) => d.id);
      expect(dealIds).not.toContain(DEALS.d18_softDeleted);
    });

    it('2. should scope Sales Rep Alex to owned and collaborated deals only', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=50')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dealIds = res.body.data.map((d: any) => d.id);
      // Alex owns d1, d4, d7, d11, d12, d14, d15
      expect(dealIds).toContain(DEALS.d1);
      expect(dealIds).toContain(DEALS.d4);
      expect(dealIds).toContain(DEALS.d7);
      expect(dealIds).toContain(DEALS.d11);
      expect(dealIds).toContain(DEALS.d12);
      expect(dealIds).toContain(DEALS.d14);
      expect(dealIds).toContain(DEALS.d15);

      // Alex collaborates on d3, d10, d13
      expect(dealIds).toContain(DEALS.d3);
      expect(dealIds).toContain(DEALS.d10);
      expect(dealIds).toContain(DEALS.d13);

      // Alex does NOT own or collaborate on d2, d5, d6, d8, d9, d16, d17
      expect(dealIds).not.toContain(DEALS.d2);
      expect(dealIds).not.toContain(DEALS.d5);
      expect(dealIds).not.toContain(DEALS.d6);
      expect(dealIds).not.toContain(DEALS.d8);
      expect(dealIds).not.toContain(DEALS.d9);
      expect(dealIds).not.toContain(DEALS.d16);
      expect(dealIds).not.toContain(DEALS.d17);
    });

    it('3. should prevent Sales Rep from discovering unassociated deals using search (IDOR protection)', async () => {
      // "Fleet Tracking" is d2 (Apex Global Logistics, owned by Priya, Alex has no access)
      const res = await request(app)
        .get('/api/deals?search=Fleet')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);

      // But Manager CAN find it
      const resMgr = await request(app)
        .get('/api/deals?search=Fleet')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resMgr.status).toBe(200);
      expect(resMgr.body.data.length).toBe(1);
      expect(resMgr.body.data[0].id).toBe(DEALS.d2);
    });

    it('4. should prevent Sales Rep from discovering unassociated deals using ownerId filter (IDOR protection)', async () => {
      // Alex filters by ownerId = Marcus (USER_REP3_ID)
      const res = await request(app)
        .get(`/api/deals?ownerId=${USER_REP3_ID}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      // Alex only sees deals owned by Marcus that Alex collaborates on (d3, d13)
      const dealIds = res.body.data.map((d: any) => d.id);
      expect(dealIds).toContain(DEALS.d3);
      expect(dealIds).toContain(DEALS.d13);
      // Alex does NOT see d6, d9, d17 owned by Marcus without collaboration
      expect(dealIds).not.toContain(DEALS.d6);
      expect(dealIds).not.toContain(DEALS.d9);
      expect(dealIds).not.toContain(DEALS.d17);
    });
  });

  // ==========================================================================
  // 2. Search Capabilities
  // ==========================================================================
  describe('2. Search Capabilities', () => {
    it('5. should search by deal title with partial, case-insensitive matching', async () => {
      const res = await request(app)
        .get('/api/deals?search=rollout')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(DEALS.d1);
      expect(res.body.data[0].title).toBe('Global Supply ERP Rollout');
    });

    it('6. should search by company name with partial, case-insensitive matching', async () => {
      const res = await request(app)
        .get('/api/deals?search=stellar')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // d3 and d13 on Stellar Cloud Systems
      const dealIds = res.body.data.map((d: any) => d.id);
      expect(dealIds).toContain(DEALS.d3);
      expect(dealIds).toContain(DEALS.d13);
    });

    it('7. should return empty array with total 0 when search yields no matches', async () => {
      const res = await request(app)
        .get('/api/deals?search=nonexistentterm12345')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });
  });

  // ==========================================================================
  // 3. Filter Capabilities
  // ==========================================================================
  describe('3. Filter Capabilities', () => {
    it('8. should filter by exact companyId', async () => {
      const res = await request(app)
        .get(`/api/deals?companyId=${COMPANIES.zenith}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // d4 and d11 on Zenith Healthcare Solutions
      for (const d of res.body.data) {
        expect(d.companyId).toBe(COMPANIES.zenith);
      }
    });

    it('9. should filter by exact stage', async () => {
      const res = await request(app)
        .get(`/api/deals?stage=${DealStage.WON}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2); // d5 and d11 are WON
      for (const d of res.body.data) {
        expect(d.stage).toBe(DealStage.WON);
      }
    });

    it('10. should filter by exact ownerId', async () => {
      const res = await request(app)
        .get(`/api/deals?ownerId=${USER_REP2_ID}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      // Priya owns d2, d5, d8, d10, d16 (active deals)
      expect(res.body.data.length).toBe(5);
      for (const d of res.body.data) {
        expect(d.ownerId).toBe(USER_REP2_ID);
      }
    });

    it('11. should combine multiple filters with AND semantics', async () => {
      // Apex (COMPANIES.apex) + stage PROPOSAL (Deal 8)
      const res = await request(app)
        .get(`/api/deals?companyId=${COMPANIES.apex}&stage=${DealStage.PROPOSAL}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(DEALS.d8);
    });

    it('12. should combine search and filters together with AND semantics', async () => {
      // search "health" + stage "WON" -> Deal 11 (Electronic Health Records Portal, Zenith)
      const res = await request(app)
        .get(`/api/deals?search=health&stage=${DealStage.WON}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(DEALS.d11);
    });

    it('13. should reject invalid stage filter with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?stage=INVALID_STAGE')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('14. should reject invalid companyId UUID with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?companyId=not-a-uuid')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('15. should reject invalid ownerId UUID with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?ownerId=not-a-uuid')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 4. Sorting Capabilities
  // ==========================================================================
  describe('4. Sorting Capabilities', () => {
    it('16. should sort by value ascending with deterministic tie-breaking', async () => {
      const res = await request(app)
        .get('/api/deals?sortBy=value&sortOrder=asc&pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const values = res.body.data.map((d: any) => parseFloat(d.value));
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i + 1]);
      }
    });

    it('17. should sort by value descending with deterministic tie-breaking', async () => {
      const res = await request(app)
        .get('/api/deals?sortBy=value&sortOrder=desc&pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const values = res.body.data.map((d: any) => parseFloat(d.value));
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i + 1]);
      }
    });

    it('18. should sort by expectedCloseDate ascending', async () => {
      const res = await request(app)
        .get('/api/deals?sortBy=expectedCloseDate&sortOrder=asc&pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const dates = res.body.data.map((d: any) => d.expectedCloseDate);
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i] <= dates[i + 1]).toBe(true);
      }
    });

    it('19. should sort by expectedCloseDate descending', async () => {
      const res = await request(app)
        .get('/api/deals?sortBy=expectedCloseDate&sortOrder=desc&pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const dates = res.body.data.map((d: any) => d.expectedCloseDate);
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i] >= dates[i + 1]).toBe(true);
      }
    });

    it('20. should sort by updatedAt descending by default', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const timestamps = res.body.data.map((d: any) => new Date(d.updatedAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });

    it('21. should reject unsupported sortBy field with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?sortBy=unsupportedColumn')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid sortBy field');
    });

    it('22. should reject unsupported sortOrder with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?sortOrder=invalidOrder')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid sortOrder');
    });
  });

  // ==========================================================================
  // 5. Server-Side Pagination
  // ==========================================================================
  describe('5. Server-Side Pagination', () => {
    it('23. should apply default pagination (page=1, pageSize=20)', async () => {
      const res = await request(app)
        .get('/api/deals')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 17,
        totalPages: 1,
      });
      expect(res.body.data.length).toBe(17);
    });

    it('24. should paginate deals with custom page and pageSize', async () => {
      const resPage1 = await request(app)
        .get('/api/deals?page=1&pageSize=5&sortBy=value&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.length).toBe(5);
      expect(resPage1.body.pagination).toMatchObject({
        page: 1,
        pageSize: 5,
        total: 17,
        totalPages: 4,
      });

      const resPage2 = await request(app)
        .get('/api/deals?page=2&pageSize=5&sortBy=value&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.length).toBe(5);
      expect(resPage2.body.pagination).toMatchObject({
        page: 2,
        pageSize: 5,
        total: 17,
        totalPages: 4,
      });

      // Ensure no overlap between page 1 and page 2 items
      const page1Ids = resPage1.body.data.map((d: any) => d.id);
      const page2Ids = resPage2.body.data.map((d: any) => d.id);
      for (const id of page1Ids) {
        expect(page2Ids).not.toContain(id);
      }
    });

    it('25. should return total count representing total matching deals BEFORE pagination', async () => {
      const res = await request(app)
        .get(`/api/deals?stage=${DealStage.PROPOSAL}&pageSize=2`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      // There are 4 PROPOSAL deals in seed (d3, d8, d15, d17)
      expect(res.body.pagination.total).toBe(4);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('26. should return empty array when requested page is beyond totalPages', async () => {
      const res = await request(app)
        .get('/api/deals?page=999&pageSize=10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toMatchObject({
        page: 999,
        pageSize: 10,
        total: 17,
        totalPages: 2,
      });
    });

    it('27. should reject pageSize exceeding maximum (100) with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=101')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Page size cannot exceed 100');
    });

    it('28. should reject invalid pagination parameters (page < 1, pageSize < 1) with 400 Bad Request', async () => {
      const res1 = await request(app)
        .get('/api/deals?page=0')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .get('/api/deals?pageSize=0')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .get('/api/deals?page=-1')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res3.status).toBe(400);
    });
  });

  // ==========================================================================
  // 6. Response Structure, Closed Deals & Clean Contract Preservation
  // ==========================================================================
  describe('6. Response Structure, Closed Deals & Clean Contract Preservation', () => {
    it('29. should preserve all required deal response fields and exact money calculations', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const deal = res.body.data[0];

      // Required deal fields
      expect(deal).toHaveProperty('id');
      expect(deal).toHaveProperty('title');
      expect(deal).toHaveProperty('value');
      expect(deal).toHaveProperty('weightedValue');
      expect(deal).toHaveProperty('stage');
      expect(deal).toHaveProperty('stageProbability');
      expect(deal).toHaveProperty('expectedCloseDate');
      expect(deal).toHaveProperty('updatedAt');
      expect(deal).toHaveProperty('createdAt');
      expect(deal).toHaveProperty('company');
      expect(deal).toHaveProperty('owner');

      // Value and weighted value are exact decimal strings
      expect(deal.value).toMatch(/^\d+\.\d{2}$/);
      expect(deal.weightedValue).toMatch(/^\d+\.\d{2}$/);
    });

    it('30. should ensure WON and LOST active deals remain visible in normal deal list', async () => {
      const res = await request(app)
        .get('/api/deals?pageSize=50')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const stages = res.body.data.map((d: any) => d.stage);
      expect(stages).toContain(DealStage.WON);
      expect(stages).toContain(DealStage.LOST);
    });
  });
});
