import { apiClient } from '@/lib/api/client';

export type UserRole = 'MANAGER' | 'SALES_REP';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface UserProfileStats {
  openDeals: number;
  pipelineValue: string;
  wonDeals: number;
  totalDeals: number;
}

export interface UserProfileResponse {
  user: UserSummary;
  stats: UserProfileStats;
}

export interface UserListQuery {
  role?: UserRole;
  search?: string;
}

export async function getUsersApi(query: UserListQuery = {}): Promise<UserSummary[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: UserSummary[];
  }>('/users', { params: query });

  return response.data.data || [];
}

export async function getUserProfileApi(id: string): Promise<UserProfileResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: UserProfileResponse;
  }>(`/users/${id}`);

  return response.data.data;
}
