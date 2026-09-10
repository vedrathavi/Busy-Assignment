import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.routes';

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

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
