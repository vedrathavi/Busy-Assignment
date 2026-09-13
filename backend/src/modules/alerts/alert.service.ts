import { DealStage, UserRole } from '@prisma/client';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/app-error';
import { AuthUser } from '../auth/auth.types';
import { alertRepository, AlertRepository } from './alert.repository';
import { AlertCountResponse, DismissAlertResponse, OverdueAlertItem } from './alert.types';

export class AlertService {
  constructor(private alertRepo: AlertRepository = alertRepository) {}

  /**
   * Retrieves overdue alerts for the authenticated user by dismissal status.
   * - Purely read-oriented (zero database mutations).
   */
  public async getAlerts(
    user: AuthUser,
    status: 'active' | 'dismissed' | 'all' = 'active'
  ): Promise<OverdueAlertItem[]> {
    return this.alertRepo.getOverdueAlerts(user, status);
  }

  /**
   * Retrieves overdue alert counts (total and unread).
   */
  public async getAlertsCount(user: AuthUser): Promise<AlertCountResponse> {
    return this.alertRepo.getOverdueAlertsCount(user);
  }

  /**
   * Dismisses an overdue deal alert.
   * - Enforces Manager or Deal Owner authorization.
   * - Rejects non-owner collaborators with 403 Forbidden.
   * - Validates deal existence, team match, non-deleted, open stage, and overdue date.
   */
  public async dismissAlert(
    user: AuthUser,
    dealId: string
  ): Promise<DismissAlertResponse> {
    const deal = await this.alertRepo.findDealForAlert(dealId);

    if (!deal || deal.teamId !== user.teamId) {
      throw new NotFoundError('Deal not found');
    }

    if (deal.deletedAt !== null) {
      throw new BadRequestError('Cannot dismiss alert for a deleted deal');
    }

    if (deal.stage === DealStage.WON || deal.stage === DealStage.LOST) {
      throw new BadRequestError('Deal is already closed');
    }

    // Check if the deal is currently overdue
    const todayStr = new Date().toISOString().split('T')[0];
    const todayUtc = new Date(`${todayStr}T00:00:00.000Z`);

    if (deal.expectedCloseDate >= todayUtc) {
      throw new BadRequestError('Deal is not overdue');
    }

    // Authorization: Only Deal Owner or Manager can dismiss
    const isManager = user.role === UserRole.MANAGER;
    const isOwner = deal.ownerId === user.id;

    if (!isManager && !isOwner) {
      throw new ForbiddenError(
        'Only the deal owner or a manager can dismiss deal alerts'
      );
    }

    const dismissal = await this.alertRepo.dismissDealAlert(
      deal.id,
      deal.ownerId,
      deal.expectedCloseDate
    );

    const dismissedCloseDateStr = dismissal.dismissedCloseDate.toISOString().split('T')[0];

    return {
      message: 'Alert dismissed successfully',
      dealId: dismissal.dealId,
      dismissedCloseDate: dismissedCloseDateStr,
      dismissedAt: dismissal.dismissedAt.toISOString(),
    };
  }
}

export const alertService = new AlertService();
