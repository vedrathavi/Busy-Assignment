import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { env } from '../config/env';
import { authRouter } from '../modules/auth/auth.routes';
import { authenticateToken } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { errorHandler } from '../middleware/error.middleware';
import { UserRole } from '@prisma/client';

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Mount production auth routes
  app.use('/api/auth', authRouter);

  // Mount isolated test endpoints to test requireRole in isolation without polluting production API
  app.get(
    '/api/test/manager-guard',
    authenticateToken,
    requireRole(UserRole.MANAGER),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Welcome Manager', user: req.user });
    }
  );

  app.get(
    '/api/test/rep-guard',
    authenticateToken,
    requireRole(UserRole.SALES_REP),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Welcome Sales Rep', user: req.user });
    }
  );

  // Attach global error handler after all routes
  app.use(errorHandler);
  return app;
}

describe('Phase 3: Authentication & Server-Side Authorization', { timeout: 25000 }, () => {
  const app = buildTestApp();

  afterAll(async () => {
    // Ensure any modified test users are reset to their original seeded state
    await prisma.user.update({
      where: { email: 'alex@busy.com' },
      data: { role: UserRole.SALES_REP },
    });
  });

  // --------------------------------------------------------------------------
  // 1. Valid Login Scenarios
  // --------------------------------------------------------------------------
  describe('POST /api/auth/login - Credential Verification', () => {
    it('1. should successfully authenticate a Manager and issue a signed Bearer JWT', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@busy.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.user).toMatchObject({
        email: 'manager@busy.com',
        name: 'Sarah Jenkins',
        role: 'MANAGER',
      });
      expect(response.body.data.user).toHaveProperty('organizationId');
      expect(response.body.data.user).toHaveProperty('teamId');
    });

    it('2. should successfully authenticate a Sales Rep with case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ALEX@BUSY.COM', // uppercase normalization check
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'alex@busy.com',
        name: 'Alex Rivera',
        role: 'SALES_REP',
      });
    });

    it('3. should reject login with wrong password using a generic 401 error', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@busy.com',
          password: 'WrongPassword999!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('4. should reject non-existent email with the exact same generic 401 error to prevent enumeration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent-user@busy.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('5. should reject malformed login payloads with 400 Validation Error', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Token Authentication & Request Context
  // --------------------------------------------------------------------------
  describe('GET /api/auth/me - Protected Route & Context Attachment', () => {
    it('6. should authenticate a valid JWT Bearer token and return the current user', async () => {
      // First login to obtain a legitimate token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'priya@busy.com', password: 'Password123!' });

      const token = loginRes.body.data.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'priya@busy.com',
        name: 'Priya Sharma',
        role: 'SALES_REP',
      });
    });

    it('7. should reject an expired JWT with 401 Unauthorized', async () => {
      // Generate a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { sub: '10000000-0000-4000-8000-000000000002' },
        env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has expired');
    });

    it('8. should reject a tampered / invalid signature JWT with 401 Unauthorized', async () => {
      const tamperedToken = jwt.sign(
        { sub: '10000000-0000-4000-8000-000000000002' },
        'wrong-foreign-secret-key-1234567890'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token signature or format');
    });

    it('9. should reject requests with missing Authorization header with 401 Unauthorized', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authorization header missing');
    });

    it('10. should attach complete authoritative database context (id, email, name, role, organizationId, teamId)', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'marcus@busy.com', password: 'Password123!' });

      const token = loginRes.body.data.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const user = response.body.data.user;
      expect(user.id).toBe('10000000-0000-4000-8000-000000000004');
      expect(user.email).toBe('marcus@busy.com');
      expect(user.name).toBe('Marcus Chen');
      expect(user.role).toBe('SALES_REP');
      expect(user.organizationId).toBe('00000000-0000-4000-8000-000000000001');
      expect(user.teamId).toBe('00000000-0000-4000-8000-000000000002');
    });

    it('11. should never expose passwordHash in login or getMe responses', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'manager@busy.com', password: 'Password123!' });

      expect(loginRes.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(loginRes.body)).not.toContain('$2a$');
      expect(JSON.stringify(loginRes.body)).not.toContain('$2b$');

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(meRes.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(meRes.body)).not.toContain('$2a$');
      expect(JSON.stringify(meRes.body)).not.toContain('$2b$');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Role-Based Authorization Guard Tests
  // --------------------------------------------------------------------------
  describe('Authorization Foundation - requireRole Middleware', () => {
    it('12. should allow Manager to access manager-only route with 200 OK', async () => {
      const managerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'manager@busy.com', password: 'Password123!' });

      const response = await request(app)
        .get('/api/test/manager-guard')
        .set('Authorization', `Bearer ${managerLogin.body.data.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Welcome Manager');
    });

    it('13. should reject Sales Rep from manager-only route with 403 Forbidden', async () => {
      const repLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex@busy.com', password: 'Password123!' });

      const response = await request(app)
        .get('/api/test/manager-guard')
        .set('Authorization', `Bearer ${repLogin.body.data.token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');
    });

    it('14. should return 401 Unauthorized (not 403) for unauthenticated requests to protected role routes', async () => {
      const response = await request(app).get('/api/test/manager-guard');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authorization header missing');
    });

    it('15. should prove authorization data is database-authoritative (role promotion reflected immediately on same token)', async () => {
      // 1. Issue token while Alex is a SALES_REP
      const repLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex@busy.com', password: 'Password123!' });

      const alexToken = repLogin.body.data.token;
      expect(repLogin.body.data.user.role).toBe('SALES_REP');

      // 2. Alex initially gets 403 on manager route
      const initialGuardRes = await request(app)
        .get('/api/test/manager-guard')
        .set('Authorization', `Bearer ${alexToken}`);
      expect(initialGuardRes.status).toBe(403);

      // 3. Promote Alex to MANAGER in PostgreSQL database directly
      await prisma.user.update({
        where: { email: 'alex@busy.com' },
        data: { role: UserRole.MANAGER },
      });

      // 4. Using the EXACT SAME token, verify authenticateToken resolves updated database role
      const updatedMeRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${alexToken}`);
      expect(updatedMeRes.status).toBe(200);
      expect(updatedMeRes.body.data.user.role).toBe('MANAGER');

      // 5. Manager route now succeeds with 200 using the same token
      const promotedGuardRes = await request(app)
        .get('/api/test/manager-guard')
        .set('Authorization', `Bearer ${alexToken}`);
      expect(promotedGuardRes.status).toBe(200);
      expect(promotedGuardRes.body.message).toBe('Welcome Manager');

      // 6. Demote back to SALES_REP
      await prisma.user.update({
        where: { email: 'alex@busy.com' },
        data: { role: UserRole.SALES_REP },
      });

      // 7. Same token is immediately restricted back to 403
      const demotedGuardRes = await request(app)
        .get('/api/test/manager-guard')
        .set('Authorization', `Bearer ${alexToken}`);
      expect(demotedGuardRes.status).toBe(403);
    });

    it('16. should reject a valid signed token if the user was deleted from the database', async () => {
      // Create a valid signed token for a non-existent user UUID
      const orphanToken = jwt.sign(
        { sub: '99999999-9999-4999-8999-999999999999' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${orphanToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'User account associated with this token does not exist'
      );
    });
  });
});
