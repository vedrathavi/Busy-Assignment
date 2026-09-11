import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../errors/app-error';
import { dashboardService } from './dashboard.service';

export class DashboardController {
  /**
   * GET /api/dashboard
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const metrics = await dashboardService.getDashboard(req.user);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
