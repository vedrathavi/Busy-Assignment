import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/prisma';
import { signToken } from '../utils/jwt';

describe('Phase 4: Companies Module Integration Tests', { timeout: 30000 }, () => {
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
    stellar:    '20000000-0000-4000-8000-000000000003', // Owner: Marcus Chen (Deal 3 has Alex & Priya as collaborators)
    zenith:     '20000000-0000-4000-8000-000000000004', // Owner: Alex Rivera (Deal 4 has Priya as collaborator)
    horizon:    '20000000-0000-4000-8000-000000000005', // Owner: Priya Sharma (Deal 10 has Alex as collaborator)
    vortex:     '20000000-0000-4000-8000-000000000006', // Owner: Marcus Chen (No collaborators for Priya)
    beacon:     '20000000-0000-4000-8000-000000000007', // Owner: Alex Rivera
    legacyIron: '20000000-0000-4000-8000-000000000008', // Owner: Marcus Chen (Archived in seed)
  };

  let managerToken: string;
  let rep1Token: string; // Alex
  let rep2Token: string; // Priya
  let rep3Token: string; // Marcus

  let createdCompanyIds: string[] = [];

  beforeAll(async () => {
    // Generate valid tokens for each role
    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token    = signToken({ sub: USER_REP1_ID });
    rep2Token    = signToken({ sub: USER_REP2_ID });
    rep3Token    = signToken({ sub: USER_REP3_ID });
  });

  afterAll(async () => {
    // Clean up any dynamically created test companies
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }

    // Reset any modified seeded company states
    await prisma.company.update({
      where: { id: COMPANIES.acme },
      data: { name: 'Acme Corp', industry: 'Manufacturing', isArchived: false, ownerId: USER_REP1_ID },
    });
    await prisma.company.update({
      where: { id: COMPANIES.beacon },
      data: { isArchived: false, ownerId: USER_REP1_ID },
    });
    await prisma.company.update({
      where: { id: COMPANIES.legacyIron },
      data: { isArchived: true, ownerId: USER_REP3_ID },
    });
  });

  // ==========================================================================
  // 1. Authentication & Security Perimeter
  // ==========================================================================
  describe('1. Authentication Perimeter', () => {
    it('1. should reject unauthenticated GET /api/companies with 401', async () => {
      const res = await request(app).get('/api/companies');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authorization header missing');
    });

    it('2. should reject unauthenticated GET /api/companies/:id with 401', async () => {
      const res = await request(app).get(`/api/companies/${COMPANIES.acme}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('3. should reject unauthenticated POST /api/companies with 401', async () => {
      const res = await request(app)
        .post('/api/companies')
        .send({ name: 'Test Corp', industry: 'Software' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Company Creation (POST /api/companies)
  // ==========================================================================
  describe('2. Company Creation (POST /api/companies)', () => {
    it('4. should allow Sales Rep to create a company and automatically become owner', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          name: 'Quantum Logic Systems',
          industry: 'Quantum Computing',
          website: 'https://quantumlogic.example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Quantum Logic Systems',
        industry: 'Quantum Computing',
        website: 'https://quantumlogic.example.com',
        ownerId: USER_REP1_ID,
        isArchived: false,
      });
      expect(res.body.data.owner).toMatchObject({
        id: USER_REP1_ID,
        name: 'Alex Rivera',
        email: 'alex@busy.com',
      });
      expect(res.body.data.owner.passwordHash).toBeUndefined();

      createdCompanyIds.push(res.body.data.id);
    });

    it('5. should reject Sales Rep attempting to assign company ownership to another rep with 403', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          name: 'Unauthorized Delegated Corp',
          industry: 'Finance',
          ownerId: USER_REP2_ID, // Priya
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Sales reps cannot assign companies to other users');
    });

    it('6. should allow Manager to create a company assigned to a team Sales Rep', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Apex Robotics Labs',
          industry: 'Robotics',
          website: 'https://apexrobotics.example.com',
          ownerId: USER_REP2_ID, // Assigned to Priya Sharma
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(USER_REP2_ID);
      expect(res.body.data.owner.name).toBe('Priya Sharma');

      createdCompanyIds.push(res.body.data.id);
    });

    it('7. should reject Manager creating company with invalid/non-existent ownerId with 400', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Orphan Venture',
          industry: 'Venture Capital',
          ownerId: '99999999-9999-4999-8999-999999999999',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Target owner does not exist');
    });

    it('8. should reject company creation with invalid validation payload with 400', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          name: '',
          industry: '',
          website: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. Server-Side Scoped Visibility (GET /api/companies & GET /api/companies/:id)
  // ==========================================================================
  describe('3. Server-Side Scoped Visibility', () => {
    it('9. should allow Manager to see all active companies across the team', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Seed has 7 active companies (+ any created in previous tests)
      const companyNames = res.body.data.map((c: any) => c.name);
      expect(companyNames).toContain('Acme Corp');
      expect(companyNames).toContain('Apex Global Logistics');
      expect(companyNames).toContain('Stellar Cloud Systems');
      expect(companyNames).toContain('Zenith Healthcare Solutions');
      expect(companyNames).toContain('Horizon Retail Group');
      expect(companyNames).toContain('Vortex Financial Technologies');
      expect(companyNames).toContain('Beacon Clean Energy');
      // Archived company excluded by default
      expect(companyNames).not.toContain('Legacy Ironworks Inc');
    });

    it('10. should scope Sales Rep Alex to owned companies and deal-accessible companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.map((c: any) => c.id);

      // Alex owns Acme, Zenith, Beacon
      expect(companyIds).toContain(COMPANIES.acme);
      expect(companyIds).toContain(COMPANIES.zenith);
      expect(companyIds).toContain(COMPANIES.beacon);

      // Alex collaborates on Deal 3 (Stellar Cloud, owned by Marcus) -> VISIBLE!
      expect(companyIds).toContain(COMPANIES.stellar);

      // Alex collaborates on Deal 10 (Horizon Retail, owned by Priya) -> VISIBLE!
      expect(companyIds).toContain(COMPANIES.horizon);

      // Alex does NOT own Apex Global Logistics and has no deals on it -> HIDDEN!
      expect(companyIds).not.toContain(COMPANIES.apex);

      // Alex does NOT own Vortex Financial and has no deals on it -> HIDDEN!
      expect(companyIds).not.toContain(COMPANIES.vortex);
    });

    it('11. should scope Sales Rep Priya to owned companies and deal-accessible companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.map((c: any) => c.id);

      // Priya owns Apex, Horizon
      expect(companyIds).toContain(COMPANIES.apex);
      expect(companyIds).toContain(COMPANIES.horizon);

      // Priya collaborates on Deal 3 (Stellar Cloud, owned by Marcus) -> VISIBLE!
      expect(companyIds).toContain(COMPANIES.stellar);

      // Priya collaborates on Deal 4 (Zenith Health, owned by Alex) -> VISIBLE!
      expect(companyIds).toContain(COMPANIES.zenith);

      // Priya owns Deal 16 on Beacon (owned by Alex) -> VISIBLE via owned deal!
      expect(companyIds).toContain(COMPANIES.beacon);

      // Priya does NOT own Acme and has no deals on Acme -> HIDDEN!
      expect(companyIds).not.toContain(COMPANIES.acme);

      // Priya does NOT own Vortex and has no deals on Vortex -> HIDDEN!
      expect(companyIds).not.toContain(COMPANIES.vortex);
    });

    it('12. should return 404 (IDOR Protection) when Sales Rep requests direct ID of an unpermitted company', async () => {
      // Priya requests Vortex (Marcus's company, no collaboration)
      const res = await request(app)
        .get(`/api/companies/${COMPANIES.vortex}`)
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Company not found');
    });

    it('13. should return 200 when Sales Rep requests direct ID of a company accessible via deal collaboration', async () => {
      // Priya requests Stellar Cloud (Deal 3 collaborator)
      const res = await request(app)
        .get(`/api/companies/${COMPANIES.stellar}`)
        .set('Authorization', `Bearer ${rep2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Stellar Cloud Systems');
      expect(res.body.data.owner.name).toBe('Marcus Chen');
    });

    it('14. should filter companies by search keyword', async () => {
      const res = await request(app)
        .get('/api/companies?search=Logistics')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Apex Global Logistics');
    });

    it('15. should support pagination metadata', async () => {
      const res = await request(app)
        .get('/api/companies?page=1&limit=2')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
      });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(7);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(4);
    });
  });

  // ==========================================================================
  // 4. Company Mutation Authorization (PATCH /api/companies/:id)
  // ==========================================================================
  describe('4. Company Mutation Authorization (PATCH /api/companies/:id)', () => {
    it('16. should allow Sales Rep to edit their own company', async () => {
      const res = await request(app)
        .patch(`/api/companies/${COMPANIES.acme}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({
          name: 'Acme Corporation International',
          industry: 'Industrial Manufacturing',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Corporation International');
      expect(res.body.data.industry).toBe('Industrial Manufacturing');
    });

    it('17. should reject Sales Rep attempting to edit another rep company with 403 Forbidden', async () => {
      // Alex attempts to edit Apex (owned by Priya)
      const res = await request(app)
        .patch(`/api/companies/${COMPANIES.apex}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ name: 'Hacked Logistics Corp' });

      // Because Alex has no deal visibility to Apex, findByIdForTeam returns Apex, but policy rejects with 403
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to edit this company');
    });

    it('18. should reject Sales Rep attempting to edit a company merely because they collaborate on its deal with 403', async () => {
      // Alex collaborates on Deal 3 (Stellar Cloud, owned by Marcus). Alex can VIEW Stellar Cloud, but CANNOT EDIT it!
      const res = await request(app)
        .patch(`/api/companies/${COMPANIES.stellar}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ name: 'Stellar Cloud Systems Renamed by Collaborator' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to edit this company');
    });

    it('19. should reject Sales Rep attempting to reassign company ownership to another rep with 403', async () => {
      // Alex owns Acme, attempts to reassign ownerId to Priya
      const res = await request(app)
        .patch(`/api/companies/${COMPANIES.acme}`)
        .set('Authorization', `Bearer ${rep1Token}`)
        .send({ ownerId: USER_REP2_ID });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Only managers can reassign company ownership');
    });

    it('20. should allow Manager to edit any team company and reassign ownership', async () => {
      // Manager reassigns Acme from Alex to Marcus
      const res = await request(app)
        .patch(`/api/companies/${COMPANIES.acme}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Acme Corp',
          ownerId: USER_REP3_ID, // Marcus
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(USER_REP3_ID);
      expect(res.body.data.owner.name).toBe('Marcus Chen');

      // Restore ownership back to Alex
      await request(app)
        .patch(`/api/companies/${COMPANIES.acme}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ ownerId: USER_REP1_ID });
    });
  });

  // ==========================================================================
  // 5. Company Archive & Restore Lifecycle
  // ==========================================================================
  describe('5. Company Archive & Restore Lifecycle', () => {
    it('21. should allow Sales Rep to archive their own company', async () => {
      const res = await request(app)
        .post(`/api/companies/${COMPANIES.beacon}/archive`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);
    });

    it('22. should exclude archived company from default active list', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.map((c: any) => c.id);
      expect(companyIds).not.toContain(COMPANIES.beacon);
    });

    it('23. should include archived company when ?isArchived=true is specified', async () => {
      const res = await request(app)
        .get('/api/companies?isArchived=true')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.map((c: any) => c.id);
      expect(companyIds).toContain(COMPANIES.beacon);
    });

    it('24. should allow retrieving an archived company directly via GET /api/companies/:id', async () => {
      const res = await request(app)
        .get(`/api/companies/${COMPANIES.beacon}`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(COMPANIES.beacon);
      expect(res.body.data.isArchived).toBe(true);
    });

    it('25. should reject Sales Rep attempting to archive another rep company with 403', async () => {
      // Alex attempts to archive Apex (owned by Priya)
      const res = await request(app)
        .post(`/api/companies/${COMPANIES.apex}/archive`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to archive this company');
    });

    it('26. should allow Sales Rep to restore their own archived company', async () => {
      const res = await request(app)
        .post(`/api/companies/${COMPANIES.beacon}/restore`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(false);

      // Verify it appears in active list again
      const listRes = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${rep1Token}`);
      const companyIds = listRes.body.data.map((c: any) => c.id);
      expect(companyIds).toContain(COMPANIES.beacon);
    });

    it('27. should allow Manager to archive and restore any team company', async () => {
      // Manager archives Apex
      const archiveRes = await request(app)
        .post(`/api/companies/${COMPANIES.apex}/archive`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.isArchived).toBe(true);

      // Manager restores Apex
      const restoreRes = await request(app)
        .post(`/api/companies/${COMPANIES.apex}/restore`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.isArchived).toBe(false);
    });

    it('28. should reject Sales Rep attempting to restore another rep company with 403', async () => {
      // Alex attempts to restore Legacy Ironworks (owned by Marcus, archived in seed)
      const res = await request(app)
        .post(`/api/companies/${COMPANIES.legacyIron}/restore`)
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to restore this company');
    });
  });

  // ==========================================================================
  // 6. Cross-Team Boundary Isolation & Response Safety
  // ==========================================================================
  describe('6. Cross-Team Boundary Isolation & Response Safety', () => {
    it('29. should never expose passwordHash in any company owner object', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      for (const comp of res.body.data) {
        expect(comp.owner.passwordHash).toBeUndefined();
      }
      expect(JSON.stringify(res.body)).not.toContain('$2a$');
      expect(JSON.stringify(res.body)).not.toContain('$2b$');
    });

    it('30. should return 404 for non-existent company UUID', async () => {
      const res = await request(app)
        .get('/api/companies/00000000-0000-4000-8000-999999999999')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Company not found');
    });
  });
});
