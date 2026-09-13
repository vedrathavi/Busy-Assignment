import { AuthUser } from '../auth/auth.types';
import { NotFoundError } from '../../errors/app-error';
import { notificationRepository, NotificationRepository } from './notification.repository';
import { ActivityNotificationItem, NotificationCountResponse, NotificationListQuery } from './notification.types';

export class NotificationService {
  constructor(private repo: NotificationRepository = notificationRepository) {}

  public async getNotifications(
    user: AuthUser,
    query: NotificationListQuery = {}
  ): Promise<ActivityNotificationItem[]> {
    return this.repo.getUserActivityNotifications(user.id, query);
  }

  public async getNotificationCounts(user: AuthUser): Promise<NotificationCountResponse> {
    return this.repo.getUserNotificationCounts(user.id);
  }

  public async markNotificationAsRead(
    id: string,
    user: AuthUser
  ): Promise<ActivityNotificationItem> {
    const updated = await this.repo.markAsRead(id, user.id);
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
    return updated;
  }

  public async markAllNotificationsAsRead(
    user: AuthUser
  ): Promise<{ success: boolean; count: number }> {
    const count = await this.repo.markAllAsRead(user.id);
    return { success: true, count };
  }
}

export const notificationService = new NotificationService();
