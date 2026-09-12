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

export function createApp(): Application {
  const app = express();

  // Core Middleware
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
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

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
