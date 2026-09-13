import { NotificationType } from '@prisma/client';

export interface ActivityNotificationItem {
  id: string;
  userId: string;
  dealId: string | null;
  type: NotificationType;
  title: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  deal?: {
    id: string;
    title: string;
    stage: string;
    company?: {
      id: string;
      name: string;
    };
  } | null;
}

export interface NotificationCountResponse {
  unreadCount: number;
  totalCount: number;
}

export interface NotificationListQuery {
  status?: 'all' | 'unread' | 'read';
  limit?: number;
}
