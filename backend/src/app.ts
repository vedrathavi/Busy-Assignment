import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { companyRouter } from './modules/companies/company.routes';
import { dealRouter } from './modules/deals/deal.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { alertRouter } from './modules/alerts/alert.routes';
import { userRouter } from './modules/users/user.routes';
import { notificationRouter } from './modules/notifications/notification.routes';

export function createApp(): Application {
  const app = express();

  // Core Middleware - CORS with explicit production & local development support
  const configuredOrigins = env.FRONTEND_URL.split(',').map((url) => url.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman, Render health checks)
        if (!origin) {
          return callback(null, true);
        }

        // 1. Allow explicitly configured origins (from env.FRONTEND_URL)
        if (configuredOrigins.includes(origin)) {
          return callback(null, true);
        }

        // 2. Allow local development origins (http://localhost:5173, http://127.0.0.1:5173, etc.)
        const isLocalOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (isLocalOrigin) {
          return callback(null, true);
        }

        // 3. Allow Vercel production & preview deployment origins
        const isVercelOrigin = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin);
        if (isVercelOrigin) {
          return callback(null, true);
        }

        return callback(new Error(`CORS origin '${origin}' not allowed by Access-Control-Allow-Origin policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  // Root Welcome & Health Check Routes
  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'Sales CRM API',
      status: 'active',
      version: '1.0.0',
      health: '/api/health',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Sales CRM API',
      timestamp: new Date().toISOString(),
    });
  });

  // Feature Modules
  app.use('/api/auth', authRouter);
  app.use('/api/companies', companyRouter);
  app.use('/api/deals', dealRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/alerts', alertRouter);
  app.use('/api/users', userRouter);
  app.use('/api/notifications', notificationRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
