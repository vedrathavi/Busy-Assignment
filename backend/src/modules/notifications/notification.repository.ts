import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { ActivityNotificationItem, NotificationCountResponse, NotificationListQuery } from './notification.types';

export class NotificationRepository {
  /**
   * Batch creates activity notifications inside a Prisma transaction.
   * Supports either per-recipient personalized records or uniform batch payload.
   */
  public async createActivityNotifications(
    tx: Prisma.TransactionClient,
    data:
      | Array<{
          userId: string;
          dealId: string;
          type: NotificationType;
          title: string;
          message: string;
        }>
      | {
          dealId: string;
          type: NotificationType;
          title: string;
          message: string;
          recipientUserIds: string[];
        }
  ): Promise<void> {
    if (Array.isArray(data)) {
      if (data.length === 0) return;
      await tx.notification.createMany({
        data: data.map((item) => ({
          userId: item.userId,
          dealId: item.dealId,
          type: item.type,
          title: item.title,
          message: item.message,
          readAt: null,
        })),
      });
      return;
    }

    if (!data.recipientUserIds || data.recipientUserIds.length === 0) {
      return;
    }

    await tx.notification.createMany({
      data: data.recipientUserIds.map((userId) => ({
        userId,
        dealId: data.dealId,
        type: data.type,
        title: data.title,
        message: data.message,
        readAt: null,
      })),
    });
  }

  /**
   * Retrieves activity notifications for a user (excluding Goal 10 DEAL_OVERDUE alerts).
   * Supports server-side pagination with limit and page.
   */
  public async getUserActivityNotifications(
    userId: string,
    query: NotificationListQuery = {}
  ): Promise<{
    notifications: ActivityNotificationItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const whereClause: Prisma.NotificationWhereInput = {
      userId,
      type: { not: NotificationType.DEAL_OVERDUE },
    };

    if (query.status === 'unread') {
      whereClause.readAt = null;
    } else if (query.status === 'read') {
      whereClause.readAt = { not: null };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              stage: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    const mapped = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      dealId: n.dealId,
      type: n.type,
      title: n.title,
      message: n.message,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      deal: n.deal
        ? {
            id: n.deal.id,
            title: n.deal.title,
            stage: n.deal.stage,
            company: n.deal.company
              ? {
                  id: n.deal.company.id,
                  name: n.deal.company.name,
                }
              : undefined,
          }
        : null,
    }));

    return {
      notifications: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Returns count of total and unread activity notifications for a user.
   */
  public async getUserNotificationCounts(userId: string): Promise<NotificationCountResponse> {
    const [unreadCount, totalCount] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          type: { not: NotificationType.DEAL_OVERDUE },
          readAt: null,
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          type: { not: NotificationType.DEAL_OVERDUE },
        },
      }),
    ]);

    return {
      unreadCount,
      totalCount,
    };
  }

  /**
   * Marks a single notification as read, ensuring strict ownership authorization (IDOR protected).
   */
  public async markAsRead(id: string, userId: string): Promise<ActivityNotificationItem | null> {
    const existing = await prisma.notification.findUnique({
      where: { id },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        readAt: existing.readAt ?? new Date(),
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      dealId: updated.dealId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      deal: updated.deal
        ? {
            id: updated.deal.id,
            title: updated.deal.title,
            stage: updated.deal.stage,
            company: updated.deal.company
              ? {
                  id: updated.deal.company.id,
                  name: updated.deal.company.name,
                }
              : undefined,
          }
        : null,
    };
  }

  /**
   * Marks all unread activity notifications as read for a specific user.
   */
  public async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        type: { not: NotificationType.DEAL_OVERDUE },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return result.count;
  }
}

export const notificationRepository = new NotificationRepository();
