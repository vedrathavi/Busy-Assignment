export type ActivityNotificationType =
  | 'DEAL_OVERDUE'
  | 'DEAL_CREATED'
  | 'DEAL_STAGE_ADVANCED'
  | 'DEAL_STAGE_REGRESSED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'DEAL_REOPENED'
  | 'NOTE_ADDED'
  | 'COLLABORATOR_ADDED'
  | 'COLLABORATOR_REMOVED'
  | 'OWNER_CHANGED';

export interface ActivityNotificationItem {
  id: string;
  userId: string;
  dealId: string | null;
  type: ActivityNotificationType;
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
