import { apiClient, ApiResponse } from '@/lib/api/client';
import { DashboardData } from './dashboard.types';

export async function getDashboardMetricsApi(): Promise<DashboardData> {
  const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to fetch dashboard metrics');
  }
  return response.data.data;
}
