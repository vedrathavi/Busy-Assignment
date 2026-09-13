import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../errors/app-error';
import { notificationService, NotificationService } from './notification.service';

const idParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

const querySchema = z.object({
  status: z.enum(['all', 'unread', 'read']).optional().default('all'),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  /**
   * GET /api/notifications
   * Returns activity notifications for the authenticated user.
   */
  public getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const query = querySchema.parse(req.query);
      const notifications = await this.service.getNotifications(req.user, query);

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/notifications/count
   * Returns unread and total activity notification counts for the authenticated user.
   */
  public getNotificationsCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const counts = await this.service.getNotificationCounts(req.user);

      res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/notifications/:id/read
   * Marks a specific notification as read.
   */
  public markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { id } = idParamSchema.parse(req.params);
      const updated = await this.service.markNotificationAsRead(id, req.user);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/notifications/mark-all-read
   * Marks all unread activity notifications as read.
   */
  public markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await this.service.markAllNotificationsAsRead(req.user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
