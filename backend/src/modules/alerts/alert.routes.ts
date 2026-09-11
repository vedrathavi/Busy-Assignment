import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { alertController } from './alert.controller';

const router = Router();

// All alert endpoints require authentication
router.use(authenticateToken);

// GET /api/alerts - List all active overdue alerts visible to user
router.get('/', alertController.getAlerts);

// GET /api/alerts/count - Get total and unread alert count
router.get('/count', alertController.getAlertsCount);

// POST /api/alerts/:dealId/dismiss - Dismiss overdue alert for a specific deal
router.post('/:dealId/dismiss', alertController.dismissAlert);

export { router as alertRouter };
