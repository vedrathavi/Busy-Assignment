export interface AlertCompanySummary {
  id: string;
  name: string;
}

export interface AlertOwnerSummary {
  id: string;
  name: string;
  email: string;
}

export interface OverdueAlertItem {
  id: string;
  notificationId: string | null;
  dealId: string;
  title: string;
  company: AlertCompanySummary;
  owner: AlertOwnerSummary;
  expectedCloseDate: string; // "YYYY-MM-DD"
  stage: string;
  value: string;
  type: string;
  isDismissed?: boolean;
  dismissedAt?: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AlertCountResponse {
  count: number;
  unreadCount: number;
  totalCount?: number;
  dismissedCount?: number;
}

export interface DismissAlertResponse {
  message: string;
  dealId: string;
  dismissedCloseDate: string;
  dismissedAt: string;
}
