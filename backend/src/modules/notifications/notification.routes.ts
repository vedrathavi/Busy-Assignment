import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { notificationController } from './notification.controller';

const router = Router();

// All notification endpoints require authentication
router.use(authenticateToken);

// GET /api/notifications - List activity notifications for authenticated user
router.get('/', notificationController.getNotifications);

// GET /api/notifications/count - Get total and unread activity notification count
router.get('/count', notificationController.getNotificationsCount);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch('/:id/read', notificationController.markAsRead);

// POST /api/notifications/mark-all-read - Mark all activity notifications as read
router.post('/mark-all-read', notificationController.markAllAsRead);

export { router as notificationRouter };
