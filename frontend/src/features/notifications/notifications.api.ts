import { apiClient, ApiResponse } from '@/lib/api/client';
import {
  ActivityNotificationItem,
  NotificationCountResponse,
  NotificationListQuery,
} from './notifications.types';

export async function getNotificationsApi(
  query: NotificationListQuery = {}
): Promise<ActivityNotificationItem[]> {
  const params: Record<string, any> = {};
  if (query.status && query.status !== 'all') {
    params.status = query.status;
  }
  if (query.limit) {
    params.limit = query.limit;
  }

  const response = await apiClient.get<ApiResponse<ActivityNotificationItem[]>>('/notifications', {
    params,
  });
  return response.data.data || [];
}

export async function getNotificationCountApi(): Promise<NotificationCountResponse> {
  const response = await apiClient.get<ApiResponse<NotificationCountResponse>>('/notifications/count');
  return response.data.data || { unreadCount: 0, totalCount: 0 };
}

export async function markNotificationReadApi(id: string): Promise<ActivityNotificationItem> {
  const response = await apiClient.patch<ApiResponse<ActivityNotificationItem>>(
    `/notifications/${id}/read`
  );
  if (!response.data.data) {
    throw new Error(response.data.message || 'Failed to mark notification as read');
  }
  return response.data.data;
}

export async function markAllNotificationsReadApi(): Promise<{ success: boolean; count: number }> {
  const response = await apiClient.post<ApiResponse<{ success: boolean; count: number }>>(
    '/notifications/mark-all-read'
  );
  if (!response.data.data) {
    throw new Error(response.data.message || 'Failed to mark all notifications as read');
  }
  return response.data.data;
}
