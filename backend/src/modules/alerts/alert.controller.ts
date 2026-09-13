import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { UnauthorizedError } from '../../errors/app-error';
import { alertService, AlertService } from './alert.service';

const dealIdParamSchema = z.object({
  dealId: z.string().uuid('Invalid deal ID format'),
});

export class AlertController {
  constructor(private service: AlertService = alertService) {}

  /**
   * GET /api/alerts
   * Returns active overdue alerts for the authenticated user.
   */
  public getAlerts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawStatus = req.query.status as string | undefined;
      const status = rawStatus === 'dismissed' || rawStatus === 'all' ? rawStatus : 'active';
      const alerts = await this.service.getAlerts(req.user, status);

      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/alerts/count
   * Returns active overdue alert count and unread count.
   */
  public getAlertsCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const counts = await this.service.getAlertsCount(req.user);

      res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/alerts/:dealId/dismiss
   * Dismisses an overdue alert for the specified deal.
   */
  public dismissAlert = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { dealId } = dealIdParamSchema.parse(req.params);
      const result = await this.service.dismissAlert(req.user, dealId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const alertController = new AlertController();
