import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { signToken } from '../utils/jwt';
import { prisma } from '../database/prisma';
import { UserRole } from '@prisma/client';

describe('Phase 13: Team Users API & Collaborator Rules Tests', () => {
  const app = createApp();

  // Test User UUIDs from seed
  const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001'; // Sarah Jenkins (Manager)
  const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002'; // Alex Rivera (Sales Rep)

  // Seed Deals
  const DEAL_ALEX_ID = '30000000-0000-4000-8000-000000000007'; // Owned by Alex

  // Alien Organization & User for Cross-Team IDOR Isolation Tests
  const ALIEN_ORG_ID  = '99000000-0000-4000-8000-000000000001';
  const ALIEN_TEAM_ID = '99000000-0000-4000-8000-000000000002';
  const ALIEN_USER_ID = '99000000-0000-4000-8000-000000000003';

  let managerToken: string;
  let rep1Token: string;
  let alienToken: string;

  beforeAll(async () => {
    // Seed alien tenant
    await prisma.organization.upsert({
      where: { id: ALIEN_ORG_ID },
      update: {},
      create: { id: ALIEN_ORG_ID, name: 'Alien Corp' },
    });

    await prisma.team.upsert({
      where: { id: ALIEN_TEAM_ID },
      update: {},
      create: { id: ALIEN_TEAM_ID, organizationId: ALIEN_ORG_ID, name: 'Alien Team' },
    });

    await prisma.user.upsert({
      where: { id: ALIEN_USER_ID },
      update: {},
      create: {
        id: ALIEN_USER_ID,
        email: 'alien@other.com',
        name: 'Alien Rep',
        role: UserRole.SALES_REP,
        passwordHash: 'dummy',
        organizationId: ALIEN_ORG_ID,
        teamId: ALIEN_TEAM_ID,
      },
    });

    managerToken = signToken({ sub: USER_MANAGER_ID });
    rep1Token = signToken({ sub: USER_REP1_ID });
    alienToken = signToken({ sub: ALIEN_USER_ID });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: ALIEN_USER_ID } });
    await prisma.team.deleteMany({ where: { id: ALIEN_TEAM_ID } });
    await prisma.organization.deleteMany({ where: { id: ALIEN_ORG_ID } });
  });

  describe('GET /api/users - Team Directory', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('allows manager to list all team members with safe fields only', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      // Verify safe fields - NO passwordHash
      for (const u of res.body.data) {
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('name');
        expect(u).toHaveProperty('email');
        expect(u).toHaveProperty('role');
        expect(u).toHaveProperty('createdAt');
        expect(u).not.toHaveProperty('passwordHash');
        expect(u).not.toHaveProperty('password');
      }
    });

    it('allows sales rep to list team members for selection/collaboration', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${rep1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('supports filtering by role=SALES_REP', async () => {
      const res = await request(app)
        .get('/api/users?role=SALES_REP')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u: any) => u.role === 'SALES_REP')).toBe(true);
    });

    it('enforces cross-team isolation when user belongs to different team', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${alienToken}`);

      expect(res.status).toBe(200);
      // Alien team only has the 1 alien user, none of the busy.com users
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(ALIEN_USER_ID);
    });
  });

  describe('GET /api/users/:id - User Profile with Stats', () => {
    it('returns user profile and pipeline statistics for a manager', async () => {
      const res = await request(app)
        .get(`/api/users/${USER_REP1_ID}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(USER_REP1_ID);
      expect(res.body.data.user.name).toBe('Alex Rivera');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      expect(res.body.data.stats).toHaveProperty('openDeals');
      expect(res.body.data.stats).toHaveProperty('pipelineValue');
      expect(res.body.data.stats).toHaveProperty('wonDeals');
      expect(res.body.data.stats).toHaveProperty('totalDeals');
      expect(typeof res.body.data.stats.openDeals).toBe('number');
    });

    it('returns 404 when requesting user ID from another organization/team (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/users/${USER_REP1_ID}`)
        .set('Authorization', `Bearer ${alienToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Collaborator Rule Enforcement', () => {
    it('rejects adding a Manager as a deal collaborator with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEAL_ALEX_ID}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: USER_MANAGER_ID });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/must have the SALES_REP role/i);
    });

    it('rejects adding the deal owner as a collaborator with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/deals/${DEAL_ALEX_ID}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: USER_REP1_ID }); // Alex is owner of DEAL_ALEX_ID

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Deal owner cannot be added as a collaborator/i);
    });
  });
});
