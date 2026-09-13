import { DealStage, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuthUser } from '../auth/auth.types';
import { DealRepository } from '../deals/deal.repository';
import { AlertCountResponse, OverdueAlertItem } from './alert.types';

const OPEN_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
];

function formatDate(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date).split('T')[0];
}

export class AlertRepository {
  private dealRepository = new DealRepository();

  /**
   * Returns current UTC start-of-day date boundary for dynamic overdue comparison.
   */
  private getTodayUtc(): Date {
    const todayStr = new Date().toISOString().split('T')[0];
    return new Date(`${todayStr}T00:00:00.000Z`);
  }

  /**
   * Retrieves overdue alerts dynamically based on user visibility and dismissal status.
   * Zero database writes on GET (purely read-oriented).
   */
  public async getOverdueAlerts(
    user: AuthUser,
    status: 'active' | 'dismissed' | 'all' = 'active'
  ): Promise<OverdueAlertItem[]> {
    const todayUtc = this.getTodayUtc();
    const visibilityFilter = this.dealRepository.buildVisibilityFilter(user, false);

    const deals = await prisma.deal.findMany({
      where: {
        ...visibilityFilter,
        stage: { in: OPEN_STAGES },
        expectedCloseDate: { lt: todayUtc },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        alert: {
          include: {
            notification: true,
          },
        },
      },
      orderBy: [
        { expectedCloseDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Filter deals based on dismissal status
    const filteredDeals = deals.filter((deal) => {
      const isDismissed = Boolean(
        deal.alert?.dismissedCloseDate &&
        formatDate(deal.alert.dismissedCloseDate) === formatDate(deal.expectedCloseDate)
      );

      if (status === 'active') {
        return !isDismissed;
      }
      if (status === 'dismissed') {
        return isDismissed;
      }
      return true; // 'all'
    });

    return filteredDeals.map((deal) => {
      const expectedCloseDateStr = formatDate(deal.expectedCloseDate);
      const valDecimal = deal.value instanceof Prisma.Decimal
        ? deal.value
        : new Prisma.Decimal(String(deal.value));
      const isDismissed = Boolean(
        deal.alert?.dismissedCloseDate &&
        formatDate(deal.alert.dismissedCloseDate) === expectedCloseDateStr
      );

      return {
        id: deal.alert?.notificationId ?? deal.id,
        notificationId: deal.alert?.notificationId ?? null,
        dealId: deal.id,
        title: deal.title,
        company: {
          id: deal.company.id,
          name: deal.company.name,
        },
        owner: {
          id: deal.owner.id,
          name: deal.owner.name,
          email: deal.owner.email,
        },
        expectedCloseDate: expectedCloseDateStr,
        stage: deal.stage,
        value: valDecimal.toFixed(2),
        type: NotificationType.DEAL_OVERDUE,
        isDismissed,
        dismissedAt: deal.alert?.dismissedAt ? deal.alert.dismissedAt.toISOString() : null,
        readAt: deal.alert?.notification?.readAt
          ? deal.alert.notification.readAt.toISOString()
          : null,
        createdAt: deal.alert?.notification?.createdAt
          ? deal.alert.notification.createdAt.toISOString()
          : deal.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves overdue alert counts (active, total, dismissed, unread).
   */
  public async getOverdueAlertsCount(user: AuthUser): Promise<AlertCountResponse> {
    const allAlerts = await this.getOverdueAlerts(user, 'all');
    const activeAlerts = allAlerts.filter((a) => !a.isDismissed);
    const dismissedAlerts = allAlerts.filter((a) => a.isDismissed);
    const unreadCount = activeAlerts.filter((a) => a.readAt === null).length;
    return {
      count: activeAlerts.length,
      unreadCount,
      totalCount: allAlerts.length,
      dismissedCount: dismissedAlerts.length,
    };
  }

  /**
   * Finds a deal by ID with its team and alert relations for dismissal validation.
   */
  public async findDealForAlert(dealId: string) {
    return prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        alert: {
          include: {
            notification: true,
          },
        },
        collaborators: true,
      },
    });
  }

  /**
   * Atomically records/upserts dismissal of an overdue deal alert.
   * Ensures DealAlert is linked to a Notification record for the deal owner.
   */
  public async dismissDealAlert(
    dealId: string,
    ownerId: string,
    expectedCloseDate: Date
  ): Promise<{ dealId: string; dismissedCloseDate: Date; dismissedAt: Date }> {
    return prisma.$transaction(async (tx) => {
      const existingAlert = await tx.dealAlert.findUnique({
        where: { dealId },
        include: { notification: true },
      });

      const now = new Date();

      if (existingAlert) {
        // Update dismissal date on existing DealAlert
        await tx.dealAlert.update({
          where: { dealId },
          data: {
            dismissedCloseDate: expectedCloseDate,
            dismissedAt: now,
          },
        });

        // Ensure notification is marked as read or updated
        if (existingAlert.notificationId) {
          await tx.notification.update({
            where: { id: existingAlert.notificationId },
            data: {
              readAt: existingAlert.notification?.readAt ?? now,
            },
          });
        }

        return {
          dealId,
          dismissedCloseDate: expectedCloseDate,
          dismissedAt: now,
        };
      }

      // Create new Notification for deal owner
      const notification = await tx.notification.create({
        data: {
          userId: ownerId,
          type: NotificationType.DEAL_OVERDUE,
          readAt: now,
        },
      });

      // Create new DealAlert linked to the notification
      await tx.dealAlert.create({
        data: {
          notificationId: notification.id,
          dealId,
          dismissedCloseDate: expectedCloseDate,
          dismissedAt: now,
        },
      });

      return {
        dealId,
        dismissedCloseDate: expectedCloseDate,
        dismissedAt: now,
      };
    });
  }
}

export const alertRepository = new AlertRepository();
