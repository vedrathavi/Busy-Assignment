import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

// All dashboard endpoints require authentication
dashboardRouter.use(authenticateToken);

// GET /api/dashboard - Scoped pipeline analytics and 8-week win trend
dashboardRouter.get('/', (req, res, next) => dashboardController.getDashboard(req, res, next));
