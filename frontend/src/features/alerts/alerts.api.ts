import { apiClient, ApiResponse } from '@/lib/api/client';
import { AlertCountResponse, DismissAlertResponse, OverdueAlertItem } from './alerts.types';

export async function getAlertsApi(): Promise<OverdueAlertItem[]> {
  const response = await apiClient.get<ApiResponse<OverdueAlertItem[]>>('/alerts');
  return response.data.data || [];
}

export async function getAlertsCountApi(): Promise<AlertCountResponse> {
  const response = await apiClient.get<ApiResponse<AlertCountResponse>>('/alerts/count');
  return response.data.data || { count: 0, unreadCount: 0 };
}

export async function dismissAlertApi(dealId: string): Promise<DismissAlertResponse> {
  const response = await apiClient.post<ApiResponse<DismissAlertResponse>>(`/alerts/${dealId}/dismiss`);
  if (!response.data.data) {
    throw new Error(response.data.message || 'Failed to dismiss alert');
  }
  return response.data.data;
}
