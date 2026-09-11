import { DealStage, NotificationType } from '@prisma/client';

export interface OverdueAlertItem {
  id: string;
  notificationId: string | null;
  dealId: string;
  title: string;
  company: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
  expectedCloseDate: string;
  stage: DealStage;
  value: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
}

export interface AlertCountResponse {
  count: number;
  unreadCount: number;
}

export interface DismissAlertResponse {
  message: string;
  dealId: string;
  dismissedCloseDate: string;
  dismissedAt: string;
}
